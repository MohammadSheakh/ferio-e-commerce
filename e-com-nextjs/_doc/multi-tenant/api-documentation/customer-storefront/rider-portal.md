# Rider Portal (1st-party delivery workforce)

**Frontend:** `app/delivery/join`, `app/delivery/portal`
**Verified against:** `delivery-personnel.controller.ts`

Tenant is resolved server-side; a rider can only ever enumerate/act on the
approved personnel record and its assigned orders in the resolved tenant DB.

---

## Screen: Apply / Join
| # | Method | Endpoint | Purpose |
|---|---|---|---|
| 1 | POST | `/delivery-personnel/apply` | Public application to this tenant |

## Screen: Portal home (approved rider)
| # | Method | Endpoint | Purpose |
|---|---|---|---|
| 1 | GET | `/delivery-personnel/me` | Profile + duty state |
| 2 | GET | `/delivery-personnel/my-orders` | Assigned orders only |

## Delivery actions
Status transitions follow explicit rules (picked-up → in-transit →
out-for-delivery → delivered/failed) with COD cash pending **staff**
confirmation. GPS waypoints persist to tenant-local history with retention
sweep support.
