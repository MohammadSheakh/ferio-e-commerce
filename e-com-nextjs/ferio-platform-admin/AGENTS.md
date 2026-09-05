# Platform Admin Instructions

Apply the [shared frontend context](../../.codex/frontend-context.md) and [design language](../_doc/design-language.md).

- This app is for Ferio platform operators, not tenant staff.
- Use platform authentication and platform API routes only; never reuse tenant-admin authorization implicitly.
- Organization lifecycle, plans, subscriptions, billing, migrations, health, and support-access screens must respect platform permissions.
- Never expose tenant operational PII or privileged credentials merely because an operator can see registry metadata.
- Keep mutation feedback, auditability, and failure states explicit.
