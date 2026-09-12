# Identity, Audit, and File Patterns

This chapter is source-backed by the current `ferio-nest-prisma` slice under
`src/features/authentication`, `src/features/user-management`,
`src/features/audit`, and `src/features/attachments`. It is a study guide, not
a claim that the entire backend has been exhaustively audited.

## 141. Password hash boundary

Registration and password reset hash passwords with `bcrypt` before persistence;
login compares the submitted secret with the stored hash. Controllers receive
DTOs, while the service owns the credential boundary.

- Source: `src/features/authentication/auth/auth.service.ts`
- Test: `src/features/authentication/auth/tests/auth.service.spec.ts`
- Failure mode: returning or logging the password, or storing a plaintext value.
- Study question: which response fields are removed by `toPublicUser()`?

## 142. Refresh-token rotation and revocation

Refresh accepts a token from the cookie or native request contract, validates
its issuer/session/tenant claims, blacklists the old token in Redis, and issues
a replacement. Missing Redis fails closed because revocation cannot be checked.

- Source: `src/features/authentication/auth/auth.service.ts`
- Test: `src/features/authentication/auth/tests/auth.service.spec.ts`
- Failure mode: accepting a revoked token or allowing a token from another tenant.
- Study question: is the blacklist TTL aligned with the effective token expiry?

## 143. Tenant-bound token claims

Customer tokens carry the resolved organization context. Refresh and protected
operations compare that context with the current request tenant before using
the tenant database.

- Source: `src/features/authentication/auth/auth.service.ts`
- Test: the tenant-binding and cross-tenant refresh cases in
  `auth.service.spec.ts`
- Failure mode: a valid JWT being treated as globally portable across stores.
- Study question: which claims are identity, and which are request context?

## 144. Login lockout state machine

Failed password attempts update bounded counters and a lock-until timestamp;
successful authentication clears the failure state. The service logs a safe
security event without exposing the password or raw identifier.

- Source: `src/features/authentication/auth/auth.service.ts`
- Test: the final failed-attempt lockout case in `auth.service.spec.ts`
- Failure mode: unbounded brute force or a lockout that can be bypassed by a
  different authentication path.
- Study question: how do rate limiting and account lockout complement each other?

## 145. OTP hashed, bounded, and single-use

OTP creation stores only a SHA-256 digest with expiry and an attempt counter.
Verification uses constant-time comparison, deletes after the attempt limit,
and atomically consumes a valid code with `GETDEL`.

- Source: `src/features/authentication/otp/otp.service.ts`
- Test: `src/features/authentication/otp/tests/otp.service.spec.ts`
- Failure mode: plaintext OTPs, unlimited guesses, or successful replay.
- Study question: why is an OTP Redis key tenant-scoped when tenant context exists?

## 146. Two-factor step-up challenge

Admin login can stop at a short-lived challenge token. The final code exchange
checks purpose, organization, user role, access status, and session version
before issuing normal tokens.

- Source: `auth.service.ts` and `two-factor.service.ts`
- Test: `src/features/authentication/two-factor/tests/two-factor.service.spec.ts`
- Failure mode: treating a pre-authentication challenge as a full session.
- Study question: which staff changes invalidate `staffSessionVersion`?

## 147. Encrypted TOTP secret and hashed recovery codes

The TOTP secret is encrypted at rest; recovery codes are hashed and compared
without storing usable recovery values. Enrollment persists a pending secret
until confirmation succeeds.

- Source: `src/features/authentication/two-factor/two-factor.service.ts`
- Test: `two-factor.service.spec.ts`
- Failure mode: storing the authenticator secret or recovery codes in plaintext.
- Study question: where does the encryption key come from, and what happens if
  it is missing at startup?

## 148. Verified OAuth identity boundary

OAuth login verifies the provider token and configured audience before the auth
service links or creates a local identity. Provider failures are normalized to
safe authentication rejection events.

- Source: `src/features/authentication/oauth/oauth-verification.service.ts`
- Test: `src/features/authentication/oauth/tests/oauth-verification.service.spec.ts`
- Failure mode: trusting an unverified email or accepting a token for another
  client application.
- Study question: which provider fields are safe to persist?

## 149. Authenticated self-service ownership

User, profile, device, and OAuth-account controllers derive the user id from
the authenticated payload rather than accepting it as a client-selected route
identity. Services repeat ownership predicates for updates and deletes.

- Source: `src/features/user-management/*/*.controller.ts` and services
- Test: `src/features/user-management/userDevices/tests/userDevices.service.spec.ts`
- Failure mode: an authenticated user reading or mutating another user by id.
- Study question: which methods still accept a raw id and what trust boundary
  protects them?

## 150. Cache-aside profile reads with invalidation

Profile and statistics reads use a cache-aside path. Mutations update the
tenant database first and invalidate the relevant user cache keys afterward.

- Source: `src/features/user-management/user/user.service.ts` and
  `userProfile/userProfile.service.ts`
- Failure mode: returning stale identity data after a successful update or
  using a non-tenant-scoped cache key.
- Study question: is invalidation failure observable and retryable?

## 151. Soft-delete device lifecycle

Device removal marks the owned device deleted instead of physically removing
the row. Reads and active-device queries exclude deleted records, preserving
an audit-friendly lifecycle.

- Source: `src/features/user-management/userDevices/userDevices.service.ts`
- Test: `userDevices.service.spec.ts`
- Failure mode: deleting by device id without checking `userId` ownership.
- Study question: which cleanup process handles inactive device records?

## 152. Audit context enrichment

Audit records include actor identity, role, source, correlation id, organization,
tenant database, domain, and hostname from trusted request context. A service
method accepts a transaction client so the audit row can share the domain
mutation transaction.

- Source: `src/features/audit/services/audit.service.ts`
- Test: `src/features/audit/tests/audit.service.spec.ts`
- Failure mode: an audit row that cannot be tied to a request or tenant.
- Study question: which fields remain available for background jobs without an
  HTTP request?

## 153. Recursive audit redaction and truncation

Audit snapshots recursively redact secret-like keys, cap recursion depth, and
truncate oversized strings before converting them into Prisma JSON input.

- Source: `src/features/audit/utils/audit.util.ts`
- Test: `src/features/audit/tests/audit.util.spec.ts`
- Failure mode: turning audit logs into a credential leak or an unbounded JSON
  storage/logging path.
- Study question: does the sensitive-key vocabulary cover every provider token?

## 154. Audit query boundary

The admin audit endpoint combines authentication, role, permission, and tenant
membership guards before accepting a bounded query DTO. The service runs the
page query and count in parallel and returns a stable pagination envelope.

- Source: `src/features/audit/controllers/audit.controller.ts`,
  `audit.dto.ts`, and `audit.service.ts`
- Failure mode: exposing audit data across tenants or allowing unbounded scans.
- Study question: should `action` and `entityType` be enums or remain extensible?

## 155. Provider strategy boundary for uploads

`CloudinaryStrategy` isolates provider configuration, upload transformation,
result normalization, and deletion from feature callers. The caller receives a
small `FileUploadResult` contract instead of a Cloudinary SDK object.

- Source: `src/features/attachments/strategies/cloudinary.strategy.ts`
- Failure mode: leaking provider-specific types into domain services or trusting
  an arbitrary public id during deletion.
- Study question: where are MIME, byte-size, malware, and tenant-folder checks
  supposed to happen before this strategy is called?

## 156. Honest attachment feature boundary

The current repository slice contains attachment diagrams and a Cloudinary
strategy, but no discovered controller, DTO, module, quarantine processor, or
tenant-owned attachment service under `src/features/attachments`. Therefore the
provider strategy is not evidence of a complete upload feature.

- Evidence: `find src/features/attachments -type f`
- Release implication: media validation, malware quarantine, ownership, cleanup,
  and API integration remain audit questions until the missing boundary exists.
- Study question: should attachments be a standalone feature or a shared
  infrastructure capability with feature-specific ownership tables?

## Review checklist

For each identity or file flow, trace:

```text
DTO validation
  -> guard and trusted identity
  -> tenant database resolution
  -> service ownership predicate
  -> transaction/idempotency boundary
  -> Redis/provider side effects
  -> safe audit/logging
  -> focused test and runtime evidence
```

The source slice has focused unit tests for most identity and audit controls.
It does not yet prove complete frontend integration, live provider behavior, or
production infrastructure readiness.
