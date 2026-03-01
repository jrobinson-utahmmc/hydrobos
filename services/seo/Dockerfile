# ── HydroBOS SEO Applet Service ──
# Build context: monorepo root (../../)
FROM node:20-alpine AS base
WORKDIR /app

# ── Stage 1: Install deps ──
FROM base AS deps
# Copy shared-types
COPY packages/shared-types/package.json packages/shared-types/
# Copy service
COPY services/seo/package.json services/seo/
# Install shared-types deps
RUN cd packages/shared-types && npm install
# Install service deps
RUN cd services/seo && npm install

# ── Stage 2: Build ──
FROM deps AS build
# Copy shared-types source
COPY packages/shared-types/ packages/shared-types/
# Build shared-types
RUN cd packages/shared-types && ./node_modules/.bin/tsc
# Copy service source
COPY services/seo/ services/seo/
# Build service
RUN cd services/seo && ./node_modules/.bin/tsc

# ── Stage 3: Production image ──
FROM node:20-alpine AS production
WORKDIR /app

# Copy built shared-types
COPY --from=build /app/packages/shared-types/dist packages/shared-types/dist/
COPY --from=build /app/packages/shared-types/package.json packages/shared-types/

# Copy built service + production deps
COPY --from=build /app/services/seo/dist services/seo/dist/
COPY --from=build /app/services/seo/package.json services/seo/

# Install production deps only
RUN cd services/seo && npm install --omit=dev

ENV NODE_ENV=production
EXPOSE 5003
WORKDIR /app/services/seo
CMD ["node", "dist/index.js"]
