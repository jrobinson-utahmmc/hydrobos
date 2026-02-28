# ── HydroBOS Widget Service ──
# Build context: monorepo root (../../)
FROM node:20-alpine AS base
WORKDIR /app

# ── Stage 1: Install deps ──
FROM base AS deps
COPY packages/shared-types/package.json packages/shared-types/
COPY services/widget/package.json services/widget/
RUN cd packages/shared-types && npm install
RUN cd services/widget && npm install

# ── Stage 2: Build ──
FROM deps AS build
COPY packages/shared-types/ packages/shared-types/
RUN cd packages/shared-types && ./node_modules/.bin/tsc
COPY services/widget/ services/widget/
RUN cd services/widget && ./node_modules/.bin/tsc

# ── Stage 3: Production image ──
FROM node:20-alpine AS production
WORKDIR /app

COPY --from=build /app/packages/shared-types/dist packages/shared-types/dist/
COPY --from=build /app/packages/shared-types/package.json packages/shared-types/
COPY --from=build /app/services/widget/dist services/widget/dist/
COPY --from=build /app/services/widget/package.json services/widget/

RUN cd services/widget && npm install --omit=dev

ENV NODE_ENV=production
EXPOSE 5002
WORKDIR /app/services/widget
CMD ["node", "dist/index.js"]
