# Customer Auth and Chat Integration Shot 05

**Date:** 2026-09-11
**Scope:** Customer authentication/session refresh and chat socket-ticket/message BFF integration.
**Explicit exclusions:** `ferio-mobile-expo54/` and Redis implementation/configuration.

## Verification

Reviewed the customer login, registration, OAuth, email verification,
resend-verification, logout, refresh, account-session, socket-ticket, and
chat-message routes against the NestJS authentication, socket-auth, and
conversation/message controllers.

The email verification route correctly uses the backend response that
establishes an authenticated session. Login and OAuth capture the backend
refresh cookie into the customer-web httpOnly cookie, refresh rotates both
tokens, and logout revokes the upstream refresh token before clearing local
cookies. Authenticated chat ticket issuance and guest-ticket fallback use the
documented endpoints; message history uses the documented conversation path
and forwards the guest identity only for the guest branch.

The source review found no verified route or method mismatch in this shot, so
no application code was changed.

## Validation boundary

This is source-level contract evidence only. It does not prove browser cookie
behavior, expired-token race behavior, live tenant-host forwarding, WebSocket
handshake/room isolation, or production identity-provider behavior. Those
remain runtime acceptance gates.
