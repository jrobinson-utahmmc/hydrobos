/**
 * AI Routes — Chat, analysis, model listing via Anthropic Claude.
 */

import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/permissions';
import * as orchestrator from '../orchestrator';
import { resolveApiKeys, extractToken } from '../lib/resolve-keys';

const router = Router();
router.use(authenticate);

/** POST /chat — Send a conversational message to Claude with SEO context. */
router.post(
  '/chat',
  requirePermission('seo:ai:chat'),
  async (req: Request, res: Response) => {
    try {
      const { message, context } = req.body;
      if (!message) return res.status(400).json({ success: false, error: 'message is required' });
      const keys = await resolveApiKeys(extractToken(req), { anthropic: req.body.apiKey });
      if (!keys.anthropic) return res.status(400).json({ success: false, error: 'Anthropic API key required' });

      const result = await orchestrator.aiChat(message, keys.anthropic, context);
      res.json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

/** POST /analyze — Perform a structured analysis of content. */
router.post(
  '/analyze',
  requirePermission('seo:ai:chat'),
  async (req: Request, res: Response) => {
    try {
      const { content, analysisType = 'seo' } = req.body;
      if (!content) return res.status(400).json({ success: false, error: 'content is required' });
      const keys = await resolveApiKeys(extractToken(req), { anthropic: req.body.apiKey });
      if (!keys.anthropic) return res.status(400).json({ success: false, error: 'Anthropic API key required' });

      const validTypes = ['seo', 'content', 'structure', 'general'] as const;
      const aType = validTypes.includes(analysisType) ? analysisType as typeof validTypes[number] : 'general' as const;
      const result = await orchestrator.aiAnalyze(content, aType, keys.anthropic);
      res.json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

/** GET /models — List available Claude models. */
router.get(
  '/models',
  requirePermission('seo:ai:chat'),
  async (_req: Request, res: Response) => {
    try {
      const models = orchestrator.aiModels();
      res.json({ success: true, data: models });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

export default router;
