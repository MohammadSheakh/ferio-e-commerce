# Platform Admin — Support Access

**Frontend:** `app/support-access` (+ revoke button)
**Verified against:** support-access controller/service (MT-1), owner decision #10

---

| # | Method | Endpoint | Purpose |
|---|---|---|---|
| 1 | GET | `/platform/support-access` | Active/expired grants |
| 2 | POST | `/platform/support-access` `{ organizationId, reason(≥10 chars), expiresAt(5min–8h) }` | Time-boxed, reason-bound grant (audited) |
| 3 | POST | `/platform/support-access/:grantId/revoke` | Immediate revoke (audited) |

Policy (owner #10): tenant OWNER grants explicitly; emergency override is
Platform Super Admin-only and emits a security event. Metadata-first
support — no casual tenant-data access.
