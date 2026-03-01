/**
 * HydroBOS Package Manager Service
 *
 * Manages package registry, installations, and platform-level API integrations.
 * Port: 5004
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { config } from './config';
import { connectDatabase } from './config/database';
import { packageRoutes, installationRoutes, integrationRoutes } from './routes';
import { seedAll } from './seeds/builtin-packages';

const app = express();

// Middleware
app.use(helmet());
app.use(
  cors({
    origin: config.corsOrigin,
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// Health endpoint
app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    service: 'package-manager',
    timestamp: new Date().toISOString(),
  });
});

// Routes — register specific sub-paths before the generic catch-all
app.use('/api/packages/installations', installationRoutes);
app.use('/api/packages/integrations', integrationRoutes);
app.use('/api/packages', packageRoutes);

// Start
async function start(): Promise<void> {
  await connectDatabase();

  // Seed built-in packages and platform integrations
  await seedAll();

  app.listen(config.port, () => {
    console.log(`📦 Package Manager service running on port ${config.port}`);
  });
}

start().catch((err) => {
  console.error('Failed to start Package Manager service:', err);
  process.exit(1);
});

export default app;
