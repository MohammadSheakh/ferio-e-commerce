# 4. Authentication And Authorization

Ferio has two identity realms. They must never be confused.

```text
Platform Admin -> PlatformUser + platform JWT + PlatformAuthGuard
Tenant user    -> tenant User + tenant JWT/session + AuthGuard
```

## Tenant User Login

1. The client sends `POST /api/v1/auth/login` through a tenant hostname.
2. Tenant middleware resolves the organization and tenant database first.
3. DTO validation checks the login input.
4. Rate limiting protects the authentication endpoint.
5. `AuthService` normalizes the email/phone identifier and reads the user from
   the tenant database.
6. Password hashing is checked with bcrypt.
7. Failed attempts and temporary locks are recorded.
8. Unverified customer accounts are rejected until email verification.
9. The service issues an access token and refresh token.
10. The controller returns the tokens and writes the refresh token to an
    HTTP-only cookie.

Admin login uses `POST /api/v1/auth/admin/login`. It follows the same tenant
resolution but requires an admin user. If two-factor authentication is enabled,
the result is a short-lived challenge instead of a completed session.

## Customer Registration And Verification

```text
POST /auth/register
  -> validate input and create tenant user
  -> create verification/OTP state
  -> enqueue/send verification email

POST /auth/verify-email
  -> validate email + OTP
  -> consume one-time verification state
  -> mark email verified
  -> issue authenticated session
```

Resend verification, forgot password, OTP verification, and reset password use
the OTP service. They must be rate-limited, one-time, attempt-limited, and
careful not to reveal whether an account exists.

## Refresh And Logout

1. The client sends the refresh token, normally through the HTTP-only cookie.
2. The service validates token/session version and revocation state.
3. A new access token is issued according to the rotation policy.
4. Logout revokes the refresh/session state and clears the cookie.

The access token is short-lived compared with the refresh session. Never treat
the browser's stored organization ID as proof of tenant identity.

## Admin Two-Factor Flow

```text
POST /auth/admin/login
  -> valid password
  -> 2FA enabled?
       no  -> completed tenant-admin session
       yes -> challenge token

POST /auth/admin/2fa/verify
  -> challenge token + code
  -> attempt/replay checks
  -> completed session + refresh cookie
```

Enrollment uses status, setup, confirm, and disable routes. Disabling requires
the password and code according to the service policy.

## Authorization Layers

Authentication answers: “Who is this principal?” Authorization answers: “May
this principal perform this action in this tenant?”

Typical admin route order:

```text
AuthGuard
  -> RolesGuard
  -> PermissionsGuard
  -> TenantMembershipGuard
  -> service ownership/domain checks
```

The service repeats ownership and tenant checks because a controller guard is
not a substitute for domain authorization.

## Platform Admin Login

`POST /api/v1/platform/auth/login` is handled by platform auth, not tenant
auth. It reads `PlatformUser` from the control-plane Prisma client, compares
the configured/seeded password hash, and issues a platform-realm token. The
`PlatformAuthGuard` validates realm, expiry, and platform role/permissions.

Platform Admin permission examples include organization, subscription,
billing, provisioning, migration, support-access, and platform-health actions.

