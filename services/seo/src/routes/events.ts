/**
 * SSE / Events route — Real-time progress streaming for long-running operations.
 */

import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { initSSE } from '../lib/sse';

const router = Router();

/** GET /stream — SSE endpoint for real-time progress updates. */
router.get('/stream', authenticate, (req: Request, res: Response) => {
  initSSE(res);
});

export default router;
