# Brutal Honest Opinion: Backend Architecture

## Verdict

The backend is the strongest part of the repository. It has moved beyond a prototype, but it is still a migration-stage architecture with several boundaries that are enforced by configuration and convention rather than fully removed from the codebase.

## P1 findings

### Production proxy trust is not explicit enough

The production Compose overlay enables tenancy but does not explicitly declare the customer-web trusted-proxy flag or the backend trusted-proxy CIDR contract. Those values can therefore be inherited, defaulted, or omitted differently from the intended deployment. Because tenant resolution depends on forwarded-host trust, this must be an explicit deployment contract with a narrow, observed tunnel/ingress peer range.

The tunnel staging overlay improves this, but staging configuration is not production evidence. The production overlay should fail closed unless these values are supplied and validated.

### Legacy fallback code remains widespread

Explicit compatibility fallbacks still exist across catalog, checkout, orders, wallet, returns/refunds, RTO, settlements, chat, reports, shipping, messaging, customer account, settings, sockets, and related modules. The tenancy flag prevents unsafe production use when correctly configured, but this is not the same as deleting or isolating the legacy paths. Every fallback needs an owner, removal condition, and route-level coverage proving that production cannot reach it.

### Context propagation needs a machine-readable inventory

The code has good tenant-aware services and negative tests, but a production review should be able to enumerate every HTTP route, queue processor, socket handler, scheduled job, and storage operation and show how tenant context enters, remains trusted, and is rejected when absent. Without that inventory, new modules can silently bypass the strongest boundary.

## P2 findings

- Messaging, malware scanning, and provider integrations have sound contracts, but operational credentials and real provider behavior are not yet proven.
- Generated API clients exist in multiple web applications. They are useful artifacts, but each copy is another drift surface unless generation, review, and CI ownership are unambiguous.
- Local PostgreSQL integration evidence is valuable, but it does not demonstrate connection-pool behavior, failover, queue saturation, or noisy-neighbor protection at target scale.

## Backend release decision

Approve the backend for internal alpha and controlled staging. Do not approve public production until proxy trust is explicit, legacy reachability is proven impossible or formally accepted, and managed infrastructure/failure evidence is captured.
