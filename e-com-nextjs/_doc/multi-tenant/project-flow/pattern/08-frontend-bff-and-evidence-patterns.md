# Patterns 36-40: BFF, SSR, And Evidence

## 36. Request-aware BFF forwarding

Template: `ferio-customer-web/app/api/store/config/route.ts`,
`lib/backend.ts`, and `lib/tenancy.ts`. The BFF must preserve the request's
tenant host when calling the backend; a process-global default is unsafe for
multi-tenant SSR.

## 37. SSR tenant metadata

Template: `ferio-customer-web/app/layout.tsx`, `lib/store.ts`, and `lib/catalog.ts`.
Metadata and initial server-rendered data must be fetched with request-aware
tenant context, not a cached global tenant.

## 38. Frontend failure/empty state

Templates: customer-web store/config/catalog components. Study loading,
unavailable, empty, and mutation-failure states as part of the contract. A
frontend that hides an API error can turn an operational failure into unsafe
user behavior.

## 39. Source-to-test evidence chain

For every feature, connect implementation to focused test, integration test,
runtime evidence, and checklist gate. The existing
`_doc/multi-tenant/project-flow/PROJECT-FLOW-AUDIT-STATUS.md` demonstrates
this style of bounded audit.

## 40. Evidence-level separation

Label evidence explicitly as source inspection, automated test, local Docker,
public staging, managed provider, or human pilot. The Cloudflare Tunnel
staging proof demonstrates real host/SSR/BFF behavior, but it does not prove
production hosting, managed PITR, provider paging, or pilot acceptance.

### Senior questions

- Does every server-side fetch carry the correct host?
- What happens when the BFF cannot reach the backend?
- Can cache headers cause cross-tenant content reuse?
- What claim does each piece of evidence actually support?
