# Tenant Admin — Delivery Personnel

**Frontend:** `app/dashboard/delivery-men/*`, `app/dashboard/delivery-map`
**Verified against:** `delivery-personnel.controller.ts`

## Rider administration
| # | Method | Endpoint | Frontend coverage |
|---|---|---|---|
| 1 | GET | `/delivery-personnel/admin/list` | `app/dashboard/delivery-men` list/filter load |
| 2 | POST | `/delivery-personnel/admin/create` | Direct rider creation form |
| 3 | GET | `/delivery-personnel/admin/map-data` | Delivery map and rider location modal |
| 4 | DELETE | `/delivery-personnel/admin/:id/location-history` | Rider location modal/map cleanup action |
| 5 | PATCH | `/delivery-personnel/admin/:id/approval` | Approve/reject application action |
| 6 | GET | `/delivery-personnel/admin/:id` | Backend detail route; not needed by the current assignment flow |
| 7 | PATCH | `/delivery-personnel/admin/:id` | Rider profile edit form |
| 8 | PATCH | `/delivery-personnel/admin/assign-order` | Order-detail rider assignment form |

The admin list, create, approval, edit, map, and location-history flows are
source-level integrated through the tenant-admin BFF. The order-detail rider
assignment form filters the list to approved riders and submits the existing
`{ orderId, deliveryPersonnelId }` DTO through the server-side BFF. The order
detail response now includes a safe current-rider projection (`id`, `name`,
`phoneOriginal`, `status`, `isOnline`) so the operator can reconcile the
assignment after reload without exposing rider credentials.

## Runtime boundary

All admin routes use the server-side admin session and tenant host forwarding;
the NestJS controller enforces admin role, permission, and tenant membership.
Live assignment authorization, cross-tenant denial, concurrent assignment
handling, and browser E2E evidence remain open.
