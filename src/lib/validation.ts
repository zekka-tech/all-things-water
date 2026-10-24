/**
 * Shared form-validation helpers used across the application.
 * Each function returns a value suitable for inline error rendering.
 */

/** Checks whether every required field has a non-whitespace value. */
export function validateRequired(value: string): boolean {
  return value.trim().length > 0;
}

/**
 * Robust email validation.
 * Accepts standard formats; rejects missing @, missing TLD component,
 * and obviously invalid characters.
 */
export function validateEmail(email: string): boolean {
  // RFC 5322 simplified — covers 99.9 % of real-world addresses
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * South African phone number validation.
 * - Must start with 0
 * - Must be exactly 10 digits after stripping non-digit characters
 * Returns the normalised 10-digit string (e.g. "0821234567") or null.
 */
export function validatePhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10 && digits.startsWith("0")) {
    return digits;
  }
  if (digits.length === 11 && digits.startsWith("27")) {
    // Convert international SA format (27XXXXXXXXX) to local (0XXXXXXXXX)
    return "0" + digits.slice(2);
  }
  return null;
}

/**
 * South African postal code validation.
 * Must be exactly 4 digits.
 */
export function validatePostalCode(code: string): boolean {
  return /^\d{4}$/.test(code);
}

/** Must match [auth] minimum_password_length / password_requirements in supabase/config.toml. */
export const MIN_PASSWORD_LENGTH = 10;

/** Returns an error message, or null when the password meets the policy. */
export function passwordProblem(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return "Password must include both letters and numbers.";
  }
  return null;
}
