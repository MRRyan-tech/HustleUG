#!/usr/bin/env node
// scripts/momo-sandbox-provision.js
//
// One-time setup: self-provisions a sandbox MTN MoMo API User + API Key.
// This is MTN's own documented process (not anything specific to
// HustleUG) -- in sandbox, you generate your own credentials; in
// production, MTN issues them to you after KYC approval instead.
//
// Usage:
//   1. Go to https://momodeveloper.mtn.com, create an account, and
//      subscribe to the "Collections" product. Copy the Primary
//      Subscription Key shown on your profile page.
//   2. Run: SUBSCRIPTION_KEY=your_key_here node scripts/momo-sandbox-provision.js
//   3. It prints an API_USER (a UUID you just generated) and an
//      API_KEY (a secret MTN generates for that user). Save both --
//      you'll set them as Supabase Edge Function secrets
//      (MOMO_API_USER, MOMO_API_KEY, MOMO_SUBSCRIPTION_KEY) for the
//      create-momo-payment function.
//
// Nothing here touches real money -- sandbox is a fully separate,
// free environment from MTN.

const SUBSCRIPTION_KEY = process.env.SUBSCRIPTION_KEY;
const SANDBOX_BASE_URL = 'https://sandbox.momodeveloper.mtn.com';

// This must be a real, resolvable domain -- MTN will (in later steps,
// once you're testing actual Request to Pay callbacks) send webhook
// POSTs here. For now during provisioning it's just registered, not
// yet called. We use the Supabase project's own domain since that's
// where the momo-webhook Edge Function will live.
const PROVIDER_CALLBACK_HOST = 'mwpiavqwvqeygbhsxphg.supabase.co';

function randomUUID() {
  return crypto.randomUUID();
}

async function main() {
  if (!SUBSCRIPTION_KEY) {
    console.error('Missing SUBSCRIPTION_KEY env var. Get it from your MTN MoMo Developer Portal profile page (Collections product).');
    process.exit(1);
  }

  const apiUser = randomUUID();

  // Step 1: create the sandbox API user
  const createUserRes = await fetch(`${SANDBOX_BASE_URL}/v1_0/apiuser`, {
    method: 'POST',
    headers: {
      'X-Reference-Id': apiUser,
      'Ocp-Apim-Subscription-Key': SUBSCRIPTION_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ providerCallbackHost: PROVIDER_CALLBACK_HOST }),
  });

  if (createUserRes.status !== 201) {
    console.error(`Failed to create API user: ${createUserRes.status} ${await createUserRes.text()}`);
    process.exit(1);
  }

  console.log(`✓ API User created: ${apiUser}`);

  // Step 2: generate an API key for that user
  const createKeyRes = await fetch(`${SANDBOX_BASE_URL}/v1_0/apiuser/${apiUser}/apikey`, {
    method: 'POST',
    headers: { 'Ocp-Apim-Subscription-Key': SUBSCRIPTION_KEY },
  });

  if (createKeyRes.status !== 201) {
    console.error(`Failed to create API key: ${createKeyRes.status} ${await createKeyRes.text()}`);
    process.exit(1);
  }

  const { apiKey } = await createKeyRes.json();

  console.log(`✓ API Key created: ${apiKey}`);
  console.log('');
  console.log('Save these three values as Supabase Edge Function secrets:');
  console.log(`  MOMO_API_USER = ${apiUser}`);
  console.log(`  MOMO_API_KEY = ${apiKey}`);
  console.log(`  MOMO_SUBSCRIPTION_KEY = ${SUBSCRIPTION_KEY}`);
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
