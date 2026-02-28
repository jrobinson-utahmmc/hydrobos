import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { config } from './config';
import { connectDatabase } from './config/database';
import { seedWidgetTemplates } from './seeds/templates';
import dashboardRoutes from './routes/dashboards';
import widgetRoutes from './routes/widgets';

const app = express();

app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '5mb' }));
app.use(cookieParser());

// Routes
app.use('/dashboards', dashboardRoutes);
app.use('/widgets', widgetRoutes);

// Health
app.get('/health', (_req, res) => {
  res.json({ service: 'widget', status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ error: config.nodeEnv === 'production' ? 'Internal server error' : err.message });
});

async function start() {
  await connectDatabase();
  await seedWidgetTemplates();

  app.listen(config.port, () => {
    console.log('');
    console.log('  📊 HydroBOS Widget Service');
    console.log(`  ├─ Port:    ${config.port}`);
    console.log(`  ├─ MongoDB: ${config.mongoUri}`);
    console.log(`  └─ Env:     ${config.nodeEnv}`);
    console.log('');
  });
}

start().catch((err) => {
  console.error('Failed to start widget service:', err);
  process.exit(1);
});
