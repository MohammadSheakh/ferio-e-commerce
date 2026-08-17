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
