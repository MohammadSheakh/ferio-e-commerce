# Customer Account Module

## Scope

Authenticated customer profile, account linking, address management, and
customer identity ownership.

## Architecture Score

**79%**. Ownership checks and tenant routing are sound; address DTO/service
coverage and account-linking edge cases need more tests.

## Routes

| Route | Score | Review |
|---|---:|---|
| `GET /account/commerce` | 82% | Typed principal and owner-scoped profile read. |
| `PUT /account/commerce/profile` | 80% | DTO-driven update; verify allowed profile fields and audit policy. |
| `POST /account/commerce/link` | 82% | Good reference/phone verification direction; protect replay and race cases. |
| `POST /account/commerce/addresses` | 78% | Typed DTO and owner scope; normalize phone/location consistently. |
| `PUT /account/commerce/addresses/:id` | 78% | Owner lookup is present; test default-address races. |
| `DELETE /account/commerce/addresses/:id` | 80% | Must preserve default-address invariant and be idempotent. |

## Tasks

1. Add transaction/locking strategy for default-address changes.
2. Add cross-account linking, duplicate, and concurrent-link tests.
3. Define privacy and audit policy for phone/address changes.
