/**
 * File Routes — List directories, read files, execute operations.
 */

import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/permissions';
import * as orchestrator from '../orchestrator';

const router = Router();
router.use(authenticate);

/** GET /list — List files in a directory of the loaded project. */
router.get(
  '/list',
  requirePermission('seo:files:read'),
  (req: Request, res: Response) => {
    try {
      const { path: relativePath } = req.query;
      const entries = orchestrator.projectListDirectory(relativePath as string | undefined);
      res.json({ success: true, data: entries });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

/** GET /read — Read a file from the loaded project. */
router.get(
  '/read',
  requirePermission('seo:files:read'),
  (req: Request, res: Response) => {
    try {
      const { path: filePath } = req.query;
      if (!filePath) return res.status(400).json({ success: false, error: 'path is required' });
      const result = orchestrator.projectReadFile(filePath as string);
      res.json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

/** POST /operation — Execute a file operation (create, modify, delete, rename). */
router.post(
  '/operation',
  requirePermission('seo:files:write'),
  (req: Request, res: Response) => {
    try {
      const { type, path, content, newPath, overwrite } = req.body;
      if (!type || !path) return res.status(400).json({ success: false, error: 'type and path are required' });
      const result = orchestrator.projectFileOperation({ type, path, content, newPath, overwrite });
      res.json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

export default router;
