# REDX Courier API Integration Document

This document outlines the official **REDX Developer API** (v1.0.0-beta) specifications and the implementation details inside `ferio-nest-prisma`.

---

## 📋 Official REDX API Specifications

### 1. **Environments & Base URLs**
- **Production Base URL**: `https://openapi.redx.com.bd/v1.0.0-beta`
- **Sandbox Base URL**: `https://sandbox.redx.com.bd/v1.0.0-beta`

### 2. **Authentication**
All REDX OpenAPI requests require a Bearer token passed in the request header:
```http
API-ACCESS-TOKEN: Bearer <your_redx_api_token>
```

---

## 🚀 Key Endpoints & Payload Formats

### 1. **Create Parcel (`POST /parcel`)**
Creates a new parcel in REDX system.

- **URL**: `POST https://openapi.redx.com.bd/v1.0.0-beta/parcel`
- **Headers**:
  - `Content-Type: application/json`
  - `API-ACCESS-TOKEN: Bearer <token>`
- **Request Body**:
```json
{
  "customer_name": "Customer Name",
  "customer_phone": "017XXXXXXXX",
  "delivery_area": "Dhaka",
  "delivery_area_id": 1,
  "customer_address": "House 12, Road 5, Dhanmondi, Dhaka",
  "merchant_invoice_id": "ORD-20260818-1001",
  "cash_collection_amount": "1550",
  "parcel_weight": 500,
  "instruction": "Handle with care",
  "value": 1550
}
```
- **Response**:
```json
{
  "tracking_id": "20A312THJDJ8"
}
```

---

### 2. **Track Parcel (`GET /parcel/track/:tracking_id`)**
Fetches the current status and tracking history of a parcel.

- **URL**: `GET https://openapi.redx.com.bd/v1.0.0-beta/parcel/track/20A312THJDJ8`
- **Headers**: `API-ACCESS-TOKEN: Bearer <token>`

---

### 3. **Delivery Area & Store Lookup**
- `GET /areas` — List all delivery areas
- `GET /areas?district_name=Dhaka` — Filter areas by district
- `GET /pickup/stores` — List merchant pickup locations

---

## 🔔 Webhooks & Status Normalization

### **Webhook Event Payload**
```json
{
  "tracking_number": "20A312THJDJ8",
  "timestamp": "2026-08-18 21:00:00",
  "status": "delivery-in-progress",
  "invoice_number": "ORD-20260818-1001"
}
```

### **Status Mapping in Ferio Architecture**

| REDX Raw Status | Ferio Normalized Status (`OrderShipmentStatus`) |
| :--- | :--- |
| `parcel_created`, `ready-for-delivery`, `pickup_requested` | `CREATED` |
| `picked_up` | `PICKED_UP` |
| `in_transit` | `IN_TRANSIT` |
| `received_at_hub` | `AT_HUB` |
| `out_for_delivery`, `delivery-in-progress` | `OUT_FOR_DELIVERY` |
| `delivered`, `paid` | `DELIVERED` |
| `delivery_failed`, `agent-hold` | `DELIVERY_FAILED` |
| `returning`, `agent-returning` | `RETURN_IN_PROGRESS` |
| `returned` | `RTO` |
| `cancelled` | `CANCELLED` |

---

## 🛠️ Codebase Implementation Details

1. **Adapter Location**: `ferio-nest-prisma/src/features/shipping/adapters/redx.adapter.ts`
2. **Status Mapper**: `ferio-nest-prisma/src/features/shipping/shipping.util.ts` (`redxStatuses`)
3. **Environment Variables**:
```env
REDX_BASE_URL="https://openapi.redx.com.bd/v1.0.0-beta"
REDX_API_TOKEN="your_redx_bearer_token"
REDX_WEBHOOK_SECRET="your_redx_webhook_secret"
```

---

## 🧪 Verification & Health Check
- **Unit Tests**: `pnpm test src/features/shipping` (**12/12 test suites passed**)
- **Build Status**: `pnpm run build` (**Clean compile, Exit Code 0**)


================================================================


Edited paperfly-courier.md
Viewed paperfly-courier.md:45-57
Viewed redx.adapter.ts:1-160
Read URL: https://redx.com.bd/developer-api/
Viewed content.md:1-26
Browser task: "Reading REDX Developer API Docs"
Viewed shipping.util.ts:1-160
Edited shipping.util.ts
Edited redx.adapter.ts
Viewed redx.adapter.ts:15-40
Viewed redx.adapter.ts:150-177
Edited redx.adapter.ts
Edited redx.adapter.ts
Ran command: `pnpm test src/features/shipping`
Ran command: `pnpm run build`
Edited redx-courier.md

I have reviewed the official **REDX Developer API** documentation (`https://redx.com.bd/developer-api/`), verified our implementation against the OpenAPI v1.0.0-beta specs, updated the codebase (`RedxAdapter` & status normalizer), and created a comprehensive documentation file at `_doc/api-integration-document-by-feature/redx-courier.md`.

---

### 📋 Key Insights from REDX OpenAPI v1.0.0-beta

#### **1. Endpoints & Authentication**
- **Base URL**: `https://openapi.redx.com.bd/v1.0.0-beta` (Sandbox: `https://sandbox.redx.com.bd/v1.0.0-beta`)
- **Header**: `API-ACCESS-TOKEN: Bearer <jwt_token>`

| Action | Method | Endpoint Path | Notes |
| :--- | :---: | :--- | :--- |
| **Create Parcel** | `POST` | `/parcel` | Expects `customer_name`, `customer_phone`, `delivery_area`, `delivery_area_id`, `customer_address`, `cash_collection_amount`, `parcel_weight`, `merchant_invoice_id`, `value` |
| **Track Parcel** | `GET` | `/parcel/track/:tracking_id` | Fetches real-time parcel movement and status history |
| **Parcel Details** | `GET` | `/parcel/info/:tracking_id` | Detailed parcel breakdown |
| **Update / Cancel**| `PATCH`| `/parcels` | Supports cancellation (`property_name: "status"`, `new_value: "cancelled"`) |
| **Area Lookup** | `GET` | `/areas?district_name=Dhaka` | Retrieves delivery areas by district name |
| **Charge Calculator**| `GET`| `/charge/charge_calculator` | Calculates shipping fee based on weight & delivery area |

---

### 🛠️ Codebase Updates Implemented

1. **`RedxAdapter` (`src/features/shipping/adapters/redx.adapter.ts`)**:
   - Updated Base URL default to `https://openapi.redx.com.bd/v1.0.0-beta`.
   - Updated order creation endpoint to `POST /parcel`.
   - Formatted request body parameters (`cash_collection_amount` in BDT string format, `parcel_weight` in grams).
   - Updated polling/tracking lookup to `GET /parcel/track/:tracking_id`.

2. **Status Normalizer (`src/features/shipping/shipping.util.ts`)**:
   - Mapped REDX webhook statuses (`ready-for-delivery`, `delivery-in-progress`, `delivered`, `agent-hold`, `agent-returning`, `returned`, `paid`) directly into Ferio's `OrderShipmentStatus` enum.

3. **Documentation**:
   - Documented the integration in `_doc/api-integration-document-by-feature/redx-courier.md`.

---

### 🧪 Verification
- **Unit Tests**: Executed `pnpm test src/features/shipping` — **12/12 test suites passed**.
- **Backend Build**: Executed `pnpm run build` — **Exit code 0 (Clean compile)**.