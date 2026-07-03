# syntax=docker/dockerfile:1
#
# Build context is the repository root (see docker-compose.yml) because the
# backend imports type-only declarations from ../shared/types.

FROM node:22-alpine AS base
WORKDIR /app

# ---- install all dependencies (needed to compile with tsc) ----
FROM base AS deps
COPY backend/package.json backend/package-lock.json ./backend/
RUN cd backend && npm ci

# ---- compile TypeScript ----
FROM base AS build
COPY --from=deps /app/backend/node_modules ./backend/node_modules
COPY shared ./shared
COPY backend ./backend
RUN cd backend && npm run build

# ---- install production-only dependencies ----
FROM base AS prod-deps
COPY backend/package.json backend/package-lock.json ./backend/
RUN cd backend && npm ci --omit=dev

# ---- production image ----
FROM node:22-alpine AS production
ENV NODE_ENV=production
WORKDIR /app/backend

COPY --from=prod-deps /app/backend/node_modules ./node_modules
COPY --from=build /app/backend/dist ./dist
COPY backend/package.json ./package.json

RUN addgroup -S nodejs && adduser -S nodejs -G nodejs
USER nodejs

EXPOSE 3001

HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=5 \
  CMD wget -qO- http://localhost:3001/api/health || exit 1

CMD ["node", "dist/backend/server.js"]
