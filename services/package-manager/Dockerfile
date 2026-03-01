# ── HydroBOS Package Manager Service ──
# Build context: monorepo root (../../)
FROM node:20-alpine AS base
WORKDIR /app

# ── Stage 1: Install deps ──
FROM base AS deps
# Copy shared-types
COPY packages/shared-types/package.json packages/shared-types/
# Copy service
COPY services/package-manager/package.json services/package-manager/
# Install shared-types deps
RUN cd packages/shared-types && npm install
# Install service deps
RUN cd services/package-manager && npm install

# ── Stage 2: Build ──
FROM deps AS build
# Copy shared-types source
COPY packages/shared-types/ packages/shared-types/
# Build shared-types
RUN cd packages/shared-types && ./node_modules/.bin/tsc
# Copy service source
COPY services/package-manager/ services/package-manager/
# Build service
RUN cd services/package-manager && ./node_modules/.bin/tsc

# ── Stage 3: Production image ──
FROM node:20-alpine AS production
WORKDIR /app

# Copy built shared-types
COPY --from=build /app/packages/shared-types/dist packages/shared-types/dist/
COPY --from=build /app/packages/shared-types/package.json packages/shared-types/

# Copy built service + production deps
COPY --from=build /app/services/package-manager/dist services/package-manager/dist/
COPY --from=build /app/services/package-manager/package.json services/package-manager/

# Install production deps only
RUN cd services/package-manager && npm install --omit=dev

ENV NODE_ENV=production
EXPOSE 5004
WORKDIR /app/services/package-manager
CMD ["node", "dist/index.js"]
