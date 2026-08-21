# Ferio Project Progress 72

**Checkpoint date:** August 21, 2026  
**Milestone:** Delegated staff-access backend foundation  
**Status:** `FR-AUTH-006` is partial; secure backend workflows are complete, while Admin screens and production email delivery proof remain.

## Delivered

### Staff identity and permissions

- Added a distinct `staff` user role instead of treating delegated operators as unrestricted administrators.
- Persisted each staff account's explicit permission list, active/inactive access state, and session version.
- Included server-owned staff permissions and session version in signed access and refresh claims.
- Allowed active staff to cross Admin role boundaries only where explicit permission metadata exists; the permission guard still decides the exact operation.
- Kept owner-only staff-management endpoints restricted to the `admin` role, preventing delegated staff from granting access.

### Invitation and access reset

- Added owner endpoints to list staff and pending invitations, invite staff, deactivate staff, and issue password-reset access.
- Added public endpoints to accept an invitation and complete a staff reset.
- Generated cryptographically random one-time tokens, stored only SHA-256 hashes, applied configurable expiry, and invalidated older outstanding tokens of the same purpose.
- Made token consumption atomic so concurrent requests cannot reuse an invitation or reset token.
- Prevented owner self-deactivation and restricted deactivation/reset operations to real staff accounts.
- Queued staff-access email jobs without writing recipient addresses or raw tokens to structured logs.
- Added immutable audit events for invitations, deactivations, and reset issuance without recording secrets.

### Session revocation

- Rejected inactive staff during Admin login.
- Incremented the staff session version on deactivation and reset issuance/completion.
- Rejected refresh tokens when staff access is inactive or their signed session version is stale.
- Preserved the 15-minute access-token ceiling, limiting the lifetime of an already-issued access token after access changes.

## Data Changes

- Added `StaffAccessStatus` and `StaffAccessTokenPurpose` enums.
- Added staff access fields and indexes to `User`.
- Added the `StaffAccessToken` model and migration `20260821143000_staff_access_lifecycle`.

## Validation

| Project | Check | Result |
| --- | --- | --- |
| Backend | Prisma client generation | Passed |
| Backend | Prisma schema validation | Passed |
| Backend | Staff lifecycle, permission, authentication, and email suites | Passed; 4 suites, 17 tests |
| Backend | Complete NestJS application and library build | Passed |
| Backend | `git diff --check` | Passed |

## Remaining

- Build the Admin staff-management screen for listing, invitation, deactivation, permission assignment, and reset initiation.
- Build invitation acceptance and reset-completion screens.
- Connect the queued access-email job to production templates and the selected email provider, then prove delivery in staging.
- Add optional two-factor authentication for high-risk roles (`FR-AUTH-007`).
