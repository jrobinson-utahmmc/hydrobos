/**
 * Built-in Packages & Platform Integrations — Seeded on startup.
 */

import { Package, IPackage } from '../models/Package';
import { PlatformIntegration, IPlatformIntegration } from '../models/PlatformIntegration';

// ── Built-in Package Definitions ────────────────────────────────────────────

const BUILTIN_PACKAGES: Array<Partial<IPackage>> = [
  {
    packageId: 'seo-optimizer',
    name: 'SEO Optimizer',
    description:
      'Comprehensive SEO analysis, content generation, and optimization toolkit. Includes PageSpeed audits, Ahrefs analytics, AI-powered content generation, and image analysis.',
    version: '1.0.0',
    icon: 'search',
    category: 'marketing',
    type: 'builtin',
    serviceUrl: 'http://seo:5003',
    port: 5003,
    basePath: '/api/seo',
    healthEndpoint: '/health',
    manifestEndpoint: '/manifest',
    requiredIntegrations: ['anthropic', 'google-pagespeed', 'google-vision', 'ahrefs'],
    permissions: [
      { key: 'seo:analysis:run', label: 'Run Analysis', description: 'Execute PageSpeed and SEO audits', category: 'Analysis' },
      { key: 'seo:analysis:read', label: 'View Results', description: 'View analysis history and results', category: 'Analysis' },
      { key: 'seo:content:generate', label: 'Generate Content', description: 'Create SEO-optimized pages', category: 'Content' },
      { key: 'seo:content:read', label: 'View Templates', description: 'Browse content templates', category: 'Content' },
      { key: 'seo:images:analyze', label: 'Analyze Images', description: 'Run image SEO analysis', category: 'Images' },
      { key: 'seo:images:read', label: 'View Images', description: 'List and view project images', category: 'Images' },
      { key: 'seo:project:manage', label: 'Manage Projects', description: 'Load and configure projects', category: 'Project' },
      { key: 'seo:project:read', label: 'View Projects', description: 'View project details', category: 'Project' },
      { key: 'seo:files:read', label: 'Read Files', description: 'Read project files', category: 'Files' },
      { key: 'seo:files:write', label: 'Write Files', description: 'Create, modify, delete files', category: 'Files' },
      { key: 'seo:ahrefs:read', label: 'Ahrefs Data', description: 'Access Ahrefs analytics', category: 'Ahrefs' },
      { key: 'seo:ai:chat', label: 'AI Chat', description: 'Use AI assistant features', category: 'AI' },
      { key: 'seo:settings:read', label: 'View Settings', description: 'View applet settings', category: 'Settings' },
      { key: 'seo:settings:write', label: 'Manage Settings', description: 'Modify applet settings', category: 'Settings' },
    ],
    features: [
      'PageSpeed Insights analysis',
      'AI-powered SEO recommendations',
      'Content generation with templates',
      'Image analysis & optimization',
      'Ahrefs domain analytics',
      'Keyword research',
      'Backlink analysis',
      'Competitor analysis',
      'Real-time progress via SSE',
      'Granular permission system',
    ],
    author: 'HydroBOS',
    documentation: '/docs/packages/seo-optimizer',
    status: 'available',
  },
];

// ── Platform Integration Definitions ────────────────────────────────────────

const PLATFORM_INTEGRATIONS: Array<Partial<IPlatformIntegration>> = [
  {
    integrationId: 'anthropic',
    name: 'Anthropic Claude',
    provider: 'Anthropic',
    description:
      'AI language models for content generation, analysis, chat, and SEO recommendations. Powers intelligent features across all packages.',
    icon: 'brain',
    category: 'ai',
    config: { apiKey: '' },
    enabled: false,
    usedByPackages: ['seo-optimizer'],
  },
  {
    integrationId: 'google-pagespeed',
    name: 'Google PageSpeed Insights',
    provider: 'Google',
    description:
      'Analyze web page performance, accessibility, best practices, and SEO scores using Google Lighthouse.',
    icon: 'gauge',
    category: 'analytics',
    config: { apiKey: '' },
    enabled: false,
    usedByPackages: ['seo-optimizer'],
  },
  {
    integrationId: 'google-vision',
    name: 'Google Cloud Vision',
    provider: 'Google',
    description:
      'Image analysis using machine learning: label detection, object recognition, text extraction, and content categorization.',
    icon: 'eye',
    category: 'ai',
    config: { apiKey: '' },
    enabled: false,
    usedByPackages: ['seo-optimizer'],
  },
  {
    integrationId: 'ahrefs',
    name: 'Ahrefs',
    provider: 'Ahrefs',
    description:
      'SEO toolset for backlink analysis, keyword research, competitor analysis, domain overview, and organic traffic insights.',
    icon: 'link',
    category: 'analytics',
    config: { apiKey: '' },
    enabled: false,
    usedByPackages: ['seo-optimizer'],
  },
];

// ── Seed Functions ──────────────────────────────────────────────────────────

export async function seedBuiltinPackages(): Promise<void> {
  for (const pkg of BUILTIN_PACKAGES) {
    const existing = await Package.findOne({ packageId: pkg.packageId });
    if (!existing) {
      await Package.create(pkg);
      console.log(`  📦 Seeded package: ${pkg.name}`);
    } else {
      // Update version + features on each startup (rolling update pattern)
      await Package.updateOne(
        { packageId: pkg.packageId },
        {
          $set: {
            version: pkg.version,
            description: pkg.description,
            features: pkg.features,
            permissions: pkg.permissions,
            requiredIntegrations: pkg.requiredIntegrations,
          },
        }
      );
    }
  }
}

export async function seedPlatformIntegrations(): Promise<void> {
  for (const integration of PLATFORM_INTEGRATIONS) {
    const existing = await PlatformIntegration.findOne({
      integrationId: integration.integrationId,
    });
    if (!existing) {
      await PlatformIntegration.create(integration);
      console.log(`  🔌 Seeded integration: ${integration.name}`);
    } else {
      // Update description / usedByPackages but preserve user config
      await PlatformIntegration.updateOne(
        { integrationId: integration.integrationId },
        {
          $set: {
            description: integration.description,
            name: integration.name,
            icon: integration.icon,
            category: integration.category,
          },
          $addToSet: {
            usedByPackages: { $each: integration.usedByPackages || [] },
          },
        }
      );
    }
  }
}

export async function seedAll(): Promise<void> {
  await seedBuiltinPackages();
  await seedPlatformIntegrations();
}
