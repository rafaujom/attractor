# syntax=docker/dockerfile:1
#
# Build context is the repository root (see docker-compose.yml) because the
# frontend imports type-only declarations from ../shared/types (aliased as
# @shared/types in vite.config.ts / tsconfig.json).

FROM node:22-alpine AS base
WORKDIR /app

# ---- install dependencies ----
FROM base AS deps
COPY frontend/package.json frontend/package-lock.json ./frontend/
RUN cd frontend && npm ci

# ---- compile with Vite ----
FROM base AS build
COPY --from=deps /app/frontend/node_modules ./frontend/node_modules
COPY shared ./shared
COPY frontend ./frontend
RUN cd frontend && npm run build

# ---- serve the static build with Nginx ----
FROM nginx:1.27-alpine AS production
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/frontend/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=5 \
  CMD wget -qO- http://localhost:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
