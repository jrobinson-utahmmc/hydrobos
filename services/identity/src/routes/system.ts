import { Router, Request, Response } from 'express';
import { User } from '../models/User';
import { Organization } from '../models/Organization';
import { Tenant } from '../models/Tenant';
import { getSsoConfig } from '../services/entra';

const router = Router();

/**
 * GET /status — System initialization check
 */
router.get('/status', async (_req: Request, res: Response) => {
  try {
    const [userCount, ssoConfig, org, tenantCount] = await Promise.all([
      User.countDocuments(),
      getSsoConfig(),
      Organization.findOne().select('name slug domain'),
      Tenant.countDocuments({ status: { $ne: 'decommissioned' } }),
    ]);

    res.json({
      initialized: userCount > 0,
      version: '0.3.0',
      name: 'HydroBOS',
      ssoEnabled: ssoConfig?.enabled ?? false,
      ssoProvider: ssoConfig?.enabled ? 'Microsoft Entra ID' : undefined,
      organization: org ? { name: org.name, slug: org.slug, domain: org.domain } : null,
      tenantCount,
    });
  } catch (error) {
    console.error('System status error:', error);
    res.status(500).json({ error: 'Failed to check system status' });
  }
});

export default router;
