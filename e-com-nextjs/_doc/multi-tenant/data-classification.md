# MT-0 Data Classification — Existing Ferio Prisma Models

**Rule set (from PRD v2.1 engineering principles 7–12):**

| Class | Meaning |
|---|---|
| `CONTROL_PLANE` | Lives in the platform database. Describes the SaaS itself: organizations, plans, billing, provisioning, platform identity, platform audit. |
| `TENANT` | Lives in each tenant's database. Business data owned by one subscribed business. After migration these models exist **only** in tenant schemas. |
| `PLATFORM_SHARED` | Intentionally shared infrastructure with namespaced keys (e.g., media objects). Requires explicit design; global-by-accident prohibited. |
| `REMOVE/LEGACY` | Dead residue from pre-Ferio iterations (Mongoose-era task management, legacy payment/subscription modules already deleted). Must not be migrated forward. |

Cross-plane references use opaque IDs only — a tenant database must never hold a foreign key into control-plane tables.

## Classification table

### Commerce core → TENANT
`Brand`, `Category`, `Product`, `ProductVariant`, `ProductMedia`, `ProductFeature`, `ProductSpecification`, `ProductCondition(Grade)`*, `ProductYoutubeReview`, `ProductReviewBanner`, `Warehouse`, `InventoryStock`, `InventoryMovement`, `InventoryReservation`, `Cart`, `CartItem`, `SavedCart`, `SavedCartItem`, `CheckoutDraft`, `Order`, `OrderItem`, `OrderAddress`, `OrderStatusHistory`, `FulfillmentHistory`, `FulfillmentException`, `Shipment`, `ShipmentEvent`, `ShipmentWebhookLog`, `ShipmentPollAttempt`, `CodCollection`, `RtoCase`, `RtoItem`, `ReturnCase`, `ReturnItem`, `ReturnEvidence`, `ReturnStatusHistory`, `CommercePaymentAttempt`, `CommercePaymentCallback`, `CommerceRefund`, `RefundAttempt`, `CommerceMessage`(+Template/Attempt/Policy), `Customer`, `CustomerAddress`, `Wallet`, `WalletTopUp`, `WalletTransactionHistory`, `DeliveryZone`, `DeliveryPersonnel`, `DeliveryLocationHistory`, `StorePickup` fields on Order, `Store`/outlet records (`Platform` model → rename/absorb as tenant outlet), `ServiceOffering`, `ServiceBooking(+History)`, `WarrantyClaim(+History/Evidence)`, `ProductRequest`, `PurchaseActivity` records, `ReconciliationFinding/Run`, `CourierSettlement(+Import/Item/Row)`, `StaffAccessToken`.

\* Enums travel with their models.

### Identity & tenancy of people → TENANT (per ADR-0004)
`User`, `UserProfile`, `UserDevices`, `OAuthAccount`, `Conversation`, `ConversationParticipents`*, `Message`, `Notification` (in-app inbox), `StorefrontAnalyticsEvent`. Customer accounts are tenant-local initially (owner-blocked decision recorded in ADR-0004).

\* Legacy misspelling retained until a tenant-schema cleanup migration renames it.

### Configuration → TENANT
`CommerceSettings`, `Settings`, `CodVerificationPolicy`, `CommerceMessagingPolicy`, `FeatureFlag` equivalents inside settings. Every singleton/global setting becomes tenant-local by construction (separate databases). Hero Showcase content rides `Settings` → TENANT.

### Audit → TENANT (+ separate platform audit in control plane)
`AuditLog` stays per-tenant for commerce actions. Platform-side lifecycle actions get a new control-plane `PlatformAuditLog`.

### REMOVE/LEGACY — do not migrate
`PaymentTransaction`, `PaymentPlatform`, `PaymentGateway`(legacy enum family), `PaymentStatus`(legacy), `StripeAccount`, `StripeWebhookEvent`, `RevenueCatWebhookEvent`, `SubscriptionPlan`, `SubscriptionCurrency`, `SubscriptionType`, `RenewalFrequency`, `UserRoleData`, `RoleDataAdminStatus`, `ProviderApprovalStatus`, `UserAdminStatus`, `BankInfo`, `TBankAccount`, `TCurrency`, `TransactionType`, `TTransactionFor`, `TWalletStatus`, `TWalletTransactionHistory`, `TWalletTransactionStatus`, `TWithdrawalRequest`, `WithdrawalRequest`, `UserApprovalStatus`, `DeviceType`, `InitialDuration`, `WebhookProcessingStatus`, `ParticipantRole`, `MessageReadStatus`, `NotificationType/Priority/Status` (Mongoose-era duplicates of customer-notifications).

These belong to the deleted Mongoose-era payment/subscription/notification/user-role modules. They must be dropped during the canonical tenant-schema extraction (MT-11 packaging step), which also resolves every "unique constraint that becomes tenant-local" concern by construction.

### New CONTROL_PLANE models (introduced in MT-1)
`Organization`, `OrganizationLifecycleEvent`, `TenantDomain`, `TenantDatabase`, `ProvisioningRun`, `ProvisioningStep`, `TenantMigrationRun`, `TenantMigrationResult`, `Plan`, `PlanEntitlement`, `Subscription`, `SubscriptionEvent`, `SaasInvoice`, `SaasPaymentAttempt`, `UsageCounter`, `PlatformUser`, `PlatformRole`, `OrganizationMember`, `SupportAccessGrant`, `PlatformFeatureFlag`, `PlatformAuditLog`.

### PLATFORM_SHARED (requires explicit design before enabling)
`Attachment` / media objects: metadata rows are TENANT; object-storage keys must be tenant-prefixed (`{organizationId}/...`) with signed access for private evidence. Blocked on object-storage strategy decision (owner-blocked). Until then uploads remain tenant-local metadata with tenant-scoped keys enforced at the storage boundary.

## Singleton/global inventory that becomes tenant-local

`CommerceSettings(id='default')`, `CodVerificationPolicy(id='default')`, delivery zone table, coupon configuration env (`CHECKOUT_COUPONS_JSON`) → must become tenant DB config, storefront support contacts/policies, order reference prefix, wallet provider instructions. In database-per-tenant these are naturally isolated; any code reading them must do so through resolved tenant context only.

## Unique constraints becoming tenant-local by separation

Slug/uniqueness concerns (`Product.slug`, `Brand.slug/name`, `Category.slug`, `OrganizationMember` emails, `SavedCart.shareToken`, `Order.reference`, `merchantTransactionId`, courier consignment IDs) are automatically scoped per database after migration. The remaining cross-plane uniqueness obligations live in the control plane: organization slug, active domain hostname, provisioning idempotency keys, SaaS invoice numbers.
