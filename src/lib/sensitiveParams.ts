/**
 * Query parameters that act as credentials (e.g. the order checkout token in
 * PayFast's cancel_url). Analytics and pixels record the full page URL, so
 * these are removed from the address bar before any third-party script runs
 * and kept in memory for the page that needs them.
 */
const SENSITIVE_KEYS = ["token"] as const;
type SensitiveKey = (typeof SENSITIVE_KEYS)[number];

const captured = new Map<SensitiveKey, string>();

/**
 * Move sensitive params from the URL into memory. Call once at startup,
 * before analytics, marketing pixels or the router initialise.
 */
export function captureSensitiveParams(
  loc: Pick<Location, "pathname" | "search" | "hash"> = window.location,
  history: Pick<History, "replaceState" | "state"> = window.history,
): void {
  const params = new URLSearchParams(loc.search);
  let changed = false;
  for (const key of SENSITIVE_KEYS) {
    const value = params.get(key);
    if (value !== null) {
      captured.set(key, value);
      params.delete(key);
      changed = true;
    }
  }
  if (!changed) return;
  const query = params.toString();
  history.replaceState(history.state, "", `${loc.pathname}${query ? `?${query}` : ""}${loc.hash}`);
}

/** A value captured by captureSensitiveParams (null when absent). */
export function getSensitiveParam(key: SensitiveKey): string | null {
  return captured.get(key) ?? null;
}

/** Test helper. */
export function resetSensitiveParams(): void {
  captured.clear();
}
