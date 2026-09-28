# Diagram Coverage and Limits

The Mermaid set contains 54 files: 52 focused domain-flow diagrams and two
navigation/study maps. The frontend route/BFF surface is intentionally separate
from business-flow diagrams so route changes can be reviewed independently. The
diagrams are deliberately smaller than the full system;
they explain boundaries and control flow without pretending to replace source
code or runtime evidence.

## Covered Directly

- platform and tenant database planes;
- trusted host resolution and tenant database routing;
- organization provisioning and lifecycle;
- platform authentication and tenant identity/session flows;
- tenant-admin authorization and socket room isolation;
- catalog, cart, checkout, orders, payment, delivery, pickup, returns, refunds,
  wallet, warranty, and service booking;
- BullMQ workers, provider recovery, notifications, chat, analytics, product
  requests, and delivery personnel;
- reports, exports, settlements, reconciliation, backup/restore, support
  access, audit, and dependency health.
- customer profiles, addresses, staff access, product content, settings, store
  locations, and tenant object storage.

## Still Intentionally Grouped

These details remain represented inside broader diagrams because their core path
uses the same controller -> service -> tenant database boundary:

- review moderation details: catalog and storefront commerce diagrams;
- advanced store-location inventory policy: checkout and pickup diagrams;
- detailed OAuth/device management: customer session diagrams;
- provider-specific storage implementation: storage/evidence diagram;
- RTO and settlements: delivery/returns and reconciliation diagrams.

## Not Proven By Diagrams

- live Cloudflare/DNS/TLS behavior;
- production provider delivery or webhook authenticity against real accounts;
- queue fairness and load capacity under production traffic;
- live two-host browser SSR/BFF isolation;
- managed backup RPO/RTO or destructive production closure evidence.

Those claims require the relevant runtime, staging, provider, pilot, or
operator evidence recorded in the release checklist and audit matrix.
