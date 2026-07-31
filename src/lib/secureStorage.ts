// src/lib/secureStorage.ts
//
// Supabase Auth session storage adapter, backed by the device's real
// secure enclave (iOS Keychain / Android Keystore via expo-secure-store)
// instead of plain AsyncStorage.
//
// Why not just swap AsyncStorage for SecureStore directly: SecureStore
// has a hard ~2048 byte limit per key on iOS (Keychain), and a Supabase
// session object (access token + refresh token + user metadata) commonly
// exceeds that once the JWT carries any custom claims -- writes would
// start silently failing above that size. Supabase's own docs for Expo
// apps recommend this instead: generate a random AES-256 key, store only
// that small key in SecureStore (comfortably under the limit), and store
// the actual (now encrypted) session blob in AsyncStorage, which has no
// such size ceiling. The blob is unreadable without the key, and the key
// itself never leaves the OS-level secure enclave unencrypted.
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Buffer } from 'buffer';
import aesjs from 'aes-js';

// A per-session-key prefix, not a per-user one -- Supabase calls this
// adapter with its own internal storage keys (e.g.
// "sb-<project-ref>-auth-token"); we derive one encryption key per
// distinct storage key it asks us for, so multiple callers/keys don't
// share key material.
const ENCRYPTION_KEY_PREFIX = 'hustleug-session-key-';

async function getOrCreateEncryptionKey(storageKey: string): Promise<Uint8Array> {
  const secureStoreKey = ENCRYPTION_KEY_PREFIX + storageKey;
  const existing = await SecureStore.getItemAsync(secureStoreKey);
  if (existing) {
    return new Uint8Array(Buffer.from(existing, 'base64'));
  }

  // 256-bit key, fresh per install/first-use -- if the app is
  // reinstalled, SecureStore's own storage is cleared with it (both iOS
  // Keychain and Android Keystore are scoped to the app), so a stale
  // encrypted blob left behind in AsyncStorage just becomes unreadable
  // garbage rather than a security issue -- Supabase's client already
  // handles a corrupt/missing session by treating the user as logged out.
  const keyBytes = await Crypto.getRandomBytesAsync(32);
  const keyBase64 = Buffer.from(keyBytes).toString('base64');
  await SecureStore.setItemAsync(secureStoreKey, keyBase64);
  return keyBytes;
}

// AES-CTR needs a fresh counter/IV per encryption; stored alongside the
// ciphertext (it's not secret, just needs to be unique) so decryption
// can reconstruct the same keystream.
async function encrypt(storageKey: string, plaintext: string): Promise<string> {
  const key = await getOrCreateEncryptionKey(storageKey);
  const counterBytes = await Crypto.getRandomBytesAsync(16);
  const aesCtr = new aesjs.ModeOfOperation.ctr(key, new aesjs.Counter(counterBytes));
  const plaintextBytes = aesjs.utils.utf8.toBytes(plaintext);
  const encryptedBytes = aesCtr.encrypt(plaintextBytes);

  // Pack IV + ciphertext together so we only need to store one string.
  return Buffer.from(counterBytes).toString('base64') + ':' + Buffer.from(encryptedBytes).toString('base64');
}

async function decrypt(storageKey: string, packed: string): Promise<string | null> {
  const separatorIndex = packed.indexOf(':');
  if (separatorIndex === -1) return null;

  const key = await getOrCreateEncryptionKey(storageKey);
  const counterBytes = new Uint8Array(Buffer.from(packed.slice(0, separatorIndex), 'base64'));
  const encryptedBytes = new Uint8Array(Buffer.from(packed.slice(separatorIndex + 1), 'base64'));

  const aesCtr = new aesjs.ModeOfOperation.ctr(key, new aesjs.Counter(counterBytes));
  const decryptedBytes = aesCtr.decrypt(encryptedBytes);
  return aesjs.utils.utf8.fromBytes(decryptedBytes);
}

// Matches the storage interface Supabase's `createClient({ auth: { storage } })`
// expects (get/set/removeItem, all async).
export const secureSessionStorage = {
  async getItem(key: string): Promise<string | null> {
    const packed = await AsyncStorage.getItem(key);
    if (!packed) return null;
    try {
      return await decrypt(key, packed);
    } catch {
      // Corrupt/undecryptable blob (e.g. leftover from before this
      // adapter existed, or a reinstalled app with a stale ciphertext) --
      // treat as no session rather than crashing. Supabase's client
      // already handles a missing session gracefully by requiring re-login.
      return null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    const packed = await encrypt(key, value);
    await AsyncStorage.setItem(key, packed);
  },

  async removeItem(key: string): Promise<void> {
    await AsyncStorage.removeItem(key);
    await SecureStore.deleteItemAsync(ENCRYPTION_KEY_PREFIX + key);
  },
};
