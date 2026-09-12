# Platform authentication API integration shot 35

Date: 2026-09-11

## Scope

Audited Platform Admin login, session-cookie handling, sign-out, protected
server-side API calls, and the platform JWT contract against
`PlatformAuthController`, `PlatformAuthGuard`, the platform BFF, and the
active API documentation.

## Findings and changes

- `POST /platform/auth/login` and `{ accessToken, roles }` response handling
  match the backend platform auth controller. The login route stores only the
  access token in the httpOnly platform cookie.
- Fixed the login page's missing exception boundary. Network failures and
  malformed responses now show a truthful control-plane error and always
  release the submit control.
- Confirmed the platform realm is intentionally not refresh-token based: the
  backend issues an eight-hour `PLATFORM_JWT_SECRET` token, while local sign-out
  clears the BFF cookie. Tenant staff tokens remain rejected by
  `PlatformAuthGuard`.
- Clarified the platform authentication contract in the API README.

## Verification

- `pnpm api:check` passed.
- `pnpm exec tsc --noEmit` passed.
- `pnpm lint` passed with no warnings or errors.

## Remaining runtime proof

Browser cookie flags, login throttling, token expiry, operator role/permission
denials, and live sign-out behavior still require runtime or security-test
evidence. No mobile or Redis code was changed.
