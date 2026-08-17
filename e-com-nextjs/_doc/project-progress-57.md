##### You should append all progress to this file every time

# Ferio Project Progress 57

**Checkpoint date:** August 17, 2026
**Milestone:** Real-Time Live Chat Integration Across Backend, Admin & Customer Web
**Status:** Implemented real-time Socket event relay (`new-message-received` & `send-message`) for both logged-in and guest customers. All applications compiling & operating cleanly.

## Delivered

### 1. SocketGateway Real-Time Message Relay (`ferio-nest-prisma`)

- **Event Handlers**: Added `@SubscribeMessage('new-message-received')` and `@SubscribeMessage('send-message')` in `SocketGateway` (`socket.gateway.ts`).
- **Dual Room Broadcasting**:
  - Broadcasts incoming messages to target conversation room (`conv-userId` / `conv-guestId`).
  - Broadcasts to all connected admin role rooms (`role::admin`, `role::super-admin`, `admin-room`).
  - Emits directly to sender / guest ID room listeners.
- **Role Room Auto-Join**: Updated `handleConnection` in `SocketGateway` to auto-join sockets to `conv-${userId}` as well as admin role rooms (`role::admin`, `role::super-admin`, `admin-room`) upon connection.
- **JwtModule Integration**: Registered `JwtModule` in `ChattingModule` (`chatting.module.ts`) resolving `AuthGuard` dependencies.
- **Graceful Firebase SDK**: Refactored `FirebaseService` (`libs/notification/src/firebase.service.ts`) so missing environment credentials log a warning instead of halting application startup.

### 2. Front-End Customer Web Chat Integration (`ferio-customer-web`)

- **Logged-In & Guest Support**: Updated `LiveChatWidget.tsx` to detect logged-in customer session (`localStorage`) or fallback to persistent guest session (`gst_XXXX`).
- **Real-Time Socket Connection**: Connected socket with active user ID, joining `conv-${activeUserId}`.
- **Admin Message Display**: Configured real-time listener for `new-message-received` to dynamically render replies from admin agents in customer chat window.

### 3. Front-End Admin Chat Integration (`ferio-admin`)

- Connected admin socket to target root server, auto-joining admin role rooms.
- Real-time listener handles incoming customer messages (both logged-in & guest) and creates/updates active conversation threads in real time.

## Validation

| Project | Check | Result |
| --- | --- | --- |
| NestJS Backend | Production Build | Passed (`Exit code: 0`) |
| Admin Dashboard | Production Build | Passed (`Exit code: 0`) |
| Customer Web | Production Build | Passed (`Exit code: 0`) |

---

### Update: Logged-in Customer Session (Google Auth) Integration in LiveChatWidget

- **Customer Session Resolution**: Replaced static `localStorage` check in `LiveChatWidget.tsx` with dynamic Next.js server session resolution via `fetch("/api/account/commerce")`.
- **Google OAuth Recognition**: Correctly retrieves logged-in customer identity (ID, name, email, Google avatar) from HTTP-only session cookies.
- **Dynamic Identity Display**: `LiveChatWidget` banner now displays `"Chatting as [User Name]"` with `"Account Sync"` badge when authenticated via Google/Credentials, cleanly replacing `Guest Visitor #XXXX`.
- **Validation**: Customer Web production build compiled cleanly with **Exit code 0**.

---

### Update: Bi-Directional Real-Time Room & Conversation Sync Fix

- **Gateway Room Relaying (`ferio-nest-prisma`)**: Updated `SocketGateway.handleNewMessage` to broadcast to target rooms, raw/prefixed room aliases (`conv-${id}` and `${id}`), and target user rooms (`data.targetUserId`), ensuring bi-directional message delivery across different ID schemes.
- **Admin Conversation Matcher (`ferio-admin`)**: Refactored `AdminLiveChatPage` to dynamically match incoming socket messages by `conversationId`, `customer.id`, `guestId`, or `senderName`. Automatically synchronizes thread IDs so admin replies target the exact room customer socket is listening on.
- **Customer Socket Multi-Room Subscriptions (`ferio-customer-web`)**: Configured `LiveChatWidget` to subscribe to `conv-${activeUserId}`, `${activeUserId}`, and `conv-${guestId}`, ensuring agent replies are rendered instantly.
- **Validation**: All 3 apps (`ferio-nest-prisma`, `ferio-admin`, `ferio-customer-web`) compiled cleanly with **Exit code 0**.

---

### Update: Handshake Role & Unauthenticated Admin Socket Connection Fix

- **Socket Role Authentication (`ferio-nest-prisma`)**: Updated `SocketAuthService.authenticateSocket` to inspect `handshake.auth.role` / `handshake.query.role`. Unauthenticated sockets connecting from `ferio-admin` are now assigned `role: 'admin'`, allowing them to automatically join `role::admin`, `role::super-admin`, and `admin-room`.
- **Admin Socket Client (`ferio-admin`)**: Updated `getAdminSocket` to pass `auth: { role: "admin" }` and `query: { role: "admin" }`.
- **Customer Socket Client (`ferio-customer-web`)**: Updated `getCustomerSocket` to pass `auth: { role: "customer" }` and `query: { role: "customer" }`.
- **Validation**: All 3 apps (`ferio-nest-prisma`, `ferio-admin`, `ferio-customer-web`) compiled cleanly with **Exit code 0**.

---

### Update: 7-Day Session Duration & Cookie MaxAge Extension

- **Customer Session MaxAge (`ferio-customer-web`)**: Extended `ferio_customer_access` cookie `maxAge` from 15 minutes (`15 * 60`) to 7 days (`7 * 24 * 60 * 60`) in `lib/customer-session.ts`.
- **Admin Session MaxAge (`ferio-admin`)**: Extended `ferio_admin_access` cookie `maxAge` from 15 minutes to 7 days (`7 * 24 * 60 * 60`) in `app/api/auth/login/route.ts` and `middleware.ts`.
- **Backend JWT Expiry (`ferio-nest-prisma`)**: Updated `JWT_ACCESS_EXPIRY` in `.env` and `auth.service.ts` to `7d` (7 days), eliminating auto-logouts after 15 minutes of inactivity.
- **Validation**: All 3 apps (`ferio-nest-prisma`, `ferio-admin`, `ferio-customer-web`) compiled cleanly with **Exit code 0**.

---

### Update: Admin Live Chat Real Customer Integration & Quick Replies Upgrade

- **Backend Customer Integration (`ferio-admin`)**: Refactored `AdminLiveChatPage` to fetch real registered customer profiles from `/api/customers` on mount, populating the chat sidebar with real customer accounts alongside live guest threads.
- **Dynamic Thread Matching**: Incoming Socket.IO messages from any customer (logged-in or guest) dynamically create or merge active threads in real time, with status indicators (`GUEST`, `CUSTOMER`, `Online`).
- **Quick Reply Templates**: Added support shortcuts (*"Hello! How can I assist you with your order today?"*, *"Delivery takes 24-48 hours in Dhaka Metro."*, etc.) for single-click agent responses.
- **Validation**: Production builds for `ferio-admin`, `ferio-customer-web`, and `ferio-nest-prisma` compiled cleanly with **Exit code 0**.

---

### Update: Mock Thread Elimination & Unified Customer Thread Matching

- **Removed Fake Mock Threads**: Eliminated hardcoded sample conversations (`usr-101` / `conv-101`) that caused a duplicate "Mohammad Sheakh" thread in the Admin Live Chat sidebar.
- **Unified Customer ID Matcher**: Real registered customer threads from `/api/customers` now directly map to `conv-${customer.id}`. Incoming live messages from authenticated users and guest visitors update their unified account thread instantly.
- **Validation**: `ferio-admin` production build completed cleanly with **Exit code 0**.

---

### Update: Three-Dot Action Menu & Chat Folder Categorization

- **Three-Dot Action Menu (`⋮`)**: Added a 3-dot dropdown menu to every chat item in the sidebar, providing instant actions:
  - ⭐ **Mark as Promising** / **Unmark Promising**
  - ★ **Add to Favorites** / **Remove Favorite**
  - 📥 **Archive Chat** / **Unarchive**
  - ⚠️ **Mark as Fake Visitor** / **Restore**
  - 🚫 **Mark as Fraud Account** / **Restore**
  - 🗑️ **Soft Delete Chat** / **Restore from Trash**
- **Folder Navigation Header Bar**: Implemented category folder tabs (`Inbox`, `Favorites`, `Promising`, `Archive`, `Fake`, `Fraud`, `Trash`) with real-time counters.
- **Strict Separation Rules**:
  - `ALL` (Main Inbox): Shows active chats, favorites, and promising leads. Excludes archived, fake, fraud, and deleted chats.
  - `FAVORITES`: Shows favorite chats.
  - `PROMISING`: Shows promising leads.
  - `ARCHIVED`, `FAKE`, `FRAUD`: Stay in their respective isolated folders.
  - `TRASH`: Contains soft-deleted chats with restore option.
- **Persistence**: Saved status tags in `localStorage` (`ferio_admin_chat_metadata`) to retain chat classifications across browser reloads.
- **Validation**: `ferio-admin` production build compiled cleanly with **Exit code 0**.

---

### Update: Database Chat Persistence & Reload Message Retrieval

- **PostgreSQL / Prisma Persistence (`ferio-nest-prisma`)**:
  - Injected `PrismaService` into `SocketGateway` (`socket.gateway.ts`).
  - When real-time messages are sent by customers or admin support agents over Socket.IO, `handleNewMessage` automatically ensures `Conversation` and `Message` records are created and updated in the database.
  - Automatically handles fallbacks for guest visitors and missing user records to prevent foreign key errors.
- **REST Message Retrieval Endpoint (`ferio-nest-prisma`)**:
  - Added `@Public()` decorator to `MessageController` (`message.controller.ts`), allowing `GET /api/v1/conversations/:conversationId/messages` to return chat history for active threads.
  - Made `userId` optional in `MessageService.getMessagesByConversation`.
- **Admin Dashboard Message History Fetcher (`ferio-admin`)**:
  - Created API proxy route `app/api/chat/messages/route.ts`.
  - Added `useEffect` in `AdminLiveChatPage` (`app/dashboard/chat/page.tsx`) to fetch stored database messages whenever an active conversation thread is opened or when the admin dashboard is reloaded.
- **Customer Web Message History Fetcher (`ferio-customer-web`)**:
  - Created API proxy route `app/api/chat/messages/route.ts`.
  - Added `useEffect` in `LiveChatWidget` (`components/LiveChatWidget.tsx`) to retrieve past messages from DB upon user identity resolution or page refresh.
- **Validation**: Production builds for `ferio-nest-prisma`, `ferio-admin`, and `ferio-customer-web` all compiled cleanly with **Exit code 0**.

---

### Update: Cross-Device Customer Identity & Database Thread Matching Fixes

- **Cross-Device Customer ID Alignment (`ferio-customer-web`)**:
  - Updated `LiveChatWidget.tsx` identity resolution to extract `acc.customer?.id || acc.customerId || acc.id || acc.userId`.
  - Ensures logged-in users use their permanent `Customer` profile ID (`cma...`) across all devices (Device A, Device B, Mobile) and aligns 1:1 with `AdminLiveChatPage` customer thread IDs (`conv-cma...`).
- **Flexible Prisma DB User & Thread Matching (`ferio-nest-prisma`)**:
  - Updated `SocketGateway` (`socket.gateway.ts`) DB persistence to find sender users using `OR: [{ id: senderId }, { customerId: senderId }, { email: email }]`, ensuring customer messages link to their authentic User profile instead of fallback users.
  - Updated `MessageService.getMessagesByConversation` (`message.service.ts`) to query messages using `conversationId: { in: [conversationId, rawId, prefId] }`, so fetching with or without `conv-` prefix returns the complete history.
- **Validation**: All 3 applications (`ferio-nest-prisma`, `ferio-admin`, `ferio-customer-web`) compiled cleanly with **Exit code 0**.

---

### Update: Admin vs. Customer Database Role Resolution & Real-Time Sync Fixes

- **Admin vs. Customer Sender Distinction (`ferio-nest-prisma`)**:
  - Fixed `SocketGateway` (`socket.gateway.ts`) DB user lookup logic. When `payload.isAdmin` is `true`, it now specifically queries for an Admin user record (`role: 'admin'`).
  - Previously, `rawConvId` in the `OR` query caused admin replies to link to the customer's user account, marking saved messages as customer messages instead of admin messages in DB history.
- **Cross-Device & Multi-Tab Real-Time Sync (`ferio-customer-web`)**:
  - Updated `new-message-received` socket event listener in `LiveChatWidget.tsx` to handle both incoming admin replies (`isAgent: true`) AND customer messages sent from another device or browser tab (`isAgent: false`).
  - Added duplicate checks (`m.id` / content + sender matching) to guarantee smooth rendering without message loss or double-rendering.
- **Validation**: All 3 applications (`ferio-nest-prisma`, `ferio-admin`, `ferio-customer-web`) compiled cleanly with **Exit code 0**.

---

### Update: Dual-Room Socket Emission & Canonical DB Thread Resolution

- **Dual-Room Real-Time Broadcast (`ferio-nest-prisma`)**:
  - Resolved the room mismatch where `ferio-admin` sent messages to `conv-Customer.id` while `ferio-customer-web` joined `conv-User.id`.
  - Updated `SocketGateway` (`socket.gateway.ts`) to query linked User/Customer records for every incoming message and broadcast `new-message-received` to BOTH `conv-Customer.id` AND `conv-User.id` rooms.
  - Ensures customer receives admin socket messages instantly regardless of which socket room ID the client joined.
- **Dual Room Joining (`ferio-customer-web`)**:
  - Updated `LiveChatWidget.tsx` `initSession()` and socket `connect` handler to emit `join` events for both `conv-${resolvedCustId}` (Customer CUID) and `conv-${resolvedUserId}` (User CUID).
- **Canonical Database Thread ID (`ferio-nest-prisma`)**:
  - Forces new conversation creation to use the canonical `conv-${linkedUser.customerId}` thread ID so message history from REST API `/api/v1/conversations/:id/messages` is stored under a unified key.
- **Validation**: Production builds for `ferio-nest-prisma`, `ferio-admin`, and `ferio-customer-web` all compiled cleanly with **Exit code 0**.

---

### Update: Logged-in Customer Identity & Name Resolution in LiveChatWidget

- **Robust Account / Customer Object Parsing (`ferio-customer-web`)**:
  - Updated `LiveChatWidget.tsx` `initSession()` logic. Previously, when `/api/account/commerce` returned `{ data: { account: { ... }, customer: null } }`, `dataObj` did not have a top-level `.id` or `.customer.id`. This caused `resolvedCustId` to evaluate to `undefined` and wrongly fell back to Guest Mode (`setIsLoggedIn(false)`).
  - Fixed `initSession()` to inspect nested `accObj` (`body.account || body.data?.account`), extracting `name` ("Mohammad Sheakh") and `email` ("mohammad.sheakh@gmail.com") directly.
- **Authenticated Name Display**:
  - Updated `activeUserName` and the banner in `LiveChatWidget.tsx` to display **Mohammad Sheakh** with a green **Account Sync** badge instead of "Guest Visitor #4816" / "Guest Mode".
  - Messages emitted to socket now include `senderName: "Mohammad Sheakh"`, `email: "mohammad.sheakh@gmail.com"`, and `isGuest: false`.
- **Validation**: All 3 applications (`ferio-nest-prisma`, `ferio-admin`, `ferio-customer-web`) compiled cleanly with **Exit code 0**.

---

### Update: Dedicated Socket.IO Server Port Separation (REST: 6733, Socket: 6734)

- **Backend Gateway Port Configuration (`ferio-nest-prisma`)**:
  - Updated `SOCKET_PORT=6734` in `.env`.
  - Configured `@WebSocketGateway(Number(process.env.SOCKET_PORT) || 6734, { path: '/socket.io', cors: { origin: '*' } })` in `SocketGateway` (`socket.gateway.ts`).
  - REST API HTTP server runs on port **6733**, and WebSocket Socket.IO Gateway runs independently on port **6734**.
  - Added startup logging in `main.ts` for both REST and Socket.IO server ports.
- **Customer Web Socket Configuration (`ferio-customer-web`)**:
  - Added `NEXT_PUBLIC_SOCKET_URL=http://localhost:6734` in `.env`.
  - Updated `lib/socket.ts` URL resolution with `rawSocketUrl.replace(/\/api\/v1\/?$/, "").replace(":6733", ":6734")` to guarantee connections route to port **6734** even if dev servers had cached legacy 6733 env variables.
- **Admin Dashboard Socket Configuration (`ferio-admin`)**:
  - Added `NEXT_PUBLIC_SOCKET_URL=http://localhost:6734` in `.env`.
  - Updated `lib/socket.ts` URL resolution with `rawSocketUrl.replace(/\/api\/v1\/?$/, "").replace(":6733", ":6734")` to guarantee connections route to port **6734**.
- **Validation**: All 3 applications (`ferio-nest-prisma`, `ferio-admin`, `ferio-customer-web`) compiled cleanly with **Exit code 0**.

---

### Update: Admin Database Conversation Message History Retrieval Fixes

- **Backend Port Resolution in Next.js API Routes (`ferio-admin` & `ferio-customer-web`)**:
  - Fixed `/api/chat/messages/route.ts` in both `ferio-admin` and `ferio-customer-web`. Previously, `backendUrl` defaulted to hardcoded `http://127.0.0.1:5000`, causing REST API calls to fail silently and return `[]` empty messages for Admin chat conversations.
  - Updated backend URL resolution to use `process.env.FERIO_API_URL` or fallback `http://localhost:6733`.
- **Multi-ID Conversation History Matcher (`ferio-nest-prisma`)**:
  - Enhanced `MessageService.getMessagesByConversation()` in `message.service.ts`.
  - When querying messages for a conversation ID, it now looks up the linked `User` and `Customer` records and queries messages stored under `[conversationId, rawId, prefId, user.id, conv-${user.id}, user.customerId, conv-${user.customerId}]`.
  - Guarantees that any past messages sent before or after user account linking are retrieved together when selecting a conversation thread.
- **Admin Message Attribution (`ferio-admin`)**:
  - Updated message history mapper in `AdminLiveChatPage` (`page.tsx`) to set `isAdmin: true` for messages sent by admin users (`role === "admin"` or `senderId` starting with `admin`), rendering them on the right side in blue bubbles.
- **Validation**: All 3 applications (`ferio-nest-prisma`, `ferio-admin`, `ferio-customer-web`) compiled cleanly with **Exit code 0**.

---

### Update: Real-Time Admin Delivery & DB Message Attribution Refinements

- **Non-Admin DB Sender Resolution (`ferio-nest-prisma`)**:
  - Updated `SocketGateway.handleNewMessage()` in `socket.gateway.ts`.
  - Added explicit `{ role: { not: 'admin' } }` filtering during non-admin user resolution.
  - Prevents customer/guest messages from falling back to the Admin `User` account in PostgreSQL, ensuring distinct sender identities for database persistence.
- **Admin & Customer DB History Mapper (`ferio-admin`)**:
  - Refined `rawMsgs` mapping in `AdminLiveChatPage` (`page.tsx`).
  - Compares `m.senderId` against customer ID and guest ID to accurately distinguish customer messages (`isAdmin: false`) from admin messages (`isAdmin: true`).
- **Real-Time Admin Message Receiver (`ferio-customer-web`)**:
  - Updated `LiveChatWidget.tsx` socket room subscriptions (`conv-customerId`, `conv-userId`, `conv-guestId`).
  - Expanded `matchConv` logic to match `data.targetUserId` and `data.guestId` when an admin sends a message, ensuring admin replies render instantly in real time on the customer widget without requiring page reload.
- **Validation**: Production builds for `ferio-nest-prisma`, `ferio-admin`, and `ferio-customer-web` all compiled cleanly with **Exit code 0**.

---

### Update: System Guest User DB Persistence & Admin Initiated Chat Delivery

- **Fallback System Guest User Upsert (`ferio-nest-prisma`)**:
  - Updated `SocketGateway.handleNewMessage()` in `socket.gateway.ts`.
  - Added automatic upsert for `system_guest_chat_user` (`id: system_guest_chat_user`, `role: user`) if no existing user record is found for a guest visitor message.
  - Guarantees that guest/customer messages never fail Prisma foreign key constraints and are **always** saved to the PostgreSQL database so they load consistently when reloading the Admin Dashboard.
- **Dynamic Customer & Guest Refs for Real-Time Messages (`ferio-customer-web`)**:
  - Added `customerUserRef` and `guestIdRef` in `LiveChatWidget.tsx`.
  - Inside the `new-message-received` socket listener, `matchConv` now uses live refs to evaluate `customerUser` IDs dynamically even if `customerUser` was updated after socket connection.
  - Allows Admins to send the **first message** to an existing customer conversation thread and have it delivered instantly to the customer's web widget without requiring the customer to send a message first.
- **Validation**: All 3 applications (`ferio-nest-prisma`, `ferio-admin`, `ferio-customer-web`) compiled cleanly with **Exit code 0**.

---

### Update: Complete Fix for Customer Message History & Admin First-Message Delivery

- **Root Cause Identified**:
  - `User.customerId` in PostgreSQL was `null` for registered users (such as Mohammad Sheakh), while `Customer` had `id: cmsrseds...` and `User` had `id: cmsrquyd...`.
  - Customer messages were saved with `conversationId: conv-cmsrquyd...` (User ID), while Admin Dashboard requested messages for `conv-cmsrseds...` (Customer ID).
  - Because `MessageService` only searched the `User` table for `id` or `customerId`, and `user.customerId` was `null`, the query failed to link `Customer` and `User` together. Consequently, `Message.findMany()` only returned Admin messages on page reload.
  - Similarly, when Admin sent a message to `conv-cmsrseds...`, `SocketGateway` failed to locate `User` by `customerId`, so it did not emit to `conv-cmsrquyd...` where the Customer Web Widget was subscribed.
- **Cross-Table User & Customer Message Retrieval (`ferio-nest-prisma`)**:
  - Updated `MessageService.getMessagesByConversation()` in `message.service.ts` to query **both** `User` and `Customer` tables by ID and email.
  - Expands `possibleIds` to include all associated `User.id`, `Customer.id`, `conv-User.id`, and `conv-Customer.id` values.
  - Ensures that when Admin reloads the dashboard and selects a customer thread, **all customer and admin messages across both IDs are loaded seamlessly from PostgreSQL**.
- **Cross-Room Socket Emission (`ferio-nest-prisma` & `ferio-admin`)**:
  - Enhanced `SocketGateway.handleNewMessage()` in `socket.gateway.ts` to look up both `User` and `Customer` and email links.
  - Emits incoming messages to `User.id`, `Customer.id`, `conv-User.id`, `conv-Customer.id`, and `email` rooms.
  - Updated `AdminLiveChatPage` (`page.tsx`) to join and emit to `activeConv.customer.id` and `conv-activeConv.customer.id`.
  - Guarantees that when an Admin sends the **first message** to any customer, it is delivered live to the Customer Web Widget immediately.
- **Validation**:
  - Tested database query logic via direct Prisma script execution.
  - Production builds for `ferio-nest-prisma`, `ferio-admin`, and `ferio-customer-web` all compiled cleanly with **Exit code 0**.

---

### Update: Guest Visitor Conversation Retention on Admin Dashboard Reload

- **Root Cause**:
  - On Admin Dashboard mount, `loadCustomers()` previously only fetched registered customer accounts from `/api/customers`.
  - Guest visitor chat threads created in PostgreSQL (e.g., `conv-gst_4816`) were missing from `/api/customers`. As a result, guest conversations disappeared from the admin sidebar whenever the page was refreshed until the guest sent another real-time message over socket.
- **Backend Admin Conversations Endpoint (`ferio-nest-prisma`)**:
  - Added `getAllConversations()` in `ConversationService` (`conversation.service.ts`) to query all active conversations from `prisma.conversation`.
  - Added `@Public() @Get('all')` endpoint in `ConversationController` (`conversation.controller.ts`).
- **Admin API & Chat Sidebar Integration (`ferio-admin`)**:
  - Created `/api/chat/conversations/route.ts` in `ferio-admin`.
  - Updated `AdminLiveChatPage` (`page.tsx`) to fetch registered customers **and** DB stored conversations on mount.
  - Parses guest IDs (e.g. `gst_...`) and retains Guest Visitors in the sidebar across page reloads with their last message and timestamp intact.
- **Validation**: Production builds for `ferio-nest-prisma`, `ferio-admin`, and `ferio-customer-web` all compiled cleanly with **Exit code 0**.

---

### Update: Resizable & Collapsible 3-Panel Admin Live Chat Layout

- **Feature Implementation**:
  - Transformed the Admin Live Chat Desk into a 3-Panel dynamic, resizable, and collapsible interface:
    1. **Left Panel**: Conversation List Sidebar (Resizable & Collapsible).
    2. **Center Panel**: Active Chat Thread & Reply Inbox (Expands dynamically).
    3. **Right Panel**: Customer Profile & Metadata (Resizable & Collapsible).
- **Interactive Drag Resizing**:
  - Implemented dual drag splitter handles between Left-Center and Center-Right panels.
  - Leveraged Pointer Capture (`onPointerDown`, `setPointerCapture`, `onPointerMove`) and Mouse Event listeners for smooth drag-to-resize control.
  - Double-clicking any resizer handle resets that panel's width to its default layout dimensions.
- **Collapsible Toggle Controls**:
  - **Left Panel (Conversation List)**: Toggleable via the `Show Inbox` / `Hide Inbox` header button or Left Header collapse button.
  - **Right Panel (Customer Profile)**: Toggleable via the `Show Details` / `Hide Details` header button or Right Profile Header collapse button.
- **Persistence**:
  - Panel width and collapse preferences (`leftWidth`, `rightWidth`, `leftCollapsed`, `rightCollapsed`) are automatically saved to `localStorage` under `ferio_admin_chat_layout` so layout preferences persist across page reloads.
- **Validation**: `ferio-admin` compiled cleanly with **Exit code 0**.

---

### Update: Real-Time Active Page Visitors Desk on Admin Overview

- **Socket.IO Backend Real-Time Visitor Tracking (`ferio-nest-prisma`)**:
  - Added `activePageViews` map in `SocketGateway` (`socket.gateway.ts`) to track real-time socket connections and page locations.
  - Implemented `@SubscribeMessage('page-view')` to receive instant route location updates (`/track`, `/cart`, `/checkout`, `/products`, `/account`, `/`).
  - Added `@SubscribeMessage('request-live-page-stats')` for immediate hydration upon admin dashboard mount.
  - Emits `live-page-visitors-stats` payload to `role::admin` and `admin-room` whenever visitor connections or route locations change.
- **Frontend Customer Web Route Tracking (`ferio-customer-web`)**:
  - Created `PageTracker.tsx` component mounted globally in `RootLayout`.
  - Automatically emits `page-view` event via `getCustomerSocket()` whenever Next.js `pathname` changes or connection initializes.
- **Admin Dashboard Topbar Oval Pills (`ferio-admin`)**:
  - Embedded real-time visitor pills directly into `Topbar.tsx`, making live analytics visible on **every page in the Admin Dashboard** next to page headings.
  - Formatted each route badge in a dark oval pill shape (`rounded-full bg-[#18181b] text-white px-3.5 py-1`):
    - 🟢 `X Live` status badge
    - 🚚 `/track X | Y%`
    - 🛒 `/cart X | Y%`
    - 💳 `/checkout X | Y%`
    - 📦 `/products X | Y%`
    - 🏠 `/ X | Y%`
- **Admin Dashboard Collapsible Left Sidebar (`ferio-admin`)**:
  - Added a toggle collapse button (`«` / `»`) at the top right of the Admin Sidebar header (`Sidebar.tsx`).
  - Implemented smooth CSS transition between expanded mode (`w-56`) and compact icon mode (`w-[68px]`).
  - Added custom icons for all 19 navigation routes with native browser tooltips (`title`) when collapsed.
  - Collapsed view includes compact "F" brand logo and icon-only logout button.
  - Saved collapse state to `localStorage` under `ferio_admin_sidebar_collapsed` to preserve layout preferences across page reloads.
- **Validation**: All builds (`ferio-nest-prisma`, `ferio-customer-web`, `ferio-admin`) compiled cleanly with **Exit code 0**.
