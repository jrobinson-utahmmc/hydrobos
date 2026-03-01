/**
 * Integration Routes — Manage platform-level API keys (Anthropic, Google, Ahrefs, etc.)
 *
 * These keys are stored centrally and shared with installed packages.
 * Packages can request keys via the internal /integrations/:id/key endpoint.
 */

import { Router, Request, Response } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { PlatformIntegration } from '../models/PlatformIntegration';

const router = Router();

/** GET / — List all platform integrations. */
router.get('/', authenticate, async (_req: Request, res: Response) => {
  try {
    const integrations = await PlatformIntegration.find().sort({ category: 1, name: 1 }).lean();

    // Mask API keys — return only whether they're configured
    const safe = integrations.map((i) => ({
      ...i,
      config: {
        ...Object.fromEntries(
          Object.entries(i.config || {}).map(([k, v]) => [
            k,
            k.toLowerCase().includes('key') || k.toLowerCase().includes('secret')
              ? typeof v === 'string' && v.length > 0
                ? `${'•'.repeat(8)}${v.slice(-4)}`
                : ''
              : v,
          ])
        ),
        configured: !!(i.config?.apiKey && (i.config.apiKey as string).length > 0),
      },
    }));

    res.json({ success: true, data: safe });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/** GET /:integrationId — Get a single integration (masked). */
router.get('/:integrationId', authenticate, async (req: Request, res: Response) => {
  try {
    const integration = await PlatformIntegration.findOne({
      integrationId: req.params.integrationId as string,
    }).lean();

    if (!integration) {
      res.status(404).json({ success: false, error: 'Integration not found' });
      return;
    }

    // Mask secrets
    const safe = {
      ...integration,
      config: {
        ...Object.fromEntries(
          Object.entries(integration.config || {}).map(([k, v]) => [
            k,
            k.toLowerCase().includes('key') || k.toLowerCase().includes('secret')
              ? typeof v === 'string' && v.length > 0
                ? `${'•'.repeat(8)}${v.slice(-4)}`
                : ''
              : v,
          ])
        ),
        configured: !!(integration.config?.apiKey && (integration.config.apiKey as string).length > 0),
      },
    };

    res.json({ success: true, data: safe });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/** PUT /:integrationId — Update integration config (set API key, enable/disable). */
router.put(
  '/:integrationId',
  authenticate,
  requireRole('platform_admin', 'admin'),
  async (req: Request, res: Response) => {
    try {
      const { config: newConfig, enabled } = req.body;
      const integrationId = req.params.integrationId as string;

      const integration = await PlatformIntegration.findOne({ integrationId });
      if (!integration) {
        res.status(404).json({ success: false, error: 'Integration not found' });
        return;
      }

      if (newConfig !== undefined) {
        // Merge config — allow partial updates
        integration.config = { ...integration.config, ...newConfig };
      }
      if (enabled !== undefined) {
        integration.enabled = enabled;
      }
      integration.updatedBy = req.user!.userId;

      await integration.save();

      res.json({
        success: true,
        message: `Integration "${integration.name}" updated`,
        data: {
          integrationId: integration.integrationId,
          name: integration.name,
          enabled: integration.enabled,
          configured: !!(integration.config?.apiKey && (integration.config.apiKey as string).length > 0),
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/**
 * GET /:integrationId/key — Internal endpoint for packages to fetch API keys.
 *
 * This is called service-to-service (e.g., SEO service fetches its Anthropic key).
 * In production you'd lock this to internal network only.
 */
router.get(
  '/:integrationId/key',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const integration = await PlatformIntegration.findOne({
        integrationId: req.params.integrationId as string,
        enabled: true,
      });

      if (!integration || !integration.config?.apiKey) {
        res.status(404).json({ success: false, error: 'Integration not configured or disabled' });
        return;
      }

      res.json({
        success: true,
        data: {
          integrationId: integration.integrationId,
          apiKey: integration.config.apiKey,
          config: integration.config,
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/** POST /:integrationId/test — Test an integration's API key by making a lightweight call. */
router.post(
  '/:integrationId/test',
  authenticate,
  requireRole('platform_admin', 'admin'),
  async (req: Request, res: Response) => {
    try {
      const integration = await PlatformIntegration.findOne({
        integrationId: req.params.integrationId as string,
      });

      if (!integration || !integration.config?.apiKey) {
        res.status(400).json({ success: false, error: 'API key not configured' });
        return;
      }

      const apiKey = integration.config.apiKey as string;
      let testResult: { success: boolean; message: string; details?: any } = {
        success: false,
        message: 'Test not implemented for this integration',
      };

      switch (integration.integrationId) {
        case 'anthropic': {
          const r = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': apiKey,
              'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
              model: 'claude-sonnet-4-5-20250929',
              max_tokens: 10,
              messages: [{ role: 'user', content: 'Say "ok"' }],
            }),
            signal: AbortSignal.timeout(15000),
          });
          testResult = {
            success: r.ok,
            message: r.ok ? 'Anthropic API key is valid' : `API returned ${r.status}`,
          };
          break;
        }
        case 'google-pagespeed': {
          const r = await fetch(
            `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=https://www.google.com&strategy=mobile&key=${apiKey}`,
            { signal: AbortSignal.timeout(20000) }
          );
          testResult = {
            success: r.ok,
            message: r.ok ? 'Google PageSpeed API key is valid' : `API returned ${r.status}`,
          };
          break;
        }
        case 'google-vision': {
          const r = await fetch(
            `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ requests: [] }),
              signal: AbortSignal.timeout(10000),
            }
          );
          // Vision returns 200 even with empty requests
          testResult = {
            success: r.ok || r.status === 400,
            message: r.ok || r.status === 400 ? 'Google Vision API key is valid' : `API returned ${r.status}`,
          };
          break;
        }
        case 'ahrefs': {
          const r = await fetch(
            'https://api.ahrefs.com/v3/site-explorer/domain-rating?target=ahrefs.com&date=2025-01-01',
            {
              headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
              signal: AbortSignal.timeout(10000),
            }
          );
          testResult = {
            success: r.ok,
            message: r.ok ? 'Ahrefs API key is valid' : `API returned ${r.status}`,
          };
          break;
        }
        default:
          testResult = { success: false, message: `No test available for "${integration.integrationId}"` };
      }

      res.json({ success: true, data: testResult });
    } catch (error: any) {
      res.json({
        success: true,
        data: { success: false, message: `Test failed: ${error.message}` },
      });
    }
  }
);

export default router;
