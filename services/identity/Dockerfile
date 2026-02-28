# ── HydroBOS Identity Service ──
# Build context: monorepo root (../../)
FROM node:20-alpine AS base
WORKDIR /app

# ── Stage 1: Install deps ──
FROM base AS deps
# Copy shared-types
COPY packages/shared-types/package.json packages/shared-types/
# Copy service
COPY services/identity/package.json services/identity/
# Install shared-types deps (need typescript for build)
RUN cd packages/shared-types && npm install
# Install service deps (all, including devDeps for build)
RUN cd services/identity && npm install

# ── Stage 2: Build ──
FROM deps AS build
# Copy shared-types source
COPY packages/shared-types/ packages/shared-types/
# Build shared-types
RUN cd packages/shared-types && ./node_modules/.bin/tsc
# Copy service source
COPY services/identity/ services/identity/
# Build service
RUN cd services/identity && ./node_modules/.bin/tsc

# ── Stage 3: Production image ──
FROM node:20-alpine AS production
WORKDIR /app

# Copy built shared-types
COPY --from=build /app/packages/shared-types/dist packages/shared-types/dist/
COPY --from=build /app/packages/shared-types/package.json packages/shared-types/

# Copy built service + production deps
COPY --from=build /app/services/identity/dist services/identity/dist/
COPY --from=build /app/services/identity/package.json services/identity/

# Install production deps only
RUN cd services/identity && npm install --omit=dev

ENV NODE_ENV=production
EXPOSE 5001
WORKDIR /app/services/identity
CMD ["node", "dist/index.js"]
