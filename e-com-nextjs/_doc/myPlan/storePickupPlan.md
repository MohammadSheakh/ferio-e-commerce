# Store Pickup (Click & Collect) Implementation Plan

## 🎯 Overview
Implement physical Store Pickup (Click & Collect) functionality across the Ferio platform (`ferio-nest-prisma`, `ferio-admin`, `ferio-customer-web`). This allows customers to select a physical store location for pickup, view real-time store stock availability, pick a preferred date & time window, coordinate pickup scheduling with store admins when items require hub transfer, and complete securely via a 6-digit OTP at the store counter.

---

## 🏗️ Architectural Changes

### 1. Database Schema (`ferio-nest-prisma`)
- **`Warehouse` Model Extension**:
  - `isStore: Boolean @default(false)`
  - `phone: String?`
  - `email: String?`
  - `district: String?`
  - `area: String?`
  - `address: String?`
  - `latitude: Float?`
  - `longitude: Float?`
  - `operatingHours: String?` (e.g. "10:00 AM - 08:00 PM")
  - `operatingDays: String?` (e.g. "Sat - Thu")
  - `pickupInstructions: String?`

- **Enums**:
  - `DeliveryMethod`: `HOME_DELIVERY`, `STORE_PICKUP`
  - `StorePickupStatus`: `NOT_APPLICABLE`, `CHECKING_AVAILABILITY`, `AVAILABLE_IN_STORE`, `TRANSFER_REQUIRED`, `IN_TRANSFER`, `READY_FOR_PICKUP`, `SCHEDULED_BY_CUSTOMER`, `COMPLETED`, `CANCELLED`
  - `CheckoutPaymentMethod`: Add `PAY_AT_STORE`

- **`CheckoutDraft` & `Order` Models**:
  - `deliveryMethod: DeliveryMethod @default(HOME_DELIVERY)`
  - `pickupStoreId: String?` (relation to `Warehouse`)
  - `preferredPickupDate: DateTime?`
  - `preferredPickupSlot: String?`
  - `storePickupStatus: StorePickupStatus @default(NOT_APPLICABLE)`
  - `storePickupOtp: String?`
  - `customerPickupNotes: String?`

---

## 💻 Backend Implementation (`ferio-nest-prisma`)

1. **Store Locations Module (`src/features/store-locations`)**:
   - `StoreLocationsController` & `StoreLocationsService`:
     - Admin Endpoints: `GET /api/v1/admin/store-locations`, `POST /api/v1/admin/store-locations`, `PATCH /api/v1/admin/store-locations/:id`, `DELETE /api/v1/admin/store-locations/:id`
     - Public/Customer Endpoints: `GET /api/v1/store-locations`, `POST /api/v1/store-locations/check-availability` (checks inventory stock per variant for chosen store)
2. **Checkout & Order Flow Upgrade**:
   - Update `CheckoutService` & `OrderService` to support `STORE_PICKUP` delivery method.
   - When `STORE_PICKUP` is selected, delivery fee is ৳0.
   - Real-time inventory check initializes `storePickupStatus` to `AVAILABLE_IN_STORE` if store has stock, or `TRANSFER_REQUIRED` if hub transfer is required.
   - Support customer pickup scheduling endpoint `PATCH /api/v1/orders/:id/store-pickup/schedule`.
   - Support admin pickup handover endpoint `POST /api/v1/admin/orders/:id/store-pickup/handover` (verifies 6-digit OTP).

---

## 🖥️ Admin Dashboard (`ferio-admin`)

1. **Store Locations Management (`/dashboard/settings/stores`)**:
   - UI to create, edit, activate/deactivate stores, specify address, operating hours, operating days, and phone numbers.
2. **Order Details Page (`/dashboard/orders/[id]`)**:
   - Displays "Store Pickup" badge & selected store details.
   - Shows store availability state (`In Stock at Store` vs `Hub Transfer Required`).
   - Action buttons: "Mark Transfer Shipped", "Mark Ready for Pickup", "Verify Pickup OTP & Hand Over Product".

---

## 🌐 Customer Web (`ferio-customer-web`)

1. **Checkout Page (`/checkout`)**:
   - Tab switcher for "📦 Home Delivery" vs "🏪 Pickup from Store".
   - Store selector with real-time stock availability badge ("In Stock for Immediate Pickup" vs "Store Collection in 1-2 days").
   - Pickup Date & Time slot picker.
   - Payment method toggle (Prepaid vs Pay at Store).
2. **Order Confirmation & Tracking**:
   - Shows store address, operating hours, pickup instructions, and 6-digit OTP code.
   - Interactive pickup scheduling form allowing customers to update their available date & time to collect the product.
