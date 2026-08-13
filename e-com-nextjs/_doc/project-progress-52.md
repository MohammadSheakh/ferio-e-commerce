# Ferio Project Progress 52

**Checkpoint date:** August 13, 2026
**Milestone:** Explicitly linked customer account and previous-order history
**Status:** Signed-in customers can securely link one commerce profile and view its previous orders without Ferio inferring identity from similar contact data

## Delivered

- Adds an optional unique one-to-one relation between authentication `User` and commerce `Customer` records.
- Adds authenticated `GET /account/commerce` and `POST /account/commerce/link` endpoints.
- Requires an exact order reference plus normalized checkout phone before linking purchase history.
- Uses a constant-style `Order could not be verified` failure for both unknown references and phone mismatches to reduce order-enumeration leakage.
- Prevents an account from relinking to another customer and prevents one customer profile from linking to multiple accounts.
- Never links accounts based only on email similarity, phone similarity, or display name.
- Adds `/account/orders` with signed-out guidance, explicit linking form, latest 50 orders, product lines, totals, payment/lifecycle status, destination, courier tracking, and saved addresses.
- Reports when more than 50 historical orders exist rather than silently implying the list is complete.
- Adds direct customer navigation to account orders and warranty claims from the site header/footer and account screen.
- Updates sign-in copy and applies a safe same-site relative redirect after successful login.

## Validation

| Project | Check | Result |
| --- | --- | --- |
| Backend | Prisma schema build and client generation | Passed |
| Backend | Full unit suite | Passed; 31 suites and 105 tests |
| Backend | Production build | Passed |
| Customer Web | Production build | Passed; 33 pages generated |
| Repository | Diff whitespace validation | Passed |

## Security and Identity Rules

- The link proof is possession of both the order reference and the exact checkout phone.
- Account and customer links are unique in PostgreSQL and checked before update.
- Historical order-address records remain immutable and separate from reusable saved addresses.
- Full order history is available only behind the customer access token.
- This workflow does not merge duplicate commerce customers; merge remains a reviewed Admin operation requiring approved identity-conflict rules.

## Operational Notes

- Deploy migration `20260814033000_explicit_account_customer_link` to target PostgreSQL.
- Existing users and customers remain unlinked until the customer completes explicit verification.
- Customer access cookies currently follow the existing 15-minute access-token lifetime; refresh/session improvements remain separate authentication work.
- Registration and email-verification UX remain inherited from the existing backend and are not expanded by this checkpoint.

## Recommended Next Work

1. Add account logout and secure access-token refresh so customer sessions are operationally complete.
2. Add customer-controlled saved-address updates without changing historical order snapshots.
3. Add database integration coverage for concurrent account-link attempts and unique-link enforcement.
