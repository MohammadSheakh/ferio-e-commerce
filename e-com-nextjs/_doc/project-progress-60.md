# Ferio Project Progress 60

**Checkpoint date:** August 20, 2026
**Milestone:** Slice 9 Web session hardening
**Status:** Backend, Customer Web, and Admin Web session lifecycles aligned and validated; Mobile work intentionally paused.

## Delivered

### Backend authentication

- Restored the default and active access-token lifetime from seven days to 15 minutes.
- Retained seven-day refresh tokens with rotation and revocation.
- Added focused coverage proving the default 15-minute access and seven-day refresh signing policy.

### Customer Web

- Reduced the HTTP-only customer access-cookie lifetime to 15 minutes.
- Retained the seven-day HTTP-only refresh cookie and existing transparent refresh/retry flow.

### Admin Web

- Reduced the HTTP-only admin access-cookie lifetime to 15 minutes.
- Forward middleware-rotated access and refresh credentials into the same active request so protected Server Components receive the renewed session.
- Added one-time refresh and retry behavior to the shared Admin backend client, including refresh-token rotation persistence in route-handler contexts.

## Validation

| Project | Check | Result |
| --- | --- | --- |
| NestJS Backend | Auth and socket security Jest suites | Passed, 9/9 |
| NestJS Backend | Nest production build | Passed |
| Customer Web | TypeScript `--noEmit` | Passed |
| Admin Web | TypeScript `--noEmit` | Passed |

## Remaining

- Run browser E2E with forced access-token expiry for customer and admin sessions.
- Verify concurrent Admin BFF requests during refresh against a production-like deployment.
- Complete the broader Slice 9 security review, provider sandbox proof, observability, backup, restore, accessibility, and launch exercises.
- Rotate the previously exposed CarryBee credential outside repository documentation and verify the replacement in every deployed environment.
