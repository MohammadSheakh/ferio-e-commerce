# Ferio Project Progress 77

**Checkpoint date:** August 21, 2026  
**Milestone:** Consent-safe abandoned-cart eligibility  
**Status:** Release 1 abandoned-cart eligibility safeguards and operator evidence are complete; automated outreach remains deferred to Release 2.

## Delivered

### Eligibility policy

- Requires a cart linked to a verified, non-deleted customer `User` account.
- Requires the customer role and a usable verified-account email address.
- Requires a nonempty active cart that remains unexpired and has exceeded the configurable inactivity threshold.
- Requires an explicit current checkout-draft marketing consent with a recorded timestamp.
- Excludes stale consent using a configurable maximum consent age.
- Excludes carts whose checkout draft already produced an order.
- Returns the evaluated policy and generation timestamp with every result set.

### Protected operator evidence

- Added `GET /admin/abandoned-carts/eligible` behind authentication, Admin/delegated-role boundaries, and `messaging.read` permission.
- Added a coded Admin BFF route preserving authentication and upstream failures.
- Added a restrained read-only Admin queue showing customer identity, cart contents, inactivity time, and consent timestamp.
- Added clear interface language that the queue does not send messages or create campaigns.
- Added permission-aware sidebar navigation for authorized messaging staff.

### Scope control

- No email, SMS, WhatsApp, or push message is sent by this feature.
- No customer is inferred from similar phone or email data; eligibility uses the verified JWT-linked cart owner.
- Consent evidence remains tied to the current checkout draft and can be replaced by a later preview where consent is withdrawn.
- Automated abandoned-cart campaigns, frequency caps, quiet hours, suppression, and revocation history remain Release 2 work.

## Configuration

- `ABANDONED_CART_MIN_AGE_HOURS` defaults to `2`.
- `MARKETING_CONSENT_MAX_AGE_DAYS` defaults to `365`.
- Both values are documented in the Backend `.env.example`.

## Validation

| Project | Check | Result |
| --- | --- | --- |
| Backend | Cart and eligibility policy suite | Passed; 7 tests |
| Backend | Complete NestJS application and library build | Passed |
| Admin Web | Next.js production build and type validation | Passed; 88 routes generated |
| Workspace | `git diff --check` | Passed |
