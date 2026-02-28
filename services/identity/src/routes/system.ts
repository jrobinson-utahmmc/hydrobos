import { Router, Request, Response } from 'express';
import { User } from '../models/User';
import { getSsoConfig } from '../services/entra';

const router = Router();

/**
 * GET /status — System initialization check
 */
router.get('/status', async (_req: Request, res: Response) => {
  try {
    const [userCount, ssoConfig] = await Promise.all([
      User.countDocuments(),
      getSsoConfig(),
    ]);

    res.json({
      initialized: userCount > 0,
      version: '0.2.0',
      name: 'HydroBOS',
      ssoEnabled: ssoConfig?.enabled ?? false,
      ssoProvider: ssoConfig?.enabled ? 'Microsoft Entra ID' : undefined,
    });
  } catch (error) {
    console.error('System status error:', error);
    res.status(500).json({ error: 'Failed to check system status' });
  }
});

export default router;
