import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { config } from './config';
import { connectDatabase } from './config/database';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import ssoConfigRoutes from './routes/sso-config';
import systemRoutes from './routes/system';
import organizationRoutes from './routes/organization';
import tenantRoutes from './routes/tenants';

const app = express();

app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());

// Routes
app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/sso/config', ssoConfigRoutes);
app.use('/system', systemRoutes);
app.use('/organization', organizationRoutes);
app.use('/tenants', tenantRoutes);

// Health
app.get('/health', (_req, res) => {
  res.json({ service: 'identity', status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message });
});

async function start() {
  await connectDatabase();
  app.listen(config.port, () => {
    console.log('');
    console.log('  🔐 HydroBOS Identity Service');
    console.log(`  ├─ Port:     ${config.port}`);
    console.log(`  ├─ MongoDB:  ${config.mongoUri}`);
    console.log(`  ├─ Entra ID: ${config.entra.enabled ? 'Enabled' : 'Disabled (configure in admin)'}`);
    console.log(`  └─ Env:      ${config.nodeEnv}`);
    console.log('');
  });
}

start().catch((err) => {
  console.error('Failed to start identity service:', err);
  process.exit(1);
});
