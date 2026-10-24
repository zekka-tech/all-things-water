/**
 * The business's dedicated contact number. Single source of truth for
 * every place the number is shown, dialled or used for WhatsApp.
 * Mirrored in supabase/functions/_shared/contact.ts for emails.
 */
export const CONTACT_PHONE = "+27 76 964 1460";
/** E.164 form, for tel: links, wa.me links and structured data. */
export const CONTACT_PHONE_E164 = "+27769641460";
export const CONTACT_PHONE_HREF = `tel:${CONTACT_PHONE_E164}`;
