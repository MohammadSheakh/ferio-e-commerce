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

---

### Update: Mobile Live Chat Integration (`ferio-mobile-expo54`)

- **Socket.IO Mobile Client (`lib/socket.ts`)**:
  - Configured mobile socket singleton `getMobileSocket(accessToken, guestId)` connecting to Socket.IO port `6734`.
  - Supports fallback socket URL derived from `EXPO_PUBLIC_FERIO_API_URL`.
- **Live Chat Modal & Floating Widget (`components/LiveChatWidget.tsx`)**:
  - Floating trigger button positioned at the bottom right of the app with active online indicator (🟢) and unread message counter badge.
  - Full-featured mobile slide-up modal with `SafeAreaView` and `KeyboardAvoidingView`:
    - Support agent header ("Mohammad Sheakh — Ferio Support") with live status dot.
    - FlatList scrollable message thread with auto-scroll to latest message.
    - Left-aligned agent bubbles and right-aligned customer bubbles.
    - Typing indicator dots when agent is typing.
    - Message input bar with send button.
- **Identity & AsyncStorage Persistence**:
  - Automatically resolves logged-in user profile (`useAuth()`) or generates persistent `guestId` (`gst_XXXX`) via `@react-native-async-storage/async-storage`.
  - Cache messages locally in `AsyncStorage` under `ferio_chat_history_${activeUserId}`.
  - Hydrates message history directly from NestJS backend (`/conversations/conv-${activeUserId}/messages?limit=100`) and safely unpacks nested `data.results`.
- **Global Layout Mounting (`app/_layout.tsx`)**:
  - Mounted `<LiveChatWidget />` globally in `RootLayout` so mobile users can chat with support from any tab or screen.
- **Validation**: `tsc --noEmit` completed with **Exit code 0** (zero errors).

---

### Update: Requested Product Management & Multiline Input Implementation

1. **Database Schema & Backend API (`ferio-nest-prisma`)**:
   - Added `ProductRequest` model and `ProductRequestStatus` (`PENDING`, `COLLECTED`, `CONTACTED`, `DONE`) enum to Prisma schema.
   - Pushed DB migration to Neon PostgreSQL (`ProductRequest` table created).
   - Built `ProductRequestModule` with endpoints:
     - `POST /api/v1/product-requests` (Public/Authenticated creation)
     - `GET /api/v1/product-requests` (Admin paginated listing & filtering)
     - `PATCH /api/v1/product-requests/:id/status` (Admin status update)
     - `DELETE /api/v1/product-requests/:id` (Admin request deletion)

2. **Customer Web Interface (`ferio-customer-web`)**:
   - Replaced single-line input in `ProductRequestBanner.tsx` with a multiline `<textarea>` for Product Name & Model.
   - Fixed API proxy route token cookie name (`ferio_customer_access`) so logged-in customer JWTs are passed correctly to NestJS.
   - Added **YOUR NAME** input field (required for guest visitors, auto-filled for authenticated customers).

3. **Admin Dashboard (`ferio-admin`)**:
   - Created `/dashboard/requested-products` page with metric summary cards (`Pending`, `Collected`, `Contacted`, `Done`).
   - Integrated status filter pills (`ALL`, `PENDING`, `COLLECTED`, `CONTACTED`, `DONE`) and search filter.
   - Added `Logged-in` badge for authenticated user requests and displayed guest name for `Guest Visitor` submissions.
   - Added interactive status dropdown for instant updates (`COLLECTED`, `CONTACTED`, `DONE`, `PENDING`) and deletion actions.
   - Added `Requested Products 📑` link in admin `Sidebar.tsx`.

4. **Mobile Expo App (`ferio-mobile-expo54`)**:
   - Updated `ProductRequestBanner.tsx` with a slide-up interactive modal featuring multiline text area, guest name input, and optional phone input for authenticated users.

---

### Update: 1:1 Page-Specific Custom Suspense & Skeleton Loading UI Implementation

1. **Customer Web (`ferio-customer-web`)**:
   - Refactored `loading.tsx` React Suspense boundaries into exact 1:1 structural replicas for each page:
     - `app/loading.tsx`: Replica of Hero V2 Showcase (dark slider card, product image preview, bottom navigation dots), category pills horizontal scroll, 8 exact ProductCard skeletons (image box, category badge, title, price, cart button), and Product Request banner.
     - `app/products/loading.tsx`: Exact catalog layout with header title, search bar, category pills, and 8 ProductCard skeletons.
     - `app/products/[id]/loading.tsx`: Product Detail layout (large main image + 4 thumbnail previews, brand tag, title, price badge, variant selector pills, quantity & CTA buttons, specifications tab section).
     - `app/cart/loading.tsx`: Cart layout (3 cart item rows with image, title, price, quantity stepper `[- 1 +]`, delete button + order summary sidebar card).
     - `app/checkout/loading.tsx`: Checkout layout (address & payment method form fields + order summary sidebar).
     - `app/account/loading.tsx`: Customer profile layout (dark `#111114` avatar header card with camera icon, name, email, account details form inputs).
     - `app/track/loading.tsx`: Order tracking layout (centered tracking header, search input, timeline steps placeholder).
     - `app/purchase-history/loading.tsx`: Order history layout (order cards with status badges and item thumbnails).

2. **Admin Dashboard (`ferio-admin`)**:
   - Refactored `loading.tsx` Suspense boundaries to mirror every admin view's exact Topbar and component structure:
     - `app/dashboard/loading.tsx`: Overview replica (Topbar with 6 live visitor oval pills, 6 StatCards grid `Gross delivered`, `Placed orders`, `Needs confirmation`, `Delivered`, `RTO`, `Contribution`, 2-column split for Recent Orders table & Live Page Visitors Card).
     - `app/dashboard/products/loading.tsx`: Products desk (Topbar with oval pills, search & add action bar, 7 product table rows with image thumbnails).
     - `app/dashboard/requested-products/loading.tsx`: Requested products desk (Topbar with oval pills, 4 metric cards `Pending`, `Collected`, `Contacted`, `Done`, status filter pills, table rows).
     - `app/dashboard/orders/loading.tsx`: Orders management (Topbar with oval pills, 4 metric cards, status filter pills, order table rows).
     - `app/dashboard/customers/loading.tsx`: Customers management (Topbar with oval pills, search & activity filter pills, customer avatar table rows).
     - `app/dashboard/chat/loading.tsx`: Live chat desk (Topbar with oval pills, split layout with 80px left conversation list sidebar, middle inbox message thread with left guest bubbles and right admin bubbles, message input bar).

3. **Validation**:
   - `npx tsc --noEmit` passed with **Exit code 0** on both `ferio-customer-web` and `ferio-admin`.

---

### Update: SSLCommerz Payment Gateway Integration

1. **Environment Configuration**:
   - Configured SSLCommerz store credentials (`SSL_STORE_ID`, `SSL_STORE_PASSWORD`, `SSLCOMMERZ_STORE_ID`, `SSLCOMMERZ_STORE_PASSWORD`) in `ferio-nest-prisma/.env`.

2. **Gateway Adapter & Verification**:
   - Updated `SslcommerzGateway` (`src/features/commerce-payments/gateways/sslcommerz.gateway.ts`) to support dual credential lookup keys (`SSLCOMMERZ_STORE_ID` / `SSL_STORE_ID`).
   - Extended initiation payload with custom metadata fields (`value_a: orderReference`, `value_b: merchantTransactionId`, `value_c: customerEmail`, `value_d: amount`).
   - Integrated server-to-server validation against SSLCommerz `validationserverAPI.php` endpoint to verify `val_id`, `status` (`VALID` / `VALIDATED`), transaction amount, currency, and risk level.
   - Added unit test suite in `payment-adapters.spec.ts` covering initiation and server-to-server validation.

3. **Checklist Update**:
   - Updated `_doc/implementation-checklist-and-schedule.md` to mark SSLCommerz credential approval, initiation, callback processing, and validation tasks as completed `[x]`.

---

### Update: Multiple Customer Delivery Address Management System

1. **Backend & Database (`ferio-nest-prisma`)**:
   - **Schema**: Utilized Prisma's `CustomerAddress` model (`label`, `recipientName`, `phoneOriginal`, `phoneNormalized`, `district`, `area`, `detailedAddress`, `landmark`, `isDefault`, `customerId`).
   - **DTOs (`customer-account.dto.ts`)**: Added `CreateCustomerAddressDto` and `UpdateCustomerAddressDto` with validations.
   - **Service Layer (`customer-account.service.ts`)**: Implemented `ensureCustomerForUser()`, `addAddress()`, `updateAddress()`, and `deleteAddress()`. Auto-managed `isDefault` states and updated `profile()` to return customer saved addresses.
   - **Controller (`customer-account.controller.ts`)**: Exposed `POST /account/commerce/addresses`, `PUT /account/commerce/addresses/:id`, and `DELETE /account/commerce/addresses/:id`.

2. **Frontend API Proxies & Profile UI (`ferio-customer-web`)**:
   - **API Routes**: Created `/api/account/addresses` (POST) and `/api/account/addresses/[id]` (PUT, DELETE) route handlers.
   - **Account Page (`app/account/page.tsx`)**: Built a **Saved Delivery Addresses** section with address card grids, badges (`Home`, `Office`, `Default`), 1-click "Set as default", modal/accordion form to add/edit addresses with dynamic district selectors, and delete confirmation.
   - **Checkout Page (`app/checkout/page.tsx`)**: Integrated 1-click saved address selector pills/cards, automatic default address pre-filling, "+ Use New Address" toggle, and a "Save this address to my account for future fast checkout" option.

3. **Build & Validation**:
   - Executed `npm run build` on both `ferio-nest-prisma` and `ferio-customer-web` with **Exit code 0**.

---

### Update: Multi-Courier Architecture & Routing Engine Implementation

1. **Multi-Courier Provider Abstraction (`ferio-nest-prisma`)**:
   - Extended `ShipmentProviderCode` enum to support 5 primary Bangladesh courier candidates: `PATHAO`, `STEADFAST`, `REDX`, `ECOURIER`, `PAPERFLY`.

2. **Provider Adapters (`src/features/shipping/adapters/`)**:
   - `redx.adapter.ts`: Official REDX Developer OpenAPI integration for parcel creation, status tracking, webhook signature verification, and polling.
   - `ecourier.adapter.ts`: eCourier Merchant API integration with API-Key/Secret verification.
   - `paperfly.adapter.ts`: Paperfly Courier API integration.
   - `pathao.adapter.ts` & `steadfast.adapter.ts`: Maintained existing production adapters.

3. **Unified Status Normalization (`shipping.util.ts`)**:
   - Maps raw status names from all 5 providers into normalized internal shipment states: `CREATED`, `PICKED_UP`, `IN_TRANSIT`, `AT_HUB`, `OUT_FOR_DELIVERY`, `DELIVERED`, `DELIVERY_FAILED`, `RETURN_IN_PROGRESS`, `RTO`, `CANCELLED`.

4. **Intelligent Courier Routing Engine (`courier-router.service.ts`)**:
   - Evaluates destination (`district`, `upazila`), weight, COD amount, SLA requirements, and provider active status.
   - Ranks candidate providers (e.g., Pathao/REDX for Dhaka Metro; REDX/eCourier/Steadfast/Paperfly for Nationwide).
   - Exposes `POST /api/v1/admin/shipping/router/recommend`.

5. **Courier Performance Scorecard (`shipping.service.ts` & `shipping.controller.ts`)**:
   - Exposes `GET /api/v1/admin/shipping/scorecard` returning real-time performance analytics per provider (Total Parcels, Delivery Rate %, RTO Rate %, Pickup SLA %).

6. **Database & Seeding Sync (`prisma/seed.ts` & `shipping.prisma`)**:
   - Updated modular Prisma schema & client (`pnpm run prisma:sync`).
   - Added default seed entries for all 5 providers with base API URLs and active flag checks.

7. **Validation**:
   - Rebuilt Prisma schema & client (`pnpm run prisma:sync`).
   - Executed `npm run build` on `ferio-nest-prisma` with **Exit code 0**.

---

### Update: CarryBee Courier API & Webhook Integration

1. **Browser Inspection & Credential Extraction**:
   - Inspected open CarryBee merchant portal (`merchant.carrybee.com/webhook/credentials`).
   - Extracted API Base URL (`https://developers.carrybee.com`), Client headers (`Client-ID`, `Client-Secret`, `Client-Context`), handshake verification header (`X-CB-Webhook-Integration-Header`), and secret (`40489fe0-9386-4fc9-8e92-2b2fcb9d451c`).

2. **Schema & Provider Support (`ferio-nest-prisma`)**:
   - Added `CARRYBEE` to `ShipmentProviderCode` enum in `shipping.prisma` and regenerated Prisma client.
   - Updated `prisma/seed.ts` with default CarryBee seed record.

3. **CarryBee Adapter (`src/features/shipping/adapters/carrybee.adapter.ts`)**:
   - Implemented `CarrybeeAdapter` for order creation (`POST /api/v2/orders`), tracking details (`GET /api/v2/orders/:id/details`), and status normalization.
   - Built signature verification for `X-CB-Webhook-Integration-Header` and `X-Carrybee-Webhook-Signature`.

4. **Handshake & Webhook Response Controller (`shipping.controller.ts`)**:
   - Updated `CourierWebhookController` to echo back `X-CB-Webhook-Integration-Header` with HTTP status `202 Accepted` during CarryBee handshake verification.

5. **Routing & Scorecard Integration (`courier-router.service.ts` & `shipping.service.ts`)**:
   - Registered CarryBee in candidate scoring (top rank for Dhaka Metro & high score nationwide).
   - Integrated CarryBee into provider scorecard analytics.

6. **Validation**:
   - Executed `npm run build` on `ferio-nest-prisma` with **Exit code 0**.

---

### Update: Prepaid Payment Gateways Integration & Automated Audit Suite

1. **Prepaid Payment Reconciliation Scans (`ReconciliationService`)**:
   - Added `PREPAID_PAYMENT_STATE_MISMATCH`, `PREPAID_UNVERIFIED_PAID_ORDER`, and `PREPAID_AMOUNT_MISMATCH` to `ReconciliationFindingType` enum and `scannedTypes` detection list.
   - Implemented detection for:
     - Prepaid orders marked `PAID` without a valid `SUCCEEDED` payment attempt (`PREPAID_UNVERIFIED_PAID_ORDER`).
     - Payment attempts marked `SUCCEEDED` where the order payment status is not `PAID` (`PREPAID_PAYMENT_STATE_MISMATCH`).
     - Payment attempt amounts that differ from order total amounts (`PREPAID_AMOUNT_MISMATCH`).

2. **Automated Unit & Integration Test Suite (`CommercePaymentsService` & `ReconciliationService`)**:
   - Created test suite `commerce-payments.service.spec.ts` testing gateway initiation, server validation, duplicate IPN deduplication, and tampered payment amount rejection.
   - Expanded `reconciliation.service.spec.ts` with test coverage for prepaid payment finding detection and auto-resolution.
   - Total test suite execution: **24/24 unit tests passed**.

3. **Validation & Build Verification**:
   - `ferio-nest-prisma` production build: **Exit code 0**.
   - `ferio-admin` production build: **Exit code 0**.

---

### Update: In-Store Pickup (Click & Collect) Logistics & Store Outlets Management System

1. **Database Schema & Model Extensions (`ferio-nest-prisma`)**:
   - **Warehouse Model**: Extended physical store attributes (`isStore: Boolean`, `phone`, `email`, `district`, `area`, `address`, `operatingHours`, `operatingDays`, `pickupInstructions`).
   - **Delivery Method**: Added `DeliveryMethod` enum (`HOME_DELIVERY`, `STORE_PICKUP`) and updated `CheckoutDraft` and `Order` models.
   - **Store Pickup Lifecycle**: Added `StorePickupStatus` enum (`NOT_APPLICABLE`, `AVAILABLE_IN_STORE`, `TRANSFER_REQUIRED`, `SCHEDULED_BY_CUSTOMER`, `IN_TRANSFER`, `READY_FOR_PICKUP`, `COMPLETED`, `CANCELLED`), 6-digit `storePickupOtp`, `pickupScheduledAt`, `preferredPickupSlot`, and `customerPickupNotes`.
   - **Seeding & Database Push**: Synchronized Neon PostgreSQL database and updated `prisma/seed.ts` to seed initial physical store locations (Dhanmondi Flagship, Jamuna Future Park, Uttara Sector 3).

2. **Backend `StoreLocationsModule` & Order Fulfillment Engine**:
   - **Public Store Locations API (`/api/v1/store-locations`)**: Exposes active store outlets for customer selection during checkout.
   - **Real-Time Stock Availability Check (`/api/v1/store-locations/check-availability`)**: Evaluates store stock vs central hub (`MAIN`) stock per variant and determines whether an order is ready for immediate collection or requires a hub transfer.
   - **Admin Store Management (`/api/v1/admin/store-locations`)**: Full CRUD operations for physical outlets with `AuditService` audit logging.
   - **Checkout Pricing & Order Creation**: Updated `CheckoutService.preview` to apply ৳0 delivery fee for store pickups and updated `OrderService.createOrder` to generate a 6-digit `storePickupOtp`.
   - **Store Lifecycle Endpoints**:
     - `PATCH /api/v1/orders/:id/store-pickup/schedule`: Schedules customer pickup time.
     - `PATCH /api/v1/admin/orders/:id/store-pickup/status`: Updates store pickup status (`READY_FOR_PICKUP`, `IN_TRANSFER`).
     - `POST /api/v1/admin/orders/:id/store-pickup/verify-handover`: Verifies 6-digit customer OTP at desk counter and completes order handover.

3. **Admin Dashboard UI Enhancements (`ferio-admin`)**:
   - **Sidebar Navigation**: Added `Store Outlets 🏪` to `components/Sidebar.tsx`.
   - **Store Management Desk (`app/dashboard/stores/page.tsx`)**: Modal-driven interface to add new physical store outlets, view pickup stats, and activate/deactivate locations.
   - **Order Details Store Pickup Panel (`app/dashboard/orders/[id]/page.tsx`)**: Dedicated Click & Collect section displaying store address, preferred pickup date/time, OTP verification card, "Mark Ready for Pickup" notification trigger, and 1-click OTP handover verification.

4. **Next.js API Proxies & Full-Stack Front-End Integration**:
   - **Admin Dashboard API Proxies (`ferio-admin`)**:
     - `GET / POST /api/admin/store-locations`: Proxies request to NestJS `/admin/store-locations`.
     - `PATCH / DELETE /api/admin/store-locations/[id]`: Proxies store updates and status toggles.
     - `PATCH /api/orders/[id]/store-pickup/status`: Proxies order status updates (`READY_FOR_PICKUP`).
     - `POST /api/orders/[id]/store-pickup/verify-handover`: Proxies 6-digit customer OTP handover verification.
   - **Customer Web Checkout Integration (`ferio-customer-web`)**:
     - Created `GET /api/store-locations` and `POST /api/store-locations/check-availability` proxy handlers.
     - Added **Fulfillment Method Toggle** to Checkout Page (`🚚 Home Delivery` vs `🏪 Pickup from Store - Free ৳0`).
     - Integrated Physical Outlet selector displaying active store outlets, addresses, operating hours, and contact numbers.
     - Integrated Preferred Pickup Date picker & Pickup Time slot selector (`10:00 AM - 01:00 PM`, `02:00 PM - 05:00 PM`, `05:00 PM - 08:00 PM`).
     - Extended order placement API (`app/api/checkout/order/route.ts`) to support `PAY_AT_STORE` payment option.

5. **Testing & Build Verification**:
   - **Unit Testing**: 5/5 unit tests passed in `store-locations.service.spec.ts`.
   - **Production Builds**: `ferio-nest-prisma` (Exit code 0), `ferio-admin` (Exit code 0), `ferio-customer-web` (Exit code 0).





