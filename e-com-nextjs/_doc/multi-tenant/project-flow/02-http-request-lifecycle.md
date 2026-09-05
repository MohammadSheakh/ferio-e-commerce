# 2. HTTP Request Lifecycle

This is the common path for a REST request.

## Step 1: NestJS Bootstrap

`src/main.ts` configures:

- raw request bodies for provider signature verification;
- correlation IDs from `x-correlation-id` or `x-request-id`;
- Helmet security headers;
- CORS for customer and admin web origins;
- compression;
- global `ValidationPipe` with whitelist, forbidden unknown properties, and
  transformation;
- `HttpExceptionFilter` for the stable error response;
- response transformation and structured logging interceptors;
- the `/api/v1` global route prefix;
- Swagger outside production;
- graceful shutdown hooks.

## Step 2: Correlation Context

The first middleware creates or accepts a correlation ID and runs the request
inside the correlation context. Logs and downstream work use this ID to join
events from one request.

## Step 3: Tenant Middleware Decision

`AppModule` applies `TenantContextMiddleware` to all routes except platform,
tenancy control/status, health, and Socket.IO paths. Therefore:

- a tenant commerce request gets host resolution before the controller runs;
- a platform request skips tenant resolution;
- a tenancy status request can explain resolution state without already having
  a tenant context;
- a WebSocket connection follows its own ticket flow.

## Step 4: DTO Validation

Before a controller method receives input, the global validation pipe:

1. transforms primitive values according to DTO metadata;
2. removes no unknown fields silently because `forbidNonWhitelisted` rejects
   them;
3. rejects invalid enum, string, number, length, and nested-object values;
4. passes a typed DTO instance to the controller.

This protects the HTTP boundary, but services still enforce ownership,
authorization-sensitive rules, state transitions, and tenant scope.

## Step 5: Guards And Controller

Guards run according to the controller and method decorators. Common guards
include:

- `AuthGuard`: validates the tenant user access token and attaches a principal;
- `RolesGuard`: checks broad role membership;
- `PermissionsGuard`: checks fine-grained permission constants;
- `TenantMembershipGuard`: confirms the principal belongs to the resolved
  organization;
- platform auth/permission guards for `/platform/*`;
- rate-limit guards for login, public tracking, and abuse-sensitive routes.

The controller should only coordinate DTOs, guards, route parameters, and the
application service call.

## Step 6: Service And Database

The service applies domain rules, then obtains the correct Prisma client:

```text
tenant request -> TenantDbService.get() -> TenantDatabaseManager -> tenant DB
platform request -> PlatformPrismaService.client -> platform DB
```

A multi-record mutation usually uses a Prisma transaction. External network
calls are kept outside the transaction. A service also handles idempotency,
write gates, audit records, and stable domain errors where applicable.

## Step 7: Response Or Error

Successful results pass through the response interceptor. Expected domain
failures become stable HTTP errors through the exception filter. Unexpected
database/provider failures are logged with correlation metadata and are not
returned as raw driver details.

## Example: Admin Order Request

```text
POST tenant.example/api/v1/admin/orders/:id/confirm
  -> correlation middleware
  -> TenantContextMiddleware resolves tenant.example
  -> ValidationPipe creates ConfirmOrderDto
  -> AuthGuard validates access token
  -> RolesGuard checks admin
  -> PermissionsGuard checks orders:manage
  -> TenantMembershipGuard checks tenant membership
  -> AdminOrderController.confirmOrder()
  -> OrderService.confirmOrder()
  -> tenant transaction updates order/history/inventory side effects
  -> audit/message/queue work is recorded
  -> transformed response
```

