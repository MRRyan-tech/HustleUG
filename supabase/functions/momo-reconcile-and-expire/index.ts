// supabase/functions/momo-reconcile-and-expire/index.ts
//
// Scheduled sweep (pg_cron, no user context) doing two jobs:
//
// 1. Reconciliation: catches payments MTN's webhook never followed up
//    on -- webhooks can be lost, and MTN's callback delivery isn't
//    guaranteed the way a proper signed-webhook system's would be.
//    Any payment still 'pending' after a grace period gets checked
//    directly against MTN's own status endpoint (the same
//    fetchAuthoritativeStatus logic momo-webhook uses).
// 2. Expiry: flips employer_profiles.tier back to 'free' once
//    tier_expires_at has passed -- the subscription counterpart to
//    cleanup-expired-jobs' job-expiry sweep, same reasoning: a query
//    filter alone doesn't actually revoke access, it just needs an
//    explicit state change.
//
// Protected the same way as cleanup-expired-jobs: verify_jwt=false (no
// user exists for a cron call) plus a shared-secret header checked
// against a Vault-stored value, since this can both extend/revoke paid
// access across every employer.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CRON_SECRET = Deno.env.get("CRON_SECRET");

const MOMO_BASE_URL = Deno.env.get("MOMO_BASE_URL")!;
const MOMO_API_USER = Deno.env.get("MOMO_API_USER")!;
const MOMO_API_KEY = Deno.env.get("MOMO_API_KEY")!;
const MOMO_SUBSCRIPTION_KEY = Deno.env.get("MOMO_SUBSCRIPTION_KEY")!;
const MOMO_TARGET_ENVIRONMENT = Deno.env.get("MOMO_TARGET_ENVIRONMENT") ?? "sandbox";

// How long a payment can sit 'pending' before we go check on it --
// short enough to catch a missed webhook reasonably quickly, long
// enough not to hammer MTN's status endpoint for payments that are
// still genuinely awaiting the employer's approval on their phone.
const RECONCILE_AFTER_MINUTES = 5;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function getMomoAccessToken(): Promise<string> {
  const credentials = btoa(`${MOMO_API_USER}:${MOMO_API_KEY}`);
  const res = await fetch(`${MOMO_BASE_URL}/collection/token/`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Ocp-Apim-Subscription-Key": MOMO_SUBSCRIPTION_KEY,
    },
  });
  if (!res.ok) {
    throw new Error(`MoMo token request failed: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  return data.access_token;
}

async function fetchAuthoritativeStatus(referenceId: string): Promise<{
  status: "PENDING" | "SUCCESSFUL" | "FAILED";
  financialTransactionId?: string;
  reason?: string;
}> {
  const accessToken = await getMomoAccessToken();
  const res = await fetch(`${MOMO_BASE_URL}/collection/v1_0/requesttopay/${referenceId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "X-Target-Environment": MOMO_TARGET_ENVIRONMENT,
      "Ocp-Apim-Subscription-Key": MOMO_SUBSCRIPTION_KEY,
    },
  });
  if (!res.ok) {
    throw new Error(`MoMo status check failed: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  return {
    status: data.status,
    financialTransactionId: data.financialTransactionId,
    reason: data.reason,
  };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  if (!CRON_SECRET || req.headers.get("x-cron-secret") !== CRON_SECRET) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const summary = { reconciled: 0, expired: 0, errors: [] as string[] };

  // ── Part 1: reconcile stuck-pending payments ──
  const cutoff = new Date(Date.now() - RECONCILE_AFTER_MINUTES * 60 * 1000).toISOString();
  const { data: stuckPayments, error: stuckFetchError } = await supabase
    .from("payments")
    .select("id, employer_id, provider_reference, period_days")
    .eq("status", "pending")
    .lt("created_at", cutoff);

  if (stuckFetchError) {
    summary.errors.push(`fetch pending: ${stuckFetchError.message}`);
  } else {
    for (const payment of stuckPayments ?? []) {
      try {
        const result = await fetchAuthoritativeStatus(payment.provider_reference);

        if (result.status === "SUCCESSFUL") {
          await supabase
            .from("payments")
            .update({ status: "successful", provider_transaction_id: result.financialTransactionId })
            .eq("id", payment.id);

          const newExpiry = new Date(Date.now() + payment.period_days * 24 * 60 * 60 * 1000);
          await supabase
            .from("employer_profiles")
            .update({ tier: "paid", tier_expires_at: newExpiry.toISOString() })
            .eq("id", payment.employer_id);

          summary.reconciled++;
        } else if (result.status === "FAILED") {
          await supabase
            .from("payments")
            .update({ status: "failed", failure_reason: result.reason ?? "Declined or timed out" })
            .eq("id", payment.id);
          summary.reconciled++;
        }
        // Still PENDING on MTN's side too -- leave alone, check again
        // next run.
      } catch (err) {
        summary.errors.push(`payment ${payment.id}: ${String(err)}`);
      }
    }
  }

  // ── Part 2: expire lapsed subscriptions ──
  const { data: expiredEmployers, error: expireError } = await supabase
    .from("employer_profiles")
    .update({ tier: "free", tier_expires_at: null })
    .eq("tier", "paid")
    .lt("tier_expires_at", new Date().toISOString())
    .select("id");

  if (expireError) {
    summary.errors.push(`expire tiers: ${expireError.message}`);
  } else {
    summary.expired = expiredEmployers?.length ?? 0;
  }

  if (summary.errors.length > 0) {
    console.error("momo-reconcile-and-expire: errors this run:", summary.errors.join("; "));
  }

  return jsonResponse({ ok: true, ...summary });
});
