// supabase/functions/momo-webhook/index.ts
//
// MTN calls this once a Request to Pay's status changes (approved,
// declined, or timed out). Deliberately does NOT trust the callback
// body's contents for the actual status -- MTN's callback mechanism
// doesn't have the kind of HMAC-signed-payload guarantee Bunny's webhook
// does (see video-webhook for that pattern), so anyone who discovers
// this URL could otherwise POST a fake "SUCCESSFUL" body and upgrade
// their account for free. Instead, the incoming call is treated only as
// a "go check now" signal: we take the reference id it mentions and ask
// MTN directly, server-to-server with our own Bearer token, what the
// real status is -- that response is what actually gets trusted.
//
// verify_jwt=false, same reasoning as video-webhook -- this is MTN's
// server calling us, not a HustleUG user, so there's no user JWT to
// check in the first place.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const MOMO_BASE_URL = Deno.env.get("MOMO_BASE_URL")!;
const MOMO_API_USER = Deno.env.get("MOMO_API_USER")!;
const MOMO_API_KEY = Deno.env.get("MOMO_API_KEY")!;
const MOMO_SUBSCRIPTION_KEY = Deno.env.get("MOMO_SUBSCRIPTION_KEY")!;
const MOMO_TARGET_ENVIRONMENT = Deno.env.get("MOMO_TARGET_ENVIRONMENT") ?? "sandbox";

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

// The authoritative status check -- shared logic also used by
// momo-reconcile-and-expire for payments that never got a callback at
// all, so both paths converge on the same real-money-safe source of
// truth instead of drifting apart.
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

  let body: { referenceId?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  // MTN's callback body shape isn't rock-solid documented/consistent
  // across sandbox vs production in community reports, so this reads
  // defensively -- the exact field name matters far less than what we
  // do next (ignore everything else in the body and go verify directly).
  const referenceId = body.referenceId;
  if (!referenceId) {
    return jsonResponse({ error: "Missing referenceId" }, 400);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: payment, error: fetchError } = await supabase
    .from("payments")
    .select("id, employer_id, period_days, status")
    .eq("provider_reference", referenceId)
    .single();

  if (fetchError || !payment) {
    // Not necessarily an attack -- could be a stale/duplicate callback
    // for a reference we've already processed and don't need to act on
    // again. Acknowledge with 200 either way so MTN doesn't retry
    // indefinitely.
    return jsonResponse({ ok: true, note: "Unknown reference, ignored" });
  }

  if (payment.status !== "pending") {
    // Already resolved (e.g. the reconciliation sweep beat this webhook
    // to it) -- nothing to do, avoid double-applying a subscription
    // extension.
    return jsonResponse({ ok: true, note: "Already processed" });
  }

  try {
    const result = await fetchAuthoritativeStatus(referenceId);

    if (result.status === "SUCCESSFUL") {
      await supabase
        .from("payments")
        .update({ status: "successful", provider_transaction_id: result.financialTransactionId })
        .eq("id", payment.id);

      // Extends from *now*, not from any prior expiry -- if this is a
      // renewal that came in a few days after the last one lapsed, that
      // gap is just lost (matches how the roadmap describes this as a
      // week-by-week subscription, not a rolling balance).
      const newExpiry = new Date(Date.now() + payment.period_days * 24 * 60 * 60 * 1000);
      await supabase
        .from("employer_profiles")
        .update({ tier: "paid", tier_expires_at: newExpiry.toISOString() })
        .eq("id", payment.employer_id);
    } else if (result.status === "FAILED") {
      await supabase
        .from("payments")
        .update({ status: "failed", failure_reason: result.reason ?? "Declined or timed out" })
        .eq("id", payment.id);
    }
    // If still PENDING, leave it as-is -- the reconciliation sweep will
    // catch it eventually if no further callback ever arrives.

    return jsonResponse({ ok: true });
  } catch (err) {
    console.error("momo-webhook: status verification failed:", err);
    // Return 200 anyway -- if this returns an error status, MTN may
    // retry the callback repeatedly, and the payment will still get
    // picked up correctly by the next reconciliation sweep regardless.
    return jsonResponse({ ok: true, note: "Verification deferred to reconciliation" });
  }
});
