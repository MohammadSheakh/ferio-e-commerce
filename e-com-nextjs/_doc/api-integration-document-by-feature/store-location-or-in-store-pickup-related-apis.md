

Yes, all API proxy routes and customer web integrations are now properly wired end-to-end:

### 🔗 Integrated API Endpoints & Proxies

#### 1. **Admin Dashboard Proxies (`ferio-admin`)**
- `GET / POST /api/admin/store-locations` → Proxies to NestJS `GET / POST /api/v1/admin/store-locations` (Store outlet management)
- `PATCH / DELETE /api/admin/store-locations/[id]` → Proxies to NestJS `PATCH / DELETE /api/v1/admin/store-locations/:id` (Store updates & status toggles)
- `PATCH /api/orders/[id]/store-pickup/status` → Proxies to NestJS `PATCH /api/v1/admin/orders/:id/store-pickup/status` ("Mark Ready for Pickup")
- `POST /api/orders/[id]/store-pickup/verify-handover` → Proxies to NestJS `POST /api/v1/admin/orders/:id/store-pickup/verify-handover` (6-digit OTP verification)

#### 2. **Customer Web Proxies & Checkout UI (`ferio-customer-web`)**
- `GET /api/store-locations` → Fetches active store locations for customer selection during checkout.
- `POST /api/store-locations/check-availability` → Checks real-time stock status across store stock vs central hub.
- `POST /api/checkout/order` → Updated to support `PAY_AT_STORE` payment option and `STORE_PICKUP` delivery method.

---

### 🛒 Customer Web Checkout UI Enhancements
- Added **Fulfillment Method Selector**:
  - 🚚 **Home Delivery**
  - 🏪 **Pickup from Store (Click & Collect — Free ৳0)**
- Integrated Physical Store selector displaying outlet address, operating hours, phone, and instructions.
- Integrated **Preferred Pickup Date** picker & **Time Slot** selector (`10:00 AM - 01:00 PM`, `02:00 PM - 05:00 PM`, `05:00 PM - 08:00 PM`).

---------------------------------------

Viewed project-progress-57.md:1-524
Edited project-progress-57.md

I have updated `_doc/project-progress-57.md` with the full work details for the **In-Store Pickup (Click & Collect) Logistics & Store Outlets Management System**.

### Summary of Documentation Update in `_doc/project-progress-57.md`:

1. **Database Schema & Model Extensions**:
   - `Warehouse` physical store fields (`isStore`, `phone`, `operatingHours`, `operatingDays`, `address`, `pickupInstructions`).
   - `DeliveryMethod` (`HOME_DELIVERY`, `STORE_PICKUP`) and `StorePickupStatus` enums.
   - 6-digit `storePickupOtp`, `pickupScheduledAt`, `preferredPickupSlot`, `customerPickupNotes`.
   - Seed data for initial store outlets (Dhanmondi, Jamuna Future Park, Uttara).

2. **Backend `StoreLocationsModule` & Fulfillment Engine**:
   - Public store listing & real-time store stock vs central hub availability checks.
   - Admin store outlet CRUD with `AuditService` logging.
   - Checkout ৳0 delivery fee calculations for store pickups & 6-digit OTP generation during order creation.
   - Scheduling, status update (`READY_FOR_PICKUP`), and OTP handover verification endpoints.

3. **Admin Dashboard UI Enhancements**:
   - `Store Outlets 🏪` sidebar navigation link added.
   - `/dashboard/stores`: Store outlets management desk with creation modal, stats, and activate/deactivate controls.
   - `/dashboard/orders/[id]`: Click & Collect panel with store address, pickup preferences, OTP verification display, and 1-click handover verification form.

4. **Testing & Build Verification**:
   - 5/5 unit tests passed in `store-locations.service.spec.ts`.
   - `ferio-nest-prisma` build: **Exit code 0**.
   - `ferio-admin` build: **Exit code 0**.


======================================

Ran command: `pnpm run prisma:seed`
Viewed seed.ts:15-30
Edited seed.ts
Ran command: `pnpm run prisma:seed`
Listed directory features
Viewed checkout.controller.ts:1-79
Edited store-location.dto.ts
Edited store-locations.service.ts
Edited store-locations.controller.ts
Edited store-locations.module.ts
Viewed checkout.service.ts:1-150
Viewed checkout.dto.ts:1-180
Edited checkout.dto.ts
Viewed checkout.service.ts:250-357
Edited checkout.service.ts
Viewed order.service.ts:150-250
Viewed order.service.ts:251-350
Searched for "createFromDraft"
Searched for "checkoutDraft"
Viewed order.service.ts:570-675
Edited order.service.ts
Viewed order.service.ts:1280-1303
Viewed order.service.ts:1300-1310
Edited order.service.ts
Viewed order.controller.ts:1-151
Viewed order.dto.ts:1-165
Edited order.dto.ts
Edited order.dto.ts
Edited order.controller.ts
Viewed order.controller.ts:20-35
Edited order.controller.ts
Viewed app.module.ts:1-76
Edited app.module.ts
Edited store-locations.service.spec.ts
Ran command: `pnpm test src/features/store-locations`
Listed directory dashboard
Viewed page.tsx:1-60
Viewed Sidebar.tsx:1-148
Edited Sidebar.tsx
Edited page.tsx
Viewed page.tsx:1-100
Viewed page.tsx:101-247
Edited page.tsx
Ran command: `pnpm run build`
Viewed audit.service.ts:1-73
Edited checkout.service.ts
Viewed store-locations.service.ts:1-201
Edited store-locations.service.ts
Viewed order.service.ts:530-555
Viewed order.service.ts:510-535
Edited order.service.ts
Viewed order.service.ts:630-700
Edited order.service.ts
Viewed order.service.ts:1330-1420
Edited order.service.ts
Ran command: `pnpm run build`
Ran command: `pnpm run build`
Edited page.tsx
Searched for "getApiUrl"
Edited page.tsx
Edited page.tsx
Ran command: `pnpm run build`

I have completed the end-to-end implementation of the **Pickup from Store (Click & Collect)** logistics feature across the database, backend APIs, and the Admin Dashboard.

---

### 📦 Key Summary of Completed Work

#### 1. **Database Schema Extension (Prisma)**
- Extended `Warehouse` model in `inventory.prisma` to support physical store outlets (`isStore: Boolean`, `operatingHours`, `operatingDays`, `phone`, `email`, `address`, `pickupInstructions`).
- Extended `CheckoutDraft` and `Order` models with Store Pickup lifecycle attributes:
  - `deliveryMethod: DeliveryMethod` (`HOME_DELIVERY` vs `STORE_PICKUP`)
  - `pickupStoreId`: Relation to `Warehouse`
  - `storePickupStatus`: Enum (`NOT_APPLICABLE`, `AVAILABLE_IN_STORE`, `TRANSFER_REQUIRED`, `SCHEDULED_BY_CUSTOMER`, `IN_TRANSFER`, `READY_FOR_PICKUP`, `COMPLETED`, `CANCELLED`)
  - `storePickupOtp`: 6-digit verification code generated at order creation
  - `pickupScheduledAt`, `preferredPickupSlot`, `customerPickupNotes`
- Synchronized database state and ran seeds for physical outlets (Dhanmondi, Jamuna Future Park, Uttara).

#### 2. **Backend `StoreLocationsModule` & Real-Time Availability Engine**
- **Public API (`/api/v1/store-locations`)**: Exposes active store locations with addresses, hours, and instructions for customer checkout selection.
- **Stock Availability Endpoint (`/api/v1/store-locations/check-availability`)**: Performs real-time inventory checks per variant across store stock and central hub (`MAIN`) stock to inform customers if the order is ready for immediate collection or requires a hub transfer.
- **Admin CRUD & Audit Logging (`/api/v1/admin/store-locations`)**: Enables admins to create, update, or deactivate store outlets with full audit trailing (`AuditService`).
- **Checkout & Order Flow Integration**:
  - `CheckoutService.preview`: Set `deliveryFee = 0` when `STORE_PICKUP` is selected and checks stock status.
  - `OrderService.createOrder`: Generates a random 6-digit `storePickupOtp`.
  - Added endpoints:
    - `PATCH /api/v1/orders/:id/store-pickup/schedule`
    - `PATCH /api/v1/admin/orders/:id/store-pickup/status`
    - `POST /api/v1/admin/orders/:id/store-pickup/verify-handover`

#### 3. **Admin Dashboard UI Enhancements (`ferio-admin`)**
- Added **Store Outlets (🏪)** navigation link to the dashboard sidebar.
- Created `app/dashboard/stores/page.tsx` allowing admins to view, add, activate/deactivate, and manage physical store locations.
- Enhanced `app/dashboard/orders/[id]/page.tsx` with a dedicated **Store Pickup (Click & Collect)** section that displays store metadata, customer preferred pickup slot, OTP code, "Mark Ready for Pickup" trigger, and real-time 6-digit OTP verification for store handover.

#### 4. **Testing & Build Verification**
- Created unit tests in `store-locations.service.spec.ts` covering store listing, stock availability calculation, and conflict validation (100% pass rate).
- Verified production builds for both `ferio-nest-prisma` and `ferio-admin` (Clean build with zero errors).