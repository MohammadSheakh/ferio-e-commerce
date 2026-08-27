Edited cheap-maintainable-analytics.md
Viewed cheap-maintainable-analytics.md:1-19
Ran command: `find ferio-nest-prisma/prisma -type f`
Viewed storefrontAnalytics.prisma:1-27
Searched for "analytics"
Viewed storefront-analytics.service.ts:1-107
Viewed storefront-analytics.controller.ts:1-28
Ran command: `find ferio-admin-dashboard/ferio-admin/app/dashboard -name "analytics" -o -name "*analytics*"`
Viewed package.json:1-26
Ran command: `npm install @next/third-parties`
Viewed package.json:1-26
Edited package.json
Viewed layout.tsx:1-61
Viewed PageTracker.tsx:1-59
Searched for "Permissions"
Viewed permissions.constants.ts:1-74
Edited storefront-analytics.service.ts
Viewed storefront-analytics.controller.ts:1-28
Edited storefront-analytics.controller.ts
Edited analytics.ts
Edited route.ts
Viewed layout.tsx:1-61
Edited layout.tsx
Edited layout.tsx
Viewed page.tsx:1-156
Viewed ProductViewAnalytics.tsx:1-16
Viewed storefront-analytics.ts:1-62
Edited storefront-analytics.ts
Viewed route.ts:1-16
Edited route.ts
Edited page.tsx
Viewed Sidebar.tsx:1-329
Edited Sidebar.tsx
Ran command: `npm run build`
Ran command: `npm install @next/third-parties --legacy-peer-deps`
Ran command: `ls -la ferio-customer-web/node_modules/@next/third-parties`
Ran command: `ls -la`
Ran command: `pnpm --version`
Ran command: `pnpm add @next/third-parties`
Ran command: `pnpm add @next/third-parties --store-dir /home/chillpc/snap/code/254/.local/share/pnpm/store/v3`
Ran command: `npm run build`
Viewed layout.tsx:1-25
Edited layout.tsx
Ran command: `npm run build`
Viewed storefront-analytics.ts:30-50
Viewed storefront-analytics.ts:38-60
Edited storefront-analytics.ts
Ran command: `npm run build`
Ran command: `npm run build`
Ran command: `npm run build`
Viewed catalog.prisma:1-250
Viewed order.prisma:1-325
Viewed storefront-analytics.service.ts:160-205
Edited storefront-analytics.service.ts
Ran command: `npm run build`

I have fully implemented the architecture outlined in **`cheap-maintainable-analytics.md`**.

---

### Key Implementations

#### 1. Customer Web (`ferio-customer-web`) — GA4 & Event Ingestion
* **Google Analytics 4 Setup**: Installed `@next/third-parties` and configured `<GoogleAnalytics />` in `app/layout.tsx` (using `NEXT_PUBLIC_GA_ID`).
* **Unified Client Event Tracking (`lib/analytics.ts` & `lib/storefront-analytics.ts`)**:
  * Added `trackEvent` & `trackStorefrontEvent` helper utilities.
  * Dispatches GA4 custom events (`view_item`, `search`, `add_to_cart`, `filter`) when `gtag` is available.
  * Asynchronously posts privacy-safe event payloads to `/api/storefront-analytics/events` ("fire-and-forget" with zero page load impact).
* **BFF Proxy (`app/api/storefront-analytics/events/route.ts`)**: Securely routes customer events to the NestJS backend.

---

#### 2. Backend Engine (`ferio-nest-prisma`) — Privacy-Safe DB Analytics
* **`StorefrontAnalyticsService` Enhancements**:
  * `getTopSearches`: Aggregates top search terms over configurable timeframe (7/30/90 days).
  * `getZeroResultSearches`: Identifies queries where customers found 0 matching products (highlighting missing inventory demand).
  * `getViewedButNotPurchased`: Analyzes product view counts against actual `OrderItem` purchases to calculate conversion rates and isolate high-view unsold items.
  * `getAnalyticsOverview`: Calculates daily revenue trends, order totals, and conversion funnel metrics (Views → Cart → Checkout → Paid).
* **Admin Endpoint (`GET /storefront-analytics/dashboard`)**: Secured with `AuthGuard`, `RolesGuard`, and `Permissions(PERMISSIONS.REPORTS_READ)`.

---

#### 3. Admin Dashboard (`ferio-admin-dashboard`) — Interactive Analytics Page
* **BFF API Route (`/api/analytics/dashboard`)**: Connects Admin Next.js app to backend analytics endpoint.
* **Analytics Page (`/dashboard/analytics`)**:
  * **Metric Stat Cards**: Delivered Revenue (BDT), Total Orders, Product Views, Searches, and Cart Additions.
  * **Revenue Trend Chart**: Visual breakdown of daily revenue over 7, 30, or 90 days.
  * **Conversion Funnel Breakdown**: Product Views (100%) → Add to Cart → Checkout Drafts → Paid Orders.
  * **Demand Insights**: Top searched keywords alongside zero-result search warnings.
  * **Pricing & Conversion Table**: Most viewed items with conversion rates.
* **Sidebar Integration**: Added **Analytics** link in `Sidebar.tsx`.

---

### Verification & Build Results
* `ferio-customer-web`: `npm run build` — **Passed (0 errors)**
* `ferio-admin-dashboard`: `npm run build` — **Passed (0 errors)**
* `ferio-nest-prisma`: `npm run build` — **Passed (0 errors)**

## Cheap + Maintainable Analytics — তোমার জন্য Best Approach

আগে honest কথা বলি:

```
❌ তোমার নিজে data pipeline বানানোর দরকার নেই
❌ Kafka, Spark, ClickHouse — এগুলো এখন overkill
✅ Free tools আছে যেগুলো তোমার সব কাজ করে দেবে
✅ তোমার শুধু event গুলো পাঠাতে হবে, বাকি সব ওরা করবে
```

---

## তুমি আসলে কী track করতে চাও

```
১. Product detail page এ কে গেছে, কতক্ষণ ছিল
২. Search এ কী keyword দিয়েছে
৩. Cart এ add করেছে কিনা
৪. Checkout পর্যন্ত গেছে কিনা
৫. কোথায় drop করেছে (funnel)
৬. কোন product বেশি দেখা হচ্ছে কিন্তু কেনা হচ্ছে না
```

এই সব কিছুর জন্য **একটাও নিজে বানাতে হবে না।**

---

## Recommended Stack — Completely Free

```
Google Analytics 4 (GA4)     → user behavior, page views, search
+ তোমার DB (PostgreSQL)       → order, revenue, business data  
+ Admin dashboard             → দুটো মিলিয়ে দেখাও
```

**Cost: ৳০**
**Maintenance: প্রায় শূন্য**

---

## Part 1 — Google Analytics 4 Setup

### Next.js এ install

```bash
npm install @next/third-parties
```

```typescript
// app/layout.tsx
import { GoogleAnalytics } from '@next/third-parties/google'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>{children}</body>
      <GoogleAnalytics gaId="G-XXXXXXXXXX" />
    </html>
  )
}
```

এটুকু করলেই GA4 automatically track করবে:
```
✅ কোন page এ কতজন গেছে
✅ কতক্ষণ ছিল
✅ কোথা থেকে এসেছে (Facebook ad, Google, direct)
✅ Mobile vs Desktop
✅ নতুন vs পুরনো visitor
```

---

## Part 2 — Custom Events (তোমার specific tracking)

তোমার Next.js frontend থেকে এই events পাঠাবে:

```typescript
// lib/analytics.ts
export const trackEvent = (eventName: string, params: Record<string, any>) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, params);
  }
};
```

### Product Detail Page View

```typescript
// app/products/[slug]/page.tsx
import { trackEvent } from '@/lib/analytics';

useEffect(() => {
  trackEvent('view_item', {
    item_id:       product.id,
    item_name:     product.name,
    item_category: product.category.name,
    price:         product.price,
    currency:      'BDT',
  });
}, [product]);
```

### Search Tracking

```typescript
// SearchBar component
const handleSearch = (query: string) => {
  trackEvent('search', {
    search_term: query,   // GA4 automatically এটা collect করে
  });
};
```

### Add to Cart

```typescript
const handleAddToCart = (product) => {
  trackEvent('add_to_cart', {
    item_id:   product.id,
    item_name: product.name,
    price:     product.price,
    currency:  'BDT',
    quantity:  1,
  });
};
```

### Checkout Funnel

```typescript
// Checkout page এ
trackEvent('begin_checkout', {
  value:    cartTotal,
  currency: 'BDT',
  items:    cartItems.map(i => ({
    item_id:   i.product.id,
    item_name: i.product.name,
    price:     i.product.price,
    quantity:  i.quantity,
  })),
});

// Payment complete হলে
trackEvent('purchase', {
  transaction_id: order.orderNumber,
  value:          order.total,
  currency:       'BDT',
  items:          orderItems,
});
```

GA4 এই events থেকে automatically বানাবে:
```
✅ Funnel: কতজন product দেখে → cart → checkout → paid
✅ Drop-off: কোথায় বেশি মানুষ চলে যাচ্ছে
✅ Top searched keywords
✅ Most viewed products
✅ Revenue per product
```

---

## Part 3 — তোমার DB তে যা save করবে

GA4 user behavior দেখায়, কিন্তু **business data তোমার DB তে রাখতে হবে।**

### NestJS এ Simple Event Logger

```typescript
// search-log.entity.ts (Prisma)
model SearchLog {
  id        String   @id @default(cuid())
  query     String
  userId    String?  // null = guest
  results   Int      // কতটা result এলো
  clicked   Boolean  @default(false)  // result এ click করেছে কিনা
  clickedId String?  // কোন product এ click করেছে
  createdAt DateTime @default(now())
}

model ProductView {
  id        String   @id @default(cuid())
  productId String
  product   Product  @relation(fields: [productId], references: [id])
  userId    String?
  sessionId String   // anonymous tracking এর জন্য
  source    String?  // "search" | "category" | "home" | "share_link"
  createdAt DateTime @default(now())
}
```

### NestJS Search Endpoint এ Log করো

```typescript
// search.service.ts
async search(query: string, userId?: string): Promise<Product[]> {
  const results = await this.prisma.product.findMany({
    where: {
      OR: [
        { name:        { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
      ],
    },
  });

  // ✅ Async log — search slow করবে না
  this.prisma.searchLog.create({
    data: {
      query,
      userId:  userId || null,
      results: results.length,
    },
  }).catch(console.error); // fire and forget

  return results;
}
```

### Product View Log

```typescript
// products.service.ts
async getProduct(slug: string, userId?: string, sessionId?: string) {
  const product = await this.prisma.product.findUnique({
    where: { slug },
  });

  // ✅ Fire and forget — response slow করবে না
  this.prisma.productView.create({
    data: {
      productId: product.id,
      userId:    userId || null,
      sessionId: sessionId || 'unknown',
    },
  }).catch(console.error);

  return product;
}
```

---

## Part 4 — Admin Dashboard Analytics Queries

এই data দিয়ে তুমি admin dashboard এ দেখাবে:

### Top Searched Keywords

```typescript
// analytics.service.ts
async getTopSearches(days = 30) {
  return this.prisma.searchLog.groupBy({
    by:      ['query'],
    _count:  { query: true },
    orderBy: { _count: { query: 'desc' } },
    take:    20,
    where: {
      createdAt: {
        gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
      },
    },
  });
  // Result: [{ query: "শার্ট", _count: { query: 145 } }, ...]
}
```

### Searches With Zero Results (Important!)

```typescript
async getZeroResultSearches() {
  return this.prisma.searchLog.groupBy({
    by:      ['query'],
    _count:  { query: true },
    where:   { results: 0 },        // কোনো result আসেনি
    orderBy: { _count: { query: 'desc' } },
    take:    20,
  });
  // এই keywords এ product add করলে sale বাড়বে
}
```

### Most Viewed Products (But Not Purchased)

```typescript
async getViewedButNotPurchased() {
  // Product view count
  const views = await this.prisma.productView.groupBy({
    by:      ['productId'],
    _count:  { productId: true },
    orderBy: { _count: { productId: 'desc' } },
    take:    50,
  });

  // Order count
  const orders = await this.prisma.orderItem.groupBy({
    by:      ['productId'],
    _count:  { productId: true },
  });

  const orderMap = new Map(orders.map(o => [o.productId, o._count.productId]));

  // Conversion rate calculate
  return views.map(v => ({
    productId:      v.productId,
    views:          v._count.productId,
    purchases:      orderMap.get(v.productId) || 0,
    conversionRate: ((orderMap.get(v.productId) || 0) / v._count.productId * 100).toFixed(1) + '%',
  })).filter(p => p.purchases === 0); // শুধু যেগুলো কেউ কেনেনি
}
```

### Daily Revenue + Orders

```typescript
async getDailyRevenue(days = 30) {
  return this.prisma.$queryRaw`
    SELECT
      DATE(created_at)  AS date,
      COUNT(*)          AS orders,
      SUM(total)        AS revenue
    FROM orders
    WHERE
      status      = 'DELIVERED'
      AND created_at >= NOW() - INTERVAL '${days} days'
    GROUP BY DATE(created_at)
    ORDER BY date DESC
  `;
}
```

---

## Part 5 — Admin Dashboard এ কী দেখাবে

```
/admin/analytics

┌─────────────────────────────────────────┐
│  Today        This Week    This Month   │
│  ৳৪৫,০০০     ৳২.৮ লাখ    ৳১১ লাখ     │
│  ১২ orders    ৭৮ orders    ৩১২ orders   │
└─────────────────────────────────────────┘

📈 Revenue Chart (last 30 days)
   [Line chart — Recharts দিয়ে]

🔍 Top Searches (last 7 days)
   ১. "শার্ট"          →  ২৩৪ বার  →  product আছে ✅
   ২. "সাদা পাঞ্জাবি"  →  ১৮৯ বার  →  product আছে ✅
   ৩. "কটন প্যান্ট"    →  ১৪৫ বার  →  result নেই ❌ ← add করো

👁️ Most Viewed (not purchased)
   ১. Product A  →  ৪৫৬ views, ০ sales  ← দাম বেশি?
   ২. Product B  →  ২৩৪ views, ০ sales  ← stock নেই?

🛒 Funnel (this month)
   Product viewed  →  ৩,৪৫০
   Add to cart     →    ৮৯০  (২৫.৮%)
   Checkout        →    ৪৫০  (৫০.৬%)
   Purchased       →    ৩১২  (৬৯.৩%)
   Drop-off:       Cart → Checkout তে সবচেয়ে বেশি হারাচ্ছো
```

---

## সব কিছু এক জায়গায় Summary

```
Tool              কী করবে                    Cost
──────────────────────────────────────────────────
GA4               User behavior, funnel       Free
                  Page views, search terms
                  Ad campaign performance

PostgreSQL        Search logs, product views  তোমার DB তেই
(তোমার DB)        Revenue, orders             already আছে

Admin Dashboard   দুটো মিলিয়ে দেখাও         তুমি বানাবে
(Next.js)         Recharts দিয়ে chart

──────────────────────────────────────────────────
Total cost:  ৳০/month
Maintenance: শুধু DB query মাঝেমাঝে optimize
```

---

## যা করতে হবে (Priority Order)

```
Week 1:
  ✅ GA4 account খোলো (free)
  ✅ Next.js এ GoogleAnalytics component add করো
  ✅ view_item, search, add_to_cart events পাঠাও

Week 2:
  ✅ Prisma তে SearchLog + ProductView model add করো
  ✅ Search endpoint এ log করো
  ✅ Product detail API তে log করো

Week 3:
  ✅ Admin dashboard এ analytics page বানাও
  ✅ Top searches, zero results, funnel দেখাও
  ✅ GA4 dashboard link embed করো admin এ
```

এটাই তোমার জন্য **cheapest, easiest to maintain, এবং production-ready** solution। Data engineer বা complex pipeline এর কোনো দরকার নেই এই stage এ।