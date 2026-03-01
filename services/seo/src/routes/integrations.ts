/**
 * Integration Routes — Ahrefs domain overview, backlinks, keywords, competitors.
 */

import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/permissions';
import * as orchestrator from '../orchestrator';
import { resolveApiKeys, extractToken } from '../lib/resolve-keys';

const router = Router();
router.use(authenticate);

async function getAhrefsKey(req: Request): Promise<string | null> {
  const override = (req.body?.apiKey as string) || (req.query.apiKey as string) || undefined;
  const keys = await resolveApiKeys(extractToken(req), override ? { ahrefs: override } : undefined);
  return keys.ahrefs || null;
}

/** GET /ahrefs/overview/:domain */
router.get(
  '/ahrefs/overview/:domain',
  requirePermission('seo:ahrefs:read'),
  async (req: Request, res: Response) => {
    try {
      const apiKey = await getAhrefsKey(req);
      if (!apiKey) return res.status(400).json({ success: false, error: 'Ahrefs API key required' });
      const domain = req.params.domain as string;
      const data = await orchestrator.ahrefsDomainOverview(domain, apiKey);
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

/** GET /ahrefs/backlinks/:domain */
router.get(
  '/ahrefs/backlinks/:domain',
  requirePermission('seo:ahrefs:read'),
  async (req: Request, res: Response) => {
    try {
      const apiKey = await getAhrefsKey(req);
      if (!apiKey) return res.status(400).json({ success: false, error: 'Ahrefs API key required' });
      const domain = req.params.domain as string;
      const limit = parseInt(req.query.limit as string, 10) || 20;
      const data = await orchestrator.ahrefsBacklinks(domain, apiKey, limit);
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

/** GET /ahrefs/keywords/:domain */
router.get(
  '/ahrefs/keywords/:domain',
  requirePermission('seo:ahrefs:read'),
  async (req: Request, res: Response) => {
    try {
      const apiKey = await getAhrefsKey(req);
      if (!apiKey) return res.status(400).json({ success: false, error: 'Ahrefs API key required' });
      const domain = req.params.domain as string;
      const country = (req.query.country as string) || 'us';
      const limit = parseInt(req.query.limit as string, 10) || 20;
      const data = await orchestrator.ahrefsOrganicKeywords(domain, apiKey, country, limit);
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

/** GET /ahrefs/keyword-ideas/:keyword */
router.get(
  '/ahrefs/keyword-ideas/:keyword',
  requirePermission('seo:ahrefs:read'),
  async (req: Request, res: Response) => {
    try {
      const apiKey = await getAhrefsKey(req);
      if (!apiKey) return res.status(400).json({ success: false, error: 'Ahrefs API key required' });
      const keyword = req.params.keyword as string;
      const country = (req.query.country as string) || 'us';
      const limit = parseInt(req.query.limit as string, 10) || 20;
      const data = await orchestrator.ahrefsKeywordIdeas(keyword, apiKey, country, limit);
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

/** GET /ahrefs/competitors/:domain */
router.get(
  '/ahrefs/competitors/:domain',
  requirePermission('seo:ahrefs:read'),
  async (req: Request, res: Response) => {
    try {
      const apiKey = await getAhrefsKey(req);
      if (!apiKey) return res.status(400).json({ success: false, error: 'Ahrefs API key required' });
      const domain = req.params.domain as string;
      const limit = parseInt(req.query.limit as string, 10) || 10;
      const data = await orchestrator.ahrefsCompetitors(domain, apiKey, limit);
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

/** GET /ahrefs/full-report/:domain — Full Ahrefs report (overview + keywords + backlinks + competitors). */
router.get(
  '/ahrefs/full-report/:domain',
  requirePermission('seo:ahrefs:read'),
  async (req: Request, res: Response) => {
    try {
      const apiKey = await getAhrefsKey(req);
      if (!apiKey) return res.status(400).json({ success: false, error: 'Ahrefs API key required' });
      const domain = req.params.domain as string;
      const data = await orchestrator.ahrefsFullReport(domain, apiKey);
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

export default router;
