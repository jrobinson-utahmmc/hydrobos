import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { createProxyMiddleware, type Options } from 'http-proxy-middleware';
import rateLimit from 'express-rate-limit';
import { config } from './config';

const app = express();

// ── Security ──
app.use(helmet());
app.use(cors({ origin: config.clientUrl, credentials: true }));
app.use(cookieParser());

// ── Rate Limiting ──
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
});
app.use('/api/', apiLimiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many auth attempts, please try again later' },
});
app.use('/api/auth/login', authLimiter);

// ── Request Logging ──
app.use((req, _res, next) => {
  if (config.nodeEnv === 'development') {
    console.log(`→ ${req.method} ${req.path}`);
  }
  next();
});

// ── Proxy Config ──
const proxyOptions = (target: string): Options => ({
  target,
  changeOrigin: true,
  on: {
    error: (err, _req, res) => {
      console.error(`Proxy error → ${target}:`, err.message);
      if ('writeHead' in res && typeof res.writeHead === 'function') {
        (res as any).writeHead(502, { 'Content-Type': 'application/json' });
        (res as any).end(JSON.stringify({ error: 'Service unavailable' }));
      }
    },
  },
});

// ── Route: Identity Service ──
// /api/auth/* → identity:5001/auth/*
app.use(
  '/api/auth',
  createProxyMiddleware({
    ...proxyOptions(config.services.identity),
    pathRewrite: { '^/': '/auth/' },
  })
);

// /api/users/* → identity:5001/users/*
app.use(
  '/api/users',
  createProxyMiddleware({
    ...proxyOptions(config.services.identity),
    pathRewrite: { '^/': '/users/' },
  })
);

// /api/sso/* → identity:5001/sso/*
app.use(
  '/api/sso',
  createProxyMiddleware({
    ...proxyOptions(config.services.identity),
    pathRewrite: { '^/': '/sso/' },
  })
);

// /api/system/* → identity:5001/system/*
app.use(
  '/api/system',
  createProxyMiddleware({
    ...proxyOptions(config.services.identity),
    pathRewrite: { '^/': '/system/' },
  })
);

// /api/organization/* → identity:5001/organization/*
app.use(
  '/api/organization',
  createProxyMiddleware({
    ...proxyOptions(config.services.identity),
    pathRewrite: { '^/': '/organization/' },
  })
);

// /api/tenants/* → identity:5001/tenants/*
app.use(
  '/api/tenants',
  createProxyMiddleware({
    ...proxyOptions(config.services.identity),
    pathRewrite: { '^/': '/tenants/' },
  })
);

// ── Route: Widget Service ──
// /api/dashboards/* → widget:5002/dashboards/*
app.use(
  '/api/dashboards',
  createProxyMiddleware({
    ...proxyOptions(config.services.widget),
    pathRewrite: { '^/': '/dashboards/' },
  })
);

// /api/widgets/* → widget:5002/widgets/*
app.use(
  '/api/widgets',
  createProxyMiddleware({
    ...proxyOptions(config.services.widget),
    pathRewrite: { '^/': '/widgets/' },
  })
);

// ── Gateway Health ──
app.get('/api/health', (_req, res) => {
  res.json({
    service: 'gateway',
    status: 'ok',
    timestamp: new Date().toISOString(),
    routes: {
      identity: config.services.identity,
      widget: config.services.widget,
    },
  });
});

// ── Service Discovery ──
app.get('/api/services', (_req, res) => {
  res.json({
    services: [
      { name: 'gateway', url: `http://localhost:${config.port}`, status: 'running' },
      { name: 'identity', url: config.services.identity, type: 'auth' },
      { name: 'widget', url: config.services.widget, type: 'dashboards' },
    ],
  });
});

// ── Start ──
app.listen(config.port, () => {
  console.log('');
  console.log('  🌊 HydroBOS API Gateway');
  console.log(`  ├─ Port:       ${config.port}`);
  console.log(`  ├─ Client:     ${config.clientUrl}`);
  console.log(`  ├─ Identity:   ${config.services.identity}`);
  console.log(`  ├─ Widget:     ${config.services.widget}`);
  console.log(`  └─ Env:        ${config.nodeEnv}`);
  console.log('');
});
