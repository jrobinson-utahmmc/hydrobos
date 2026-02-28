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

# Custom nginx config for SPA routing
RUN cat > /etc/nginx/conf.d/default.conf <<'EOF'
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # SPA fallback — serve index.html for all routes
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API calls to the gateway
    location /api/ {
        proxy_pass http://gateway:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
