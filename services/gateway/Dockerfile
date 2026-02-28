# ── HydroBOS API Gateway ──
# Build context: monorepo root (../../)
FROM node:20-alpine AS base
WORKDIR /app

# ── Stage 1: Install deps ──
FROM base AS deps
COPY packages/shared-types/package.json packages/shared-types/
COPY services/gateway/package.json services/gateway/
RUN cd packages/shared-types && npm install
RUN cd services/gateway && npm install

# ── Stage 2: Build ──
FROM deps AS build
COPY packages/shared-types/ packages/shared-types/
RUN cd packages/shared-types && ./node_modules/.bin/tsc
COPY services/gateway/ services/gateway/
RUN cd services/gateway && ./node_modules/.bin/tsc

# ── Stage 3: Production image ──
FROM node:20-alpine AS production
WORKDIR /app

COPY --from=build /app/packages/shared-types/dist packages/shared-types/dist/
COPY --from=build /app/packages/shared-types/package.json packages/shared-types/
COPY --from=build /app/services/gateway/dist services/gateway/dist/
COPY --from=build /app/services/gateway/package.json services/gateway/

RUN cd services/gateway && npm install --omit=dev

ENV NODE_ENV=production
EXPOSE 5000
WORKDIR /app/services/gateway
CMD ["node", "dist/index.js"]
