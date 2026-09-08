# Tenant Media Ownership And Retention

## Ownership

Product, warranty, review, return, and service evidence uploaded through a
tenant request belongs to that tenant organization. Media metadata is stored
with the tenant-local record that owns the business object. The control plane
stores no tenant commerce media metadata except explicitly approved operational
references.

## Object-Key Rules

- Object keys MUST begin with the trusted organization namespace.
- A client-provided object key MUST NOT choose or escape that namespace.
- Presigning and reads MUST verify the current tenant context and object
  ownership before returning a URL.
- Public URLs, cache entries, and deletion jobs MUST preserve the same tenant
  namespace.

## Retention And Deletion

- Business-record retention follows the tenant data-retention policy and legal
  requirements; deleting a database record must not silently delete evidence
  needed by an approved financial or dispute workflow.
- Tenant closure/export workflows must identify media references before the
  registry is retired.
- Physical bucket lifecycle rules, malware scanning, and provider deletion
  automation require the production object-storage decision and are not claimed
  as application-complete here.

## Evidence

Storage authorization tests reject another organization's object prefix before
presigning. The remaining provider lifecycle and malware controls are tracked
as operational work in the Release 1 checklist.
