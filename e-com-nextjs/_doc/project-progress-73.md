# Ferio Project Progress 73

**Checkpoint date:** August 21, 2026  
**Milestone:** Staff access management and setup interfaces  
**Status:** `FR-AUTH-006` product workflows are implemented; production email-provider delivery proof remains before the checklist item can close.

## Delivered

### Owner staff management

- Added an Admin Web staff-access workspace with active, inactive, and pending-invitation summaries.
- Added owner workflows to invite staff, assign grouped explicit permissions, activate or deactivate accounts, revise permissions, and initiate password resets.
- Added pending invitation visibility with expiry timestamps.
- Added a deliberate confirmation state before reset issuance.
- Added development-only setup-link handoff when the Backend intentionally returns a raw token in development; production responses never include that token.

### Staff setup and reset

- Added a public Admin Web setup screen for invitation acceptance and password-reset completion.
- Kept one-time access tokens in URL fragments so they are not sent in HTTP request paths, referrer headers, or server access logs.
- Added password length and confirmation validation, invalid-link handling, one-time submission, token removal from browser history after success, and a direct return to sign-in.
- Added public BFF validation and a strict invite/reset endpoint allowlist.

### Permission-aware Admin navigation

- Added an authenticated session-claims endpoint backed by the verified access token.
- Filtered delegated staff navigation using server-issued permission claims.
- Kept owner-only Staff Access navigation hidden from delegated staff.
- Continued enforcing every permission at the Backend; navigation filtering is only interface alignment, not authorization.

### Backend completion

- Added audited permission/status updates for existing staff and incremented the session version on every access change.
- Added staff-access processing to both email worker implementations.
- Removed recipient addresses and token values from email worker diagnostics.
- Built staff invitation/reset links from `ADMIN_WEB_URL` and placed secrets in the fragment.

## Validation

| Project | Check | Result |
| --- | --- | --- |
| Backend | Authentication, permission, staff lifecycle, and email suites | Passed; 5 suites, 22 tests |
| Backend | Complete NestJS application and library build | Passed |
| Admin Web | Next.js production build and type validation | Passed; 83 routes generated |
| Workspace | `git diff --check` | Passed |

## Remaining

- Connect the staff-access email job to the selected production email provider and final HTML/text templates.
- Apply production credentials and prove invitation and reset delivery in staging without logging recipient or token data.
- Add optional two-factor authentication for high-risk roles (`FR-AUTH-007`).
