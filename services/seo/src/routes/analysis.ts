/**
 * Analysis Routes — PageSpeed audits, full analysis, history.
 */

import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/permissions';
import * as orchestrator from '../orchestrator';
import { resolveApiKeys, extractToken } from '../lib/resolve-keys';

const router = Router();

// All analysis routes require authentication
router.use(authenticate);

/**
 * POST /analyze
 * Run a PageSpeed / full SEO analysis for a given URL.
 */
router.post(
  '/analyze',
  requirePermission('seo:analysis:run'),
  async (req: Request, res: Response) => {
    try {
      const { url, strategy = 'mobile', includeAiInsights = false, includeAhrefs = false, projectId } = req.body;
      if (!url) return res.status(400).json({ success: false, error: 'URL is required' });

      const apiKeys = await resolveApiKeys(extractToken(req), {
        googlePageSpeed: req.body.apiKeys?.googlePageSpeed,
        anthropic: req.body.apiKeys?.anthropic,
        ahrefs: req.body.apiKeys?.ahrefs,
      });

      // PageSpeed works without an API key (rate-limited but functional)

      const result = await orchestrator.runFullAnalysis({
        url,
        strategy,
        apiKeys,
        userId: (req as any).user?.userId,
        projectId,
        includeAiInsights,
        includeAhrefs,
      });

      res.json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

/**
 * GET /history
 * Retrieve past analysis results.
 */
router.get(
  '/history',
  requirePermission('seo:analysis:read'),
  async (req: Request, res: Response) => {
    try {
      const { url, projectId, strategy, limit = '20', skip = '0' } = req.query;
      const result = await orchestrator.getHistory(
        { url, projectId, strategy, userId: (req as any).user?.userId },
        parseInt(limit as string, 10),
        parseInt(skip as string, 10),
      );
      res.json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

/**
 * GET /last
 * Get the most recent analysis result from this session.
 */
router.get(
  '/last',
  requirePermission('seo:analysis:read'),
  (_req: Request, res: Response) => {
    const last = orchestrator.getLastAnalysis();
    if (!last) return res.status(404).json({ success: false, error: 'No analysis performed yet' });
    res.json({ success: true, data: last });
  },
);

export default router;
