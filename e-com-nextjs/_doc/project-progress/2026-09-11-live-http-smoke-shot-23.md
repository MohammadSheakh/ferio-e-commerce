# Live HTTP Smoke Shot 23

Date: 2026-09-11

## Scope

Probed the configured local backend/web ports and the documented public
Cloudflare Tunnel hostname without sending authenticated or mutating requests.
This distinguishes an unavailable runtime from an API contract failure.

## Configuration observed

The backend environment contains configured values for `PORT`, `SOCKET_PORT`,
`CUSTOMER_WEB_URL`, `ADMIN_WEB_URL`, `PUBLIC_API_URL`, and
`PLATFORM_PUBLIC_DOMAIN`. Secret values were not printed.

## Result

All expected local HTTP probes were unavailable at probe time:

```text
http://127.0.0.1:6733/health          -> curl 000, could not connect
http://127.0.0.1:6733/api/v1/health    -> curl 000, could not connect
http://127.0.0.1:3000                  -> curl 000, could not connect
http://127.0.0.1:3001                  -> curl 000, could not connect
http://127.0.0.1:3100                  -> curl 000, could not connect
https://ferio.sheakh.qzz.io           -> curl 000, DNS resolution failed
```

No authenticated API call, SSR request, BFF request, WebSocket handshake, or
cross-tenant assertion was attempted because the runtime ingress was absent.
No API integration pass/fail claim is made from this shot.

## Safety boundary

The probes were read-only and unauthenticated. No database, Redis, mobile
project, source implementation, or deployment configuration was changed.

## Next runtime prerequisite

Start the local Docker-backed PostgreSQL and application services, verify the
expected HTTP ports, and restore DNS/tunnel reachability for the staging host.
Then rerun the guarded integration suite and the two-host SSR/BFF isolation
checks using disposable tenants before claiming live API integration evidence.
