# Customer Web Instructions

Apply the [shared frontend context](../../.codex/frontend-context.md) and [design language](../_doc/design-language.md).

- This app is the public customer storefront. Do not add platform-admin or tenant-admin privileges here.
- Resolve storefront behavior through the backend tenant/domain contract; do not let browser state select a database.
- Keep product, cart, checkout, customer, payment, shipping, and post-purchase states clear and resilient.
- Use typed API contracts and handle loading, empty, error, and unavailable-store states.
- Preserve responsive storefront behavior and the established Ferio visual language.
