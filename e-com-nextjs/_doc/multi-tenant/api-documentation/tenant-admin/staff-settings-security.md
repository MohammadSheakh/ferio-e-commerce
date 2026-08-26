# Tenant Admin — Staff, Settings & Security (role: admin/owner)

**Frontend:** `app/staff`, `app/settings`, `app/security`
**Verified against:** staff-access controller, commerce-settings/settings
controllers, auth controller admin 2FA group

---

## Staff access lifecycle
| # | Method | Endpoint | Purpose |
|---|---|---|---|
| 1 | GET | `/admin/staff` | Active staff + pending invitations (INVITE tokens unexpired) |
| 2 | POST | `/admin/staff/invite` `{ email,name,permissions[] }` | Sends invite; enforces staff_seats plan limit server-side |
| 3 | PATCH | `/admin/staff/:userId/access` `{ status, permissions }` | Update access (bumps sessionVersion → kills sessions) |
| 4 | PATCH | `/admin/staff/:userId/deactivate` | Deactivate + session kill |
| 5 | POST | `/admin/staff/:userId/reset` | Issue RESET token email |
| 6 | POST | `/staff-access/accept` / complete-reset paths | Invitee-side completion (token single-use) |

Deactivation is fleet-wide instantly via Redis pub/sub invalidation of the
membership cache.

## Settings
| # | Method | Endpoint | Purpose |
|---|---|---|---|
| 1 | GET/PATCH | `/settings?type=…` | Per-type settings documents (hero showcase, policies…) — tenant-local CRUD |
| 2 | GET/PATCH | `/admin/commerce-settings` | Store identity, contacts, feature flags (CommerceSettingsService) |
| 3 | GET | `/admin/commerce-settings/public` | Public projection consumed by storefront |

## Security (owner/admin)
| # | Method | Endpoint | Purpose |
|---|---|---|---|
| 1 | GET/POST | `/auth/admin/2fa/setup` · `/confirm` · `/disable` | TOTP lifecycle for high-risk roles |
| 2 | POST | `/auth/admin/login` → `/auth/admin/2fa/verify` | Admin login with 2FA challenge |
| 3 | GET | `/admin/audit-logs?entity=&actor=&from&to` | Append-only audit trail query |
