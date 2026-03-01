/**
 * Image Routes — List, analyze, bulk analyze project images.
 */

import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/permissions';
import * as orchestrator from '../orchestrator';
import { resolveApiKeys, extractToken } from '../lib/resolve-keys';

const router = Router();
router.use(authenticate);

/** GET /list — List images in the loaded project. */
router.get(
  '/list',
  requirePermission('seo:images:read'),
  (_req: Request, res: Response) => {
    try {
      const images = orchestrator.listProjectImages();
      res.json({ success: true, data: images });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

/** POST /analyze — Analyze a single image URL via Google Vision. */
router.post(
  '/analyze',
  requirePermission('seo:images:analyze'),
  async (req: Request, res: Response) => {
    try {
      const { imageUrl } = req.body;
      if (!imageUrl) return res.status(400).json({ success: false, error: 'imageUrl is required' });
      const keys = await resolveApiKeys(extractToken(req), { googleVision: req.body.apiKey });
      if (!keys.googleVision) return res.status(400).json({ success: false, error: 'Google Vision API key required' });

      const result = await orchestrator.analyzeImage(imageUrl, keys.googleVision);
      res.json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

/** POST /analyze/bulk — Analyze multiple images. */
router.post(
  '/analyze/bulk',
  requirePermission('seo:images:analyze'),
  async (req: Request, res: Response) => {
    try {
      const { images } = req.body;
      if (!images?.length) return res.status(400).json({ success: false, error: 'images array is required (each with path and base64)' });
      const keys = await resolveApiKeys(extractToken(req), { googleVision: req.body.apiKey });
      if (!keys.googleVision) return res.status(400).json({ success: false, error: 'Google Vision API key required' });

      const results = await orchestrator.analyzeImages(images, keys.googleVision);
      res.json({ success: true, data: results });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

/** GET /export/csv — Export project images as CSV. */
router.get(
  '/export/csv',
  requirePermission('seo:images:read'),
  (_req: Request, res: Response) => {
    try {
      const csv = orchestrator.projectImagesCSV();
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=images.csv');
      res.send(csv);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

export default router;
