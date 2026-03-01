/**
 * Content Routes — Templates, page generation, preview.
 */

import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/permissions';
import * as orchestrator from '../orchestrator';
import { resolveApiKeys, extractToken } from '../lib/resolve-keys';

const router = Router();
router.use(authenticate);

/** GET /templates — List available content templates. */
router.get(
  '/templates',
  requirePermission('seo:content:read'),
  (_req: Request, res: Response) => {
    res.json({ success: true, data: orchestrator.listTemplates() });
  },
);

/** POST /generate — Generate SEO-optimized pages from a template. */
router.post(
  '/generate',
  requirePermission('seo:content:generate'),
  async (req: Request, res: Response) => {
    try {
      const { templateId, items, options } = req.body;
      if (!templateId || !items?.length) {
        return res.status(400).json({ success: false, error: 'templateId and items are required' });
      }
      const apiKey = req.body.apiKey;
      const keys = await resolveApiKeys(extractToken(req), { anthropic: apiKey });
      if (!keys.anthropic) return res.status(400).json({ success: false, error: 'Anthropic API key required' });

      const result = await orchestrator.generateContent({ templateId, items, options }, keys.anthropic);
      res.json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

/** POST /preview — Generate a quick preview for a single template+variables combo. */
router.post(
  '/preview',
  requirePermission('seo:content:read'),
  async (req: Request, res: Response) => {
    try {
      const { templateId, variables } = req.body;
      if (!templateId) return res.status(400).json({ success: false, error: 'templateId is required' });
      const keys = await resolveApiKeys(extractToken(req), { anthropic: req.body.apiKey });
      if (!keys.anthropic) return res.status(400).json({ success: false, error: 'Anthropic API key required' });

      const result = await orchestrator.previewContent(templateId, variables || {}, keys.anthropic);
      res.json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

export default router;
