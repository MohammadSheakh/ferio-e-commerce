# Ferio Project Progress 69

**Checkpoint date:** August 21, 2026
**Milestone:** Authentication security-event logging
**Status:** PRD requirement `FR-AUTH-005` is complete with privacy-safe, correlation-aware failure evidence.

## Delivered

### Password and staff authentication

- Added reason-coded rejection events for unknown or passwordless accounts, invalid passwords, active lockouts, newly applied lockouts, unverified customer email, and non-Admin access to the Admin login endpoint.
- Events distinguish customer and Admin audiences and include internal user IDs only after an account is matched.
- Login events never include submitted email, phone, password, or normalized identifier values.

### Session and OAuth rejection

- Added refresh rejection events for missing, revoked, malformed, invalid-payload, and unavailable-account sessions without logging refresh tokens.
- Refactored refresh validation so database or token-generation infrastructure failures are no longer incorrectly converted into invalid-token responses.
- Added Google OAuth events for invalid provider, unverifiable identity, invalid token, deleted account, and staff-role rejection without logging ID tokens or provider identity data.

### OTP, rate limiting, and email diagnostics

- Added OTP rejection events for unavailable verification storage, expired/missing codes, invalid codes, and attempt exhaustion without logging email addresses or OTP values.
- Added authentication rate-limit events with route preset, bounded counts, retry duration, and authenticated user ID when available; client IP is omitted from the domain event and remains available only in the sanitized HTTP event.
- Removed direct recipient, customer-name, and OTP values from authentication email logs while preserving the required BullMQ delivery payload.
- Replaced the email service's unresolved `src/...` queue import with the canonical `@app/queue` library contract.

## Validation

| Project | Check | Result |
| --- | --- | --- |
| Backend | Authentication, OAuth, OTP, email, rate-limit, and structured-logger tests | Passed; 7 suites, 17 tests |
| Backend | Complete NestJS application and library build | Passed |
| Backend | Authentication log credential-value audit | Passed; no email, phone, password, OTP, ID-token, or refresh-token value logging found |
| Workspace | `git diff --check` | Passed |

## Remaining

- Continue explicit permission coverage across protected modules under `FR-AUTH-002` and `FR-AUTH-003`.
- Configure production log transport, external error tracking, retention, alert thresholds, and incident ownership.
- Add optional two-factor authentication and staff invitation/deactivation/reset workflows in their scheduled slices.
