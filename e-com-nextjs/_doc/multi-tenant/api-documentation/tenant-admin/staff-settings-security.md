# Tenant Admin — Staff, Settings & Security (role: admin/owner)

**Frontend:** `app/staff`, `app/settings`, `app/security`
**Verified against:** staff-access controller, commerce-settings/settings
controllers, auth controller admin 2FA group

---

## Staff access lifecycle
| # | Method | Endpoint | Purpose |
|---|---|---|---|
| 1 | GET | `/admin/staff` | Active staff + pending invitations (INVITE tokens unexpired) |
| 2 | POST | `/admin/staff/invitations` `{ email,name,permissions[] }` | Sends invite; enforces staff_seats plan limit server-side |
| 3 | PATCH | `/admin/staff/:userId/access` `{ status, permissions }` | Update access (bumps sessionVersion → kills sessions) |
| 4 | PATCH | `/admin/staff/:userId/deactivate` | Deactivate + session kill |
| 5 | POST | `/admin/staff/:userId/reset` | Issue RESET token email |
| 6 | POST | `/staff-access/accept-invitation` / `/staff-access/complete-reset` | Invitee-side completion (token single-use) |

Deactivation is fleet-wide instantly via Redis pub/sub invalidation of the
membership cache.

## Settings
| # | Method | Endpoint | Purpose |
|---|---|---|---|
| 1 | GET | `/settings/all` or `/settings/paginate[v2]` | Tenant-local settings inventory |
| 2 | POST | `/settings?type=…` `{ type, details }` | Create/update a per-type settings document (hero showcase, policies…) |
| 3 | DELETE | `/settings?type=…` | Delete a per-type settings document |
| 4 | GET/PATCH | `/admin/commerce-settings` | Store identity, contacts, feature flags (CommerceSettingsService) |
| 5 | GET | `/store/config` | Public store identity/contacts/policies projection consumed by storefront |

## Security (owner/admin)
| # | Method | Endpoint | Purpose |
|---|---|---|---|
| 1 | GET/POST | `/auth/admin/2fa/setup` · `/confirm` · `/disable` | TOTP lifecycle for high-risk roles |
| 2 | POST | `/auth/admin/login` → `/auth/admin/2fa/verify` | Admin login with 2FA challenge |
| 3 | GET | `/admin/audit-logs?page&limit&action&entityType&entityId&actorId&source` | Append-only audit trail query |
