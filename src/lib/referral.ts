/**
 * Referral-code capture. A `?ref=CODE` link stores the code locally; it is then
 * passed to `get_or_create_loyalty` on the next authenticated load so the new
 * customer is linked to their referrer (server-side, once).
 */
const KEY = "atw.ref";

export function captureReferralFromUrl(search: string): void {
  try {
    const code = new URLSearchParams(search).get("ref");
    if (code && /^[A-Za-z0-9]{4,16}$/.test(code)) {
      localStorage.setItem(KEY, code.toUpperCase());
    }
  } catch {
    /* storage/parse unavailable */
  }
}

export function getStoredReferral(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function clearStoredReferral(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
