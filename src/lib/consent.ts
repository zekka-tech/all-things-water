export const CONSENT_STORAGE_KEY = "atw.cookie-consent";
export const CONSENT_EVENT = "atw:consent-changed";

export type ConsentStatus = "accepted" | "declined" | null;

export function getConsentStatus(): ConsentStatus {
  try {
    const value = localStorage.getItem(CONSENT_STORAGE_KEY);
    return value === "accepted" || value === "declined" ? value : null;
  } catch {
    return null;
  }
}

export function hasTrackingConsent(): boolean {
  return getConsentStatus() === "accepted";
}

export function setConsentStatus(status: Exclude<ConsentStatus, null>) {
  try {
    localStorage.setItem(CONSENT_STORAGE_KEY, status);
  } catch {
    // Storage may be unavailable
  }

  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: status }));
}
