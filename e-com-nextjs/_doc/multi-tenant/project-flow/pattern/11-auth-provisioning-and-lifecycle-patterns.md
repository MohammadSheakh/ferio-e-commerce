# Patterns 69-80: Auth, Provisioning, And Lifecycle

This block is based on the authentication, user-management, platform
organization, provisioning, and lifecycle services inspected in the current
backend slice.

## 69. Authentication token lifecycle

Templates: `src/features/authentication/auth/auth.service.ts`, auth DTOs, and
`libs/common/src/guards/auth.guard.ts`. Trace credential verification, token
claims, expiry, refresh/revocation behavior, and principal attachment. Never
confuse token validity with tenant membership.

## 70. OTP single-use challenge

Template: `src/features/authentication/otp/otp.service.ts`. Study generation,
expiry, attempt limits, Redis storage, one-time consumption, replay rejection,
and safe delivery logging.

## 71. Two-factor step-up verification

Template: `src/features/authentication/two-factor/two-factor.service.ts` and
tests. Follow enrollment, challenge, verification, recovery behavior, and the
point where a session gains stronger assurance.

## 72. OAuth identity verification

Template: `src/features/authentication/oauth/oauth-verification.service.ts`.
Study provider identity validation, verified-email policy, account linking,
nonce/state checks, and tenant-safe user lookup.

## 73. Device/session registration

Template: `src/features/user-management/userDevices/`. Learn how devices are
registered, refreshed, revoked, and associated with the correct user without
trusting a client-selected user ID.

## 74. Idempotent organization creation

Template: `src/platform/services/organizations.service.ts` and its spec.
Study normalization, uniqueness errors, the organization/member transaction,
and audit behavior. Organization creation is a control-plane command.

## 75. Compare-and-set lifecycle transition

Template: `OrganizationsService.transition()`. The service validates the legal
state graph, updates only if the previously read state still matches, records a
lifecycle event, and maps races to a stable conflict.

## 76. Provisioning step journal

Template: `src/platform/services/provisioning.service.ts`. Each step has a
status and detail record, making retries and operator evidence visible instead
of hiding a long workflow inside one opaque transaction.

## 77. Pluggable infrastructure executor

Template: `tenant-database-provisioner.interface.ts` and the DI token used by
provisioning. Orchestration depends on an infrastructure interface, allowing
local Docker provisioning and a future managed provider without changing the
state machine.

## 78. Retry/resume from incomplete step

Template: provisioning `start()` and `resume()`. Idempotency keys return or
resume an existing run; completed steps are skipped; failed runs transition to
an explicit lifecycle state. Read the race and replay tests.

## 79. Audit after committed state change

Template: organization creation and transition methods. Domain state commits
first, then an audit record is written with actor, previous/new values, reason,
and metadata. Study what happens if audit persistence fails and what the
operational contract requires.

## 80. Owner membership versus tenant identity

Template: organization creation, provisioning `ATTACH_OWNER_MEMBERSHIP`, and
tenant authentication. A control-plane owner membership is not automatically a
tenant-plane user/session. This distinction is the current owner-bootstrap
release gap and must be solved with an explicit activation/invitation flow.

## Study tests

```text
src/features/authentication/auth/tests/auth.service.spec.ts
src/features/authentication/otp/tests/otp.service.spec.ts
src/features/authentication/two-factor/tests/two-factor.service.spec.ts
src/platform/services/organizations.service.spec.ts
src/platform/services/provisioning.service.spec.ts
src/platform/services/tenant-closure.service.spec.ts
```
