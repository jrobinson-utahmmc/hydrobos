import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { config } from './config';
import { connectDatabase } from './config/database';
import { refreshPermissionCache } from './middleware/permissions';
import {
  analysisRoutes,
  contentRoutes,
  imageRoutes,
  projectRoutes,
  fileRoutes,
  integrationRoutes,
  aiRoutes,
  permissionRoutes,
  eventRoutes,
} from './routes';

const app = express();

app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

// ── Routes ─────────────────────────────────────────────────────────────────

app.use('/analysis', analysisRoutes);
app.use('/content', contentRoutes);
app.use('/images', imageRoutes);
app.use('/projects', projectRoutes);
app.use('/files', fileRoutes);
app.use('/integrations', integrationRoutes);
app.use('/ai', aiRoutes);
app.use('/permissions', permissionRoutes);
app.use('/events', eventRoutes);

// ── Health ──────────────────────────────────────────────────────────────────

app.get('/health', (_req, res) => {
  res.json({ service: 'seo', status: 'ok', timestamp: new Date().toISOString() });
});

// ── Applet manifest ────────────────────────────────────────────────────────

app.get('/manifest', (_req, res) => {
  res.json({
    id: 'seo-optimizer',
    name: 'SEO Optimizer',
    version: '1.0.0',
    description: 'Comprehensive SEO analysis, content generation, and optimization toolkit',
    icon: 'search',
    category: 'marketing',
    status: 'active',
    entryUrl: '/seo',
    apiPrefix: '/api/seo',
    permissions: [
      { key: 'seo:analysis:run', name: 'Run Analysis', description: 'Execute PageSpeed and SEO audits', category: 'analysis' },
      { key: 'seo:analysis:read', name: 'View Results', description: 'View analysis history and results', category: 'analysis' },
      { key: 'seo:content:generate', name: 'Generate Content', description: 'Create SEO-optimized pages', category: 'content' },
      { key: 'seo:content:read', name: 'View Templates', description: 'Browse content templates', category: 'content' },
      { key: 'seo:images:analyze', name: 'Analyze Images', description: 'Run image SEO analysis', category: 'images' },
      { key: 'seo:images:read', name: 'View Images', description: 'List and view project images', category: 'images' },
      { key: 'seo:project:manage', name: 'Manage Projects', description: 'Load and configure projects', category: 'project' },
      { key: 'seo:project:read', name: 'View Projects', description: 'View project details', category: 'project' },
      { key: 'seo:files:read', name: 'Read Files', description: 'Read project files', category: 'files' },
      { key: 'seo:files:write', name: 'Write Files', description: 'Create, modify, delete files', category: 'files' },
      { key: 'seo:ahrefs:read', name: 'Ahrefs Data', description: 'Access Ahrefs analytics', category: 'ahrefs' },
      { key: 'seo:ai:chat', name: 'AI Chat', description: 'Use AI assistant features', category: 'ai' },
      { key: 'seo:settings:read', name: 'View Settings', description: 'View applet settings', category: 'settings' },
      { key: 'seo:settings:write', name: 'Manage Settings', description: 'Modify applet settings', category: 'settings' },
    ],
  });
});

// ── Error handler ───────────────────────────────────────────────────────────

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message });
});

// ── Start ───────────────────────────────────────────────────────────────────

async function start() {
  await connectDatabase();
  await refreshPermissionCache();

  app.listen(config.port, () => {
    console.log('');
    console.log('  🔍 HydroBOS SEO Optimizer Applet');
    console.log(`  ├─ Port:      ${config.port}`);
    console.log(`  ├─ MongoDB:   ${config.mongoUri}`);
    console.log(`  ├─ Identity:  ${config.identityServiceUrl}`);
    console.log(`  ├─ Anthropic: ${config.defaultApiKeys.anthropic ? 'Configured' : 'Not set'}`);
    console.log(`  ├─ PageSpeed: ${config.defaultApiKeys.googlePageSpeed ? 'Configured' : 'Not set'}`);
    console.log(`  ├─ Ahrefs:    ${config.defaultApiKeys.ahrefs ? 'Configured' : 'Not set'}`);
    console.log(`  └─ Env:       ${process.env.NODE_ENV || 'development'}`);
    console.log('');
  });
}

start().catch((err) => {
  console.error('Failed to start SEO service:', err);
  process.exit(1);
});
