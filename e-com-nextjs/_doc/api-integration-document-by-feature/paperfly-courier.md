Browser task: "Paperfly Merchant Portal API Exploration"
Viewed paperfly.adapter.ts:1-172
Edited paperfly.adapter.ts
Ran command: `pnpm test src/features/shipping`
Ran command: `pnpm run build`

I have logged into the **Paperfly Go** merchant portal (`go.paperfly.com.bd`), retrieved the official Developer Guide & API specs for account `c180028`, and updated the `PaperflyAdapter` in `ferio-nest-prisma`.

---

### 📋 Extracted Paperfly Go Integration Details

#### 1. **Authentication & Headers**
- **Base URL**: `https://api.paperfly.com.bd`
- **Auth Strategy**: HTTP Basic Auth (`Basic base64(PAPERFLY_USERNAME:PAPERFLY_PASSWORD)`)
- **Required Header**: `paperflykey: Paperfly_~La?Rj73FcLm`
- **Merchant ID**: `C-1-80028`

#### 2. **API Endpoints & Payload Structure**

| Action | HTTP Method | Endpoint Path | Payload / Notes |
| :--- | :---: | :--- | :--- |
| **New Order Placement** | `POST` | `/merchant/api/service/new_order_v2.php` | `{ merchantOrderReference, storeName, productBrief, packagePrice, max_weight, customerName, customerAddress, customerPhone }` |
| **Exchange Order** | `POST` | `/merchant/api/service/new_order_v2.php` | Includes `orderType: "Exchange"`, `exchangeDescription`, `exchangePrice`, `exchangeWeight` |
| **Order Tracking** | `POST` | `/API-Order-Tracking` | `{ ReferenceNumber: "<merchantOrderReference>" }` |
| **Order Cancellation** | `POST` | `/api/v1/cancel-order` | `{ order_id: "<merchantOrderReference>" }` |

#### 3. **Supported Webhook Events**
- `parcel.created`, `parcel.invoiced`, `parcel.cancelled`
- `parcel.picked_up`, `parcel.in_transit`, `parcel.received_at_point`
- `parcel.assigned_for_delivery`, `parcel.delivered`, `parcel.partial`, `parcel.exchange`, `parcel.on_hold`
- `parcel.return`, `parcel.return_transit`, `parcel.return_to_merchant`

---

### 🛠️ Updates Implemented in Codebase

1. **`PaperflyAdapter` (`src/features/shipping/adapters/paperfly.adapter.ts`)**:
   - Updated endpoint to official `POST /merchant/api/service/new_order_v2.php`.
   - Formatted request body to match Paperfly's exact schema (`merchantOrderReference`, `productBrief`, `packagePrice`, `max_weight`, `customerName`, `customerAddress`, `customerPhone`).
   - Updated tracking lookup to `POST /API-Order-Tracking`.
   - Updated tracking URL structure to `https://go.paperfly.com.bd/tracking/:trackingNumber`.

2. **Environment Variables**:
   Add to `.env` file when enabling Paperfly:
   ```env
   PAPERFLY_BASE_URL="https://api.paperfly.com.bd"
   PAPERFLY_USERNAME="c180028"
   PAPERFLY_PASSWORD="1277"
   PAPERFLY_KEY="Paperfly_~La?Rj73FcLm"
   PAPERFLY_STORE_NAME="Ferio E-Commerce"
   ```

---

### 🧪 Verification
- **Unit Tests**: Executed `pnpm test src/features/shipping` — **All test suites passed**.
- **Backend Build**: Executed `pnpm run build` — **Exit code 0 (Compiled successfully)**.