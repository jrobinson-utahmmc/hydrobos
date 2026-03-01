/**
 * Project Routes — Load, inspect, and query project structure.
 */

import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/permissions';
import * as orchestrator from '../orchestrator';

const router = Router();
router.use(authenticate);

/** POST /load — Load a project from a filesystem path. */
router.post(
  '/load',
  requirePermission('seo:project:manage'),
  (req: Request, res: Response) => {
    try {
      const { projectPath } = req.body;
      if (!projectPath) return res.status(400).json({ success: false, error: 'projectPath is required' });
      const structure = orchestrator.loadProject(projectPath);
      res.json({ success: true, data: structure });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

/** GET /structure — Get the currently loaded project structure. */
router.get(
  '/structure',
  requirePermission('seo:project:read'),
  (_req: Request, res: Response) => {
    const structure = orchestrator.getProjectStructure();
    if (!structure) return res.status(404).json({ success: false, error: 'No project loaded' });
    res.json({ success: true, data: structure });
  },
);

/** GET /status — Get orchestrator status. */
router.get(
  '/status',
  requirePermission('seo:project:read'),
  (_req: Request, res: Response) => {
    res.json({ success: true, data: orchestrator.getStatus() });
  },
);

export default router;
