# Patterns 1-5: HTTP Boundary And Security

## 1. Global request pipeline

Template: `ferio-nest-prisma/src/main.ts`. Learn the order of raw body,
correlation ID, Helmet/CORS/compression, validation, filters, interceptors,
and the `/api/v1` prefix. Order matters because webhook signatures, errors,
logs, and route discovery depend on it.

## 2. DTO whitelist validation

Template: global `ValidationPipe` in `src/main.ts`; examples in
`src/platform/dto/` and feature `dto/` folders. Study whitelist,
`forbidNonWhitelisted`, transformation, nested validation, and why validation
does not replace authorization or ownership checks.

## 3. Stable error envelope

Template: `libs/common` exception/filter code and
`src/core/security/error-contract.spec.ts`. Learn how expected domain failures
become safe client contracts while driver/provider details stay out of the
response.

## 4. Correlation context

Template: correlation helpers imported by `src/main.ts` and
`src/core/security/request-context.spec.ts`. Trace one ID from HTTP response to
structured logs and queued work. It is observability metadata, never tenant
authority.

## 5. Rate-limit security event

Template: `src/core/security/rate-limit-security-events.spec.ts` and auth
controllers. Study how abuse-sensitive routes record a security event, return a
stable failure, and avoid logging credentials or raw tokens.

### Senior questions

- What is trusted before validation, and what only becomes trusted after it?
- Which middleware runs for platform, tenant, health, and socket routes?
- Can every error be correlated without leaking tenant secrets?
- Does a client-controlled field ever choose a database or permission?
