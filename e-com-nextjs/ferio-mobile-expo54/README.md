# Ferio Mobile — Expo SDK 54 compatibility build

This variant is pinned to **Expo SDK 54 / React Native 0.81.5 / React 19.1.0** so it can run with the SDK 54-compatible Expo Go on Android.

## Install / reset dependencies

```bash
rm -rf node_modules .expo
rm -f package-lock.json yarn.lock pnpm-lock.yaml
pnpm install
pnpm exec expo install --fix
pnpm exec expo-doctor
pnpm start -- --clear
```

If your Android phone has an even older Expo Go (SDK 53/52/etc.), this project will still be too new; install the SDK 54 Expo Go APK or tell us the exact Expo Go SDK and the project can be pinned further back.

---

# Ferio Mobile — React Native + Expo

A native customer application rebuilt screen-by-screen against the public `ferio-customer-web` Next.js storefront.

## Design parity target
The mobile implementation mirrors the current Ferio web design language rather than the older generic starter:
- Inter/system sans hierarchy
- `#111114` ink, `#6e6e73` secondary text, `#e8e8ea` lines, `#fafafa` surfaces
- 10px product/card radii and pill actions
- restrained white/black/gray layout
- product-first 4:5 imagery
- category → product → price hierarchy matching the web ProductCard
- native version of the large editorial hero showcase
- thin dividers, direct copy, no decorative template chrome
- large black `f e r i o` footer signature

## Screen mapping
- Web `/` → mobile Home: hero showcase, categories, featured, product request, deals, latest, best sellers, flash-sale section
- Web `/products` → Shop: search + category pills + 2-column product grid
- Web `/products/[slug]` → Product detail: 4:5 media, thumbnails, category/name/brand, condition, price, variants, COD/delivery/returns, add-to-cart and content placeholders
- Web `/cart` → Cart: server-style hierarchy, quantity pill, line total, subtotal and checkout CTA
- Web `/checkout` → Checkout UI: Bangladesh delivery fields, COD/prepaid selection, separate consent toggles, summary
- Web `/order-confirmation` → native confirmation screen
- Web `/track` → native tracking form + staged timeline UI
- Web `/support` → native support screen
- Web account surfaces → native Account tab

## Important backend boundary
The website stores its opaque guest cart token in an HTTP-only `ferio_cart` cookie. A native app should **not** fake that browser/BFF behavior. Add a NestJS mobile guest-session/cart contract, persist the opaque credential in secure device storage, and keep server-side price, inventory, delivery-fee, idempotency and COD/call-verification logic authoritative.

## Setup
```bash
cp .env.example .env
pnpm install
pnpm exec expo install --fix
pnpm start
```

Set:
```env
EXPO_PUBLIC_FERIO_API_URL=https://your-api.example.com
```

For a NestJS server running on your Linux PC, use the PC LAN IP instead of `localhost`, e.g. `http://192.168.0.10:6733`.

## Next production integrations
1. Mobile guest cart/session token
2. Checkout delivery/payment-options + preview endpoints
3. Configurable COD confirmation-call rule
4. Customer authentication with secure storage
5. Order placement/idempotency
6. Real tracking endpoint
7. Returns/support/account APIs
8. Push notification registration and WhatsApp deep links
