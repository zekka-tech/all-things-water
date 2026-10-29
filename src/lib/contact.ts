/**
 * The business's dedicated contact number. Single source of truth for
 * every place the number is shown, dialled or used for WhatsApp.
 * Mirrored in supabase/functions/_shared/contact.ts for emails.
 */
export const CONTACT_PHONE = "+27 76 964 1460";
/** E.164 form, for tel: links, wa.me links and structured data. */
export const CONTACT_PHONE_E164 = "+27769641460";
export const CONTACT_PHONE_HREF = `tel:${CONTACT_PHONE_E164}`;

/**
 * The public contact address, shown on Contact, Terms, Privacy, Returns and in
 * the footer. Distinct from the backend's transactional addresses
 * (orders@/sales@/ops@), which are Edge Function concerns and set by secret.
 */
export const CONTACT_EMAIL = "hello@allthingswater.co.za";
