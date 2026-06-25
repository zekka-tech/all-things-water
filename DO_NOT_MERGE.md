# Do Not Merge

This branch is a standalone storefront for `all-things-water`.

Do not merge this application back into the parent `master` branch.

Reasons:

- The catalog, branding, copy, and taxonomy are specific to All Things Water.
- The Supabase schema, payment flow, and Pages deployment settings are tailored to this storefront.
- Merging into the parent branch would risk overwriting unrelated product, checkout, and deployment assumptions.

If code needs to be shared elsewhere, cherry-pick only the intentionally generic commits.
