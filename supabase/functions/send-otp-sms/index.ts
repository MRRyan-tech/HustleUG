// supabase/functions/send-otp-sms/index.ts
//
// This function is wired up as Supabase Auth's "Send SMS Hook".
// Supabase calls it every time it needs to deliver an OTP for phone auth
// (sign up, sign in, or MFA) instead of using its built-in SMS providers.
// We forward the OTP to the user's phone via Africa's Talking.
//
// Required secrets (set via `supabase secrets set` or the Dashboard):
//   AT_USERNAME            - Africa's Talking username ("sandbox" for testing)
//   AT_API_KEY              - Africa's Talking API key
//   AT_SENDER_ID            - (optional) Approved Sender ID / Short Code
//   AT_ENV                  - "sandbox" or "production" (default: "production")
//   SEND_SMS_HOOK_SECRET    - the signing secret shown when you enable the
//                             Send SMS Hook in Supabase Dashboard (starts with
//                             "whsec_"). Used to verify the request really
//                             came from Supabase.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const AT_USERNAME = Deno.env.get("AT_USERNAME") ?? "";
const AT_API_KEY = Deno.env.get("AT_API_KEY") ?? "";
const AT_SENDER_ID = Deno.env.get("AT_SENDER_ID") ?? "";
const AT_ENV = Deno.env.get("AT_ENV") ?? "production";
const HOOK_SECRET = Deno.env.get("SEND_SMS_HOOK_SECRET") ?? "";

const AT_BASE_URL =
  AT_ENV === "sandbox"
    ? "https://api.sandbox.africastalking.com/version1/messaging"
    : "https://api.africastalking.com/version1/messaging";

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

// Supabase signs hook requests using the Standard Webhooks spec:
// signed content = "{id}.{timestamp}.{body}", HMAC-SHA256 with the secret
// (after stripping the "whsec_" prefix and base64-decoding it).
async function verifySignature(rawBody: string, headers: Headers): Promise<boolean> {
  if (!HOOK_SECRET) {
    console.warn("SEND_SMS_HOOK_SECRET not set — skipping signature verification.");
    return true;
  }

  const id = headers.get("webhook-id");
  const timestamp = headers.get("webhook-timestamp");
  const signatureHeader = headers.get("webhook-signature");
  if (!id || !timestamp || !signatureHeader) return false;

  const secretB64 = HOOK_SECRET.startsWith("whsec_") ? HOOK_SECRET.slice(6) : HOOK_SECRET;
  const keyBytes = base64ToBytes(secretB64);

  const signedContent = `${id}.${timestamp}.${rawBody}`;
  const key = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sigBuffer = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signedContent));
  const expected = btoa(String.fromCharCode(...new Uint8Array(sigBuffer)));

  // header can look like "v1,<sig1> v1,<sig2>" — check all of them
  const candidates = signatureHeader.split(" ").map((s) => s.split(",")[1] ?? s);
  return candidates.includes(expected);
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const rawBody = await req.text();

  const validSignature = await verifySignature(rawBody, req.headers);
  if (!validSignature) {
    return new Response(
      JSON.stringify({ error: { http_code: 401, message: "Invalid webhook signature" } }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new Response(
      JSON.stringify({ error: { http_code: 400, message: "Invalid JSON body" } }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const phone: string | undefined = payload?.user?.phone;
  const otp: string | undefined = payload?.sms?.otp;

  if (!phone || !otp) {
    return new Response(
      JSON.stringify({ error: { http_code: 400, message: "Missing phone or otp in payload" } }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const message = `Your HustleUG verification code is ${otp}. It expires shortly. Do not share this code with anyone.`;

  const form = new URLSearchParams();
  form.set("username", AT_USERNAME);
  form.set("to", phone.startsWith("+") ? phone : `+${phone}`);
  form.set("message", message);
  if (AT_SENDER_ID) form.set("from", AT_SENDER_ID);

  try {
    const atRes = await fetch(AT_BASE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
        apiKey: AT_API_KEY,
      },
      body: form.toString(),
    });

    const atData = await atRes.json().catch(() => null);
    const recipients = atData?.SMSMessageData?.Recipients ?? [];
    const failed = recipients.find((r: any) => r.status !== "Success");

    if (!atRes.ok || recipients.length === 0 || failed) {
      console.error("Africa's Talking send failed:", JSON.stringify(atData));
      return new Response(
        JSON.stringify({
          error: { http_code: 500, message: "Failed to send SMS via Africa's Talking" },
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Empty 200 response = success, per the Send SMS Hook contract.
    return new Response(null, { status: 200 });
  } catch (err) {
    console.error("send-otp-sms unexpected error:", err);
    return new Response(
      JSON.stringify({ error: { http_code: 500, message: "SMS provider request failed" } }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
