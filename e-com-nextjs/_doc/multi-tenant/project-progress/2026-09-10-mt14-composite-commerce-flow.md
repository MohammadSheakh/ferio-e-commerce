# MT-14 Composite Commerce Flow Evidence

## Reconciled control

The internal-alpha commerce-flow control is covered by a composite of existing
automated evidence:

- `test/two-tenant-vertical.integration-spec.ts` covers catalog browse,
  guest cart, checkout, COD placement, confirmation, inventory reservation,
  and rider tenant boundaries.
- `test/order-confirmation.integration-spec.ts` covers fulfillment state,
  cancellation, inventory effects, and transactional side effects.
- `test/shipping-webhook.integration-spec.ts` covers courier callback and
  polling normalization, retry, and provider-outage behavior.
- Return/refund service and tenant-isolation suites cover lifecycle validation
  and tenant-local record access.

This is composite automated flow evidence, not a claim that a real business
has completed the flow in production. Warranty/service/chat/pickup and pilot
execution remain separate open controls.
