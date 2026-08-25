# ─── Ferio NestJS Backend ───
# Multi-stage: deps → build → slim runtime

FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9 --activate

# ── Dependencies ──
FROM base AS deps
WORKDIR /app
COPY ferio-nest-prisma/package.json ferio-nest-prisma/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# ── Build ──
FROM base AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY ferio-nest-prisma/ .
# Prisma clients need both schemas; generate before build
RUN pnpm prisma:generate
RUN pnpm build

# ── Runtime ──
FROM node:20-alpine AS runtime
WORKDIR /app
RUN addgroup -S ferio && adduser -S ferio -G ferio

COPY --from=build /app/node_modules/.pnpm ./node_modules/.pnpm
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=build /app/dist ./dist
COPY --from=build /app/src/platform/generated ./src/platform/generated
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/package.json ./

# Prisma config for runtime (migrate deploy etc.)
COPY --from=build /app/prisma.config.ts ./prisma.config.ts 2>/dev/null || true

USER ferio
EXPOSE 6733

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:6733/api/v1/health || exit 1

CMD ["node", "dist/src/main.js"]
