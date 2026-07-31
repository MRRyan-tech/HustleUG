// supabase/functions/create-momo-payment/index.ts
//
// Called by the app when an employer taps "Upgrade" on Profile. Creates
// a pending payment record, then kicks off MTN's Request to Pay flow --
// this pushes an approval prompt straight to the employer's phone (they
// approve with their own MoMo PIN; HustleUG never sees or touches it).
//
// Requires a real user JWT (verify_jwt stays true, unlike the cron
// functions) since we need to know *which* employer is paying, and must
// look that up from their own session rather than trust a client-supplied
// employer_id -- otherwise anyone could pay UGX 2,000 and upgrade a
// different employer's account.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const MOMO_BASE_URL = Deno.env.get("MOMO_BASE_URL")!; // sandbox: https://sandbox.momodeveloper.mtn.com
const MOMO_API_USER = Deno.env.get("MOMO_API_USER")!;
const MOMO_API_KEY = Deno.env.get("MOMO_API_KEY")!;
const MOMO_SUBSCRIPTION_KEY = Deno.env.get("MOMO_SUBSCRIPTION_KEY")!;
// "sandbox" in sandbox; MTN assigns the production value (e.g.
// "mtnuganda") directly through your account manager at go-live -- it's
// not a fixed public constant, hence pulling it from an env var rather
// than hardcoding it.
const MOMO_TARGET_ENVIRONMENT = Deno.env.get("MOMO_TARGET_ENVIRONMENT") ?? "sandbox";

const SUBSCRIPTION_PRICE_UGX = 2000;
const SUBSCRIPTION_PERIOD_DAYS = 7;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// Converts a stored phone number (however it was entered -- with or
// without a leading +) into the bare MSISDN format MTN's API expects,
// e.g. "256771234567" with no + or leading zeros.
function toMsisdn(phone: string): string {
  const digitsOnly = phone.replace(/\D/g, "");
  // Handles a local-format leading 0 (e.g. "0771234567") by swapping it
  // for Uganda's country code -- PhoneInput in the app defaults to +256,
  // so this is a safety net, not the primary path.
  if (digitsOnly.startsWith("0")) {
    return "256" + digitsOnly.slice(1);
  }
  return digitsOnly;
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

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  // Verify the caller's own session (verify_jwt=true handles signature
  // validation before this code even runs; this pulls the actual user
  // out of it).
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return jsonResponse({ error: "Missing Authorization header" }, 401);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data: userData, error: userError } = await supabase.auth.getUser(
    authHeader.replace("Bearer ", ""),
  );
  if (userError || !userData.user) {
    return jsonResponse({ error: "Invalid session" }, 401);
  }

  // Look up this caller's own employer profile + phone number -- never
  // trust a client-supplied employer_id/phone for either the amount
  // paid or who gets upgraded.
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, phone, employer_profiles(id, tier)")
    .eq("auth_user_id", userData.user.id)
    .single();

  if (profileError || !profile) {
    return jsonResponse({ error: "Profile not found" }, 404);
  }
  if (!profile.phone) {
    return jsonResponse({ error: "No phone number on file" }, 400);
  }

  const employerProfile = Array.isArray(profile.employer_profiles)
    ? profile.employer_profiles[0]
    : profile.employer_profiles;

  if (!employerProfile) {
    return jsonResponse({ error: "Not an employer account" }, 403);
  }

  const providerReference = crypto.randomUUID();

  // Insert the payment row BEFORE calling MTN, not after -- if the MTN
  // call fails or the function crashes partway, we still have a 'pending'
  // record to reconcile/investigate rather than an untracked payment
  // MTN might still process on their end.
  const { data: payment, error: insertError } = await supabase
    .from("payments")
    .insert({
      employer_id: employerProfile.id,
      provider: "mtn",
      purpose: "subscription",
      amount: SUBSCRIPTION_PRICE_UGX,
      currency: "UGX",
      period_days: SUBSCRIPTION_PERIOD_DAYS,
      provider_reference: providerReference,
      status: "pending",
    })
    .select()
    .single();

  if (insertError || !payment) {
    console.error("create-momo-payment: failed to insert payment row:", insertError?.message);
    return jsonResponse({ error: "Failed to create payment record" }, 500);
  }

  try {
    const accessToken = await getMomoAccessToken();
    const msisdn = toMsisdn(profile.phone);

    const requestToPayRes = await fetch(`${MOMO_BASE_URL}/collection/v1_0/requesttopay`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "X-Reference-Id": providerReference,
        "X-Target-Environment": MOMO_TARGET_ENVIRONMENT,
        "Ocp-Apim-Subscription-Key": MOMO_SUBSCRIPTION_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: String(SUBSCRIPTION_PRICE_UGX),
        currency: "UGX",
        externalId: payment.id,
        payer: { partyIdType: "MSISDN", partyId: msisdn },
        payerMessage: "HustleUG weekly subscription",
        payeeNote: "HustleUG weekly subscription",
      }),
    });

    // Request to Pay returns 202 Accepted -- it's async from here.
    // MTN pushes the approval prompt to the employer's phone, then
    // either calls momo-webhook or we catch it on the next
    // momo-reconcile-and-expire sweep.
    if (requestToPayRes.status !== 202) {
      const errorText = await requestToPayRes.text();
      await supabase
        .from("payments")
        .update({ status: "failed", failure_reason: `MTN rejected request: ${requestToPayRes.status} ${errorText}` })
        .eq("id", payment.id);
      return jsonResponse({ error: "Payment request was rejected" }, 502);
    }

    return jsonResponse({
      ok: true,
      paymentId: payment.id,
      providerReference,
      message: "Check your phone to approve the payment",
    });
  } catch (err) {
    console.error("create-momo-payment: MTN request failed:", err);
    await supabase
      .from("payments")
      .update({ status: "failed", failure_reason: String(err) })
      .eq("id", payment.id);
    return jsonResponse({ error: "Failed to reach MTN MoMo" }, 502);
  }
});
