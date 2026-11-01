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
export const CONTACT_EMAIL_HREF = `mailto:${CONTACT_EMAIL}`;

/**
 * The depot, where collection customers come to fetch their order.
 *
 * Kept as separate components because schema.org's `PostalAddress` expects
 * them that way — packing the whole address into `streetAddress` is malformed
 * and search engines may discard it. `JsonLdOrganization` spreads this object
 * directly, so these keys must stay named after the schema.org properties.
 */
export const DEPOT_ADDRESS_PARTS = {
  streetAddress: "Inside Out Village",
  addressLocality: "Centurion",
  addressRegion: "Gauteng",
  postalCode: "0157",
  addressCountry: "ZA",
} as const;

/**
 * Human-readable one-line form, shown under "Depot address" at checkout.
 * Derived from the parts above so the two can never drift.
 */
export const DEPOT_ADDRESS_LINE = [
  DEPOT_ADDRESS_PARTS.streetAddress,
  DEPOT_ADDRESS_PARTS.addressLocality,
  DEPOT_ADDRESS_PARTS.addressRegion,
  DEPOT_ADDRESS_PARTS.postalCode,
].join(", ");
