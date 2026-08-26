# ─── Ferio NestJS Backend ───
# Multi-stage: deps → build → deps-prod → slim runtime

FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9 --activate

# ── Dependencies (full, for build) ──
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

# ── Production dependencies (proper hoisted symlinks, no devDeps) ──
FROM base AS deps-prod
WORKDIR /app
COPY ferio-nest-prisma/package.json ferio-nest-prisma/pnpm-lock.yaml ./
COPY ferio-nest-prisma/prisma ./prisma
RUN pnpm install --frozen-lockfile --prod
# Explicit tenant-client generation (do not rely on postinstall timing)
RUN node_modules/.bin/prisma generate --schema prisma/schema.prisma

# ── Runtime ──
FROM node:20-alpine AS runtime
WORKDIR /app
# openssl is required by the entrypoint's secret generation.
RUN apk add --no-cache openssl && addgroup -S ferio && adduser -S ferio -G ferio

COPY --from=deps-prod /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
# Generated platform client is prebuilt JS referenced from src/
COPY --from=build /app/src/platform/generated ./src/platform/generated
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/prisma.config.ts ./prisma.config.ts
# First-boot secret generation (persisted via the ferio_secrets volume in
# compose); explicit env values always win.
COPY --from=build /app/scripts/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

USER ferio
EXPOSE 6733 6734

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:6733/api/v1/health || exit 1

CMD ["node", "dist/src/main.js"]
