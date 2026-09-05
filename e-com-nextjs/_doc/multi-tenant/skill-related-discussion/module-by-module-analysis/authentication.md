# Authentication Module

## Scope

Customer/admin login, registration, email verification, password recovery,
refresh/logout, OAuth, and tenant-admin two-factor authentication.

## Architecture Score

**82%**. This is a mature boundary with separate platform authentication,
password hashing, throttling, OTP, JWT handling, and tenant binding. It still
needs provider-contract cleanup and production identity testing.

## Routes

| Route | Score | Review |
|---|---:|---|
| `GET /auth/session` | 85% | Typed authenticated session lookup; confirm cache and revocation semantics. |
| `POST /auth/login` | 84% | Good authentication boundary and throttling; test lockout and enumeration behavior. |
| `POST /auth/admin/login` | 84% | Correctly separate admin realm; verify tenant host binding and permission claims. |
| `POST /auth/admin/2fa/verify` | 82% | Security-sensitive flow; require replay, attempt, and recovery-code tests. |
| `GET /auth/admin/2fa` | 84% | Protected status read. |
| `POST /auth/admin/2fa/setup` | 82% | Secret lifecycle and one-time setup need explicit tests. |
| `POST /auth/admin/2fa/confirm` | 82% | Require rate limits and atomic enablement. |
| `POST /auth/admin/2fa/disable` | 80% | Must require recent authentication or step-up verification. |
| `POST /auth/register` | 82% | DTO and verification flow are present; test duplicate and abuse cases. |
| `POST /auth/verify-email` | 84% | Token lifecycle should be single-use and tenant-bound. |
| `POST /auth/resend-verification` | 80% | Rate limiting and enumeration resistance required. |
| `POST /auth/oauth` | 78% | Functional provider boundary; provider profile types remain weak. |
| `POST /auth/refresh` | 82% | Verify rotation, reuse detection, and session-version invalidation. |
| `POST /auth/logout` | 82% | Confirm all refresh/session state is revoked. |
| `POST /auth/forgot-password` | 82% | Good security shape; test enumeration and token expiry. |
| `POST /auth/verify-otp` | 82% | Require attempt limits and one-time consumption. |
| `POST /auth/reset-password` | 82% | Must invalidate old sessions and enforce password policy. |

## Tasks

1. Replace OAuth strategy `any` contracts with named provider profile types.
2. Add property-based and failure tests for token rotation and 2FA replay.
3. Document cookie/header transport and cross-origin session policy.
