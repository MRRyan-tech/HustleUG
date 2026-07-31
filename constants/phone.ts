// constants/phone.ts
// Helpers for normalizing Ugandan phone numbers to E.164 format (+256XXXXXXXXX),
// which is what Supabase phone auth (and Africa's Talking) require.

/**
 * Accepts common formats a Ugandan user might type:
 *   0771234567      -> +256771234567
 *   771234567       -> +256771234567
 *   256771234567    -> +256771234567
 *   +256771234567   -> +256771234567 (unchanged)
 *
 * Returns null if the number doesn't look like a valid Ugandan mobile number.
 */
export function normalizeUgandaPhone(raw: string): string | null {
  if (!raw) return null;

  // Strip everything except digits and a leading +
  let cleaned = raw.trim().replace(/[^\d+]/g, '');

  // Drop a leading + for digit-counting, we re-add it at the end
  const hasPlus = cleaned.startsWith('+');
  if (hasPlus) cleaned = cleaned.slice(1);

  let digits = cleaned;

  if (digits.startsWith('256')) {
    digits = digits.slice(3);
  } else if (digits.startsWith('0')) {
    digits = digits.slice(1);
  }
  // else: assume it's already the 9-digit subscriber number (e.g. 771234567)

  // Ugandan mobile subscriber numbers are 9 digits, and start with 7 (or 4 for
  // some newer ranges). Keep this permissive — just check length + leading digit.
  if (!/^\d{9}$/.test(digits)) return null;
  if (!/^[7|4]/.test(digits)) return null;

  return `+256${digits}`;
}

/**
 * Formats an already-normalized +256 number for display, e.g.
 * +256771234567 -> 0771 234 567
 */
export function displayUgandaPhone(e164: string): string {
  const match = e164.match(/^\+256(\d{3})(\d{3})(\d{3})$/);
  if (!match) return e164;
  return `0${match[1]} ${match[2]} ${match[3]}`;
}
