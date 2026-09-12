# Platform Admin — Support Access

**Frontend:** `app/support-access` (+ revoke button)
**Verified against:** support-access controller/service (MT-1), owner decision #10

---

| # | Method | Endpoint | Purpose |
|---|---|---|---|
| 1 | GET | `/platform/support-access` | Active/expired grants |
| 2 | POST | `/platform/support-access` `{ organizationId, reason(≥10 chars), ttlMinutes?(5min–8h), scope? }` | Time-boxed, reason-bound grant (audited) |
| 3 | POST | `/platform/support-access/:grantId/revoke` | Immediate revoke (audited) |

Policy (owner #10): tenant OWNER grants explicitly; emergency override is
Platform Super Admin-only and emits a security event. Metadata-first
support — no casual tenant-data access.

The platform screen now integrates grant creation and revocation through the
httpOnly-token BFF. The scope input is sent as a JSON object and the UI only
performs shape/TTL/reason validation; backend scope allow-listing, permission
checks, audit events, expiry, and revocation remain authoritative.

The platform session client preserves upstream status, machine error code, and
correlation ID through the catch-all BFF. Login stores only the platform access
token in an httpOnly cookie; logout clears the cookie locally after attempting
the backend refresh-token blacklist call.
