# Account, Notification, Wallet, Warranty, and Booking Patterns

This chapter is based on the focused source and test pass for
`customer-account`, `customer-notifications`, `wallet`, `warranty`, and
`service-booking`. It is source-backed study material, not a full feature
acceptance report.

## 197. Customer link by exact order proof

An authenticated account can link to a customer record only after an order
reference and placement phone match. Existing links on either side prevent an
identity from being silently reassigned.

- Source: `customer-account.service.ts`
- Test: `customer-account.service.spec.ts`
- Failure mode: account takeover through an order id alone.

## 198. Customer profile fan-out

Profile updates synchronize the user and customer records while preserving the
tenant database boundary. The authenticated payload supplies the user identity.

- Source: `CustomerAccountService.updateProfile`
- Failure mode: updating a customer record without updating the linked account,
  or accepting a client-selected user id.

## 199. Owner-scoped address mutation

Address reads, updates, default selection, and deletes include the resolved
customer id in their predicates. A raw address id is never sufficient for
authorization.

- Source: `customer-account.service.ts`
- Failure mode: insecure direct object reference through an address id.

## 200. Default-address invariant

When an address becomes default, the service clears the previous default for
that customer and promotes the selected row. When the default is deleted, a
remaining address can be promoted deterministically.

- Source: address mutation methods in `customer-account.service.ts`
- Failure mode: multiple defaults or no usable default after deletion.

## 201. Tenant-local account lookup

Account profile and link operations resolve the tenant client before reading
users or customers. Identical user ids in two tenants are intentionally
independent.

- Source: `CustomerAccountService.db`
- Test: `customer-account.tenant-isolation.spec.ts`
- Failure mode: platform or legacy client accidentally serving storefront data.

## 202. Notification deduplication key

Notification creation uses a durable deduplication key and returns the existing
notification when a repeated event is received. The receiver id remains part
of the ownership boundary.

- Source: `customer-notifications.service.ts`
- Test: `customer-notifications.service.spec.ts`
- Failure mode: repeated domain events spamming a customer.

## 203. Owner-scoped notification read

List, mark-read, read-all, and remove operations include `receiverId` in the
database predicate. A notification id cannot be used to change another
customer's inbox.

- Source: `CustomerNotificationsService`
- Test: notification ownership cases
- Failure mode: cross-customer read or deletion.

## 204. Soft-deleted notification lifecycle

Notification removal updates deletion state rather than destroying the row.
Normal list and unread counts exclude deleted notifications, preserving an
operational record.

- Source: `customer-notifications.service.ts`
- Failure mode: destructive deletion that makes notification evidence vanish.

## 205. Count-plus-page notification contract

Notification list queries fetch page rows, total count, and unread count in
parallel, returning a stable envelope for frontend badges and pagination.

- Source: `CustomerNotificationsService.list`
- Failure mode: the list and badge disagree because they use separate filters.

## 206. Wallet ensure-before-ledger

Wallet operations ensure the tenant-local wallet exists before applying ledger
commands. The wallet balance is a projection; the immutable transaction rows
are the accounting evidence.

- Source: `wallet.service.ts`
- Failure mode: balance records without a corresponding ledger entry.

## 207. Wallet top-up idempotency

Top-up requests hash an idempotency key and reject duplicate transaction
references inside a transaction. Repeated submissions do not create another
credit instruction.

- Source: `WalletService.requestTopUp`
- Test: `wallet.service.spec.ts`
- Failure mode: duplicate customer credits from retrying a form.

## 208. Atomic wallet debit with insufficient-balance guard

Order debit uses a conditional balance update and records the exact before and
after values. A failed conditional update becomes an insufficient-balance
conflict rather than a negative balance.

- Source: `WalletService.debitOrder`
- Test: wallet debit cases
- Failure mode: concurrent orders spending the same balance.

## 209. Idempotent wallet refund

Cancelled-order refunds use a deterministic order-derived idempotency key and
require the original debit evidence before crediting the wallet.

- Source: `WalletService.refundCancelledOrder`
- Failure mode: refunding an order that was never debited or refunding twice.

## 210. Tenant-isolated wallet evidence

Wallet summaries and ledger commands use the resolved tenant database, so
overlapping customer ids and balances remain isolated.

- Source: `WalletService.db`
- Test: `wallet.tenant-isolation.spec.ts`
- Failure mode: financial data leakage across storefronts.

## 211. Warranty delivered-order prerequisite

Warranty eligibility verifies the order is delivered or completed and validates
the requested order item before claim creation. The browser cannot self-declare
coverage.

- Source: `warranty.service.ts`
- Failure mode: claims against cancelled, undelivered, or unrelated orders.

## 212. One active warranty claim per item

Claim creation rejects another non-terminal claim for the same item. Terminal
claims remain history while active claims remain unique.

- Source: `WarrantyService.create`
- Failure mode: parallel open claims for one purchased item.

## 213. Warranty transition table

Allowed claim transitions are defined in a small policy utility and checked
before updates. Rejection requires a reason and terminal timestamps are set by
the service.

- Source: `warranty/utils/warranty.util.ts` and `warranty.service.ts`
- Tests: `warranty.util.spec.ts`, `warranty.service.spec.ts`
- Failure mode: skipping inspection/repair states or reopening a terminal claim.

## 214. Warranty feature gate

Public claim creation checks the tenant commerce settings before accepting a
claim. Disabled features fail with a stable operational response instead of
being hidden only in the frontend.

- Source: `warranty.controller.ts`
- Test: `warranty.controller.spec.ts`
- Failure mode: direct API callers bypassing the store's feature setting.

## 215. Service-booking feature gate

Public service discovery and booking check the tenant's service-booking setting
before querying or creating records. Disabled service offerings are not exposed.

- Source: `service-booking.controller.ts`
- Failure mode: a disabled product surface remaining callable through old URLs.

## 216. Booking time and lead-time policy

Booking verifies the referenced service is active and requires the requested
time to be at least the service lead time in the future.

- Source: `ServiceBookingService.book`
- Test: `service-booking.service.spec.ts`
- Failure mode: accepting impossible or immediately requested appointments.

## 217. Snapshot mutable service data

Booking rows snapshot service name, price, and duration at booking time. Later
service edits do not rewrite historical customer commitments.

- Source: `service-booking.service.ts`
- Failure mode: historical bookings changing when the catalog changes.

## 218. Booking transition history

Admin booking status changes validate an allowed transition and write both the
current row and a history row in one transaction.

- Source: `ServiceBookingService.status`
- Test: service-booking status transition cases
- Failure mode: status without traceable actor/history or skipped lifecycle.

## Evidence boundary

The focused tests provide source and unit evidence for these patterns. Real push
delivery, wallet concurrency under load, and live customer booking operations
still require integration or staging evidence in the audit matrix.
