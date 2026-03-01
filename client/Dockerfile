# ── HydroBOS Client (Vite + React) ──
# Build context: monorepo root (../)
FROM node:20-alpine AS base
WORKDIR /app

# ── Stage 1: Install deps ──
FROM base AS deps
COPY client/package.json client/package-lock.json* client/
RUN cd client && npm install

# ── Stage 2: Build ──
FROM deps AS build
COPY client/ client/
RUN cd client && npm run build

# ── Stage 3: Serve with nginx ──
FROM nginx:alpine AS production
COPY --from=build /app/client/dist /usr/share/nginx/html

# Custom nginx config for SPA routing + API proxy
COPY client/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
