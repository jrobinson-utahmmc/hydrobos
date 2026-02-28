import { Router, Request, Response } from 'express';
import { SsoConfig } from '../models/SsoConfig';
import { verifyToken } from '../utils/jwt';

const router = Router();

function requireAdmin(req: Request, res: Response, next: Function) {
  const token = req.cookies?.token || req.headers.authorization?.replace('Bearer ', '');
  if (!token) { res.status(401).json({ error: 'Auth required' }); return; }
  try {
    const decoded = verifyToken(token);
    if (!['platform_admin', 'admin'].includes(decoded.role)) {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }
    (req as any).user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

/**
 * GET / — Get current SSO configuration (admin only)
 */
router.get('/', requireAdmin, async (_req: Request, res: Response) => {
  try {
    const config = await SsoConfig.findOne({ provider: 'entra_id' });
    if (!config) {
      res.json({ configured: false });
      return;
    }

    // Don't send the client secret
    const safeConfig = config.toJSON();
    safeConfig.clientSecret = '••••••••';

    res.json({ configured: true, config: safeConfig });
  } catch (error) {
    console.error('Get SSO config error:', error);
    res.status(500).json({ error: 'Failed to fetch SSO config' });
  }
});

/**
 * PUT / — Create or update SSO configuration (admin only)
 */
router.put('/', requireAdmin, async (req: Request, res: Response) => {
  try {
    const {
      enabled,
      tenantId,
      clientId,
      clientSecret,
      redirectUri,
      scopes,
      groupRoleMap,
      autoProvision,
      defaultRole,
    } = req.body;

    if (!tenantId || !clientId || !clientSecret || !redirectUri) {
      res.status(400).json({
        error: 'tenantId, clientId, clientSecret, and redirectUri are required',
      });
      return;
    }

    const config = await SsoConfig.findOneAndUpdate(
      { provider: 'entra_id' },
      {
        $set: {
          provider: 'entra_id',
          enabled: enabled ?? false,
          tenantId,
          clientId,
          clientSecret,
          redirectUri,
          scopes: scopes || ['openid', 'profile', 'email'],
          groupRoleMap: groupRoleMap || {},
          autoProvision: autoProvision ?? true,
          defaultRole: defaultRole || 'user',
        },
      },
      { upsert: true, new: true }
    );

    const safeConfig = config.toJSON();
    safeConfig.clientSecret = '••••••••';

    res.json({ message: 'SSO configuration saved', config: safeConfig });
  } catch (error) {
    console.error('Save SSO config error:', error);
    res.status(500).json({ error: 'Failed to save SSO config' });
  }
});

/**
 * DELETE / — Remove SSO configuration (admin only)
 */
router.delete('/', requireAdmin, async (_req: Request, res: Response) => {
  try {
    await SsoConfig.deleteOne({ provider: 'entra_id' });
    res.json({ message: 'SSO configuration removed' });
  } catch (error) {
    console.error('Delete SSO config error:', error);
    res.status(500).json({ error: 'Failed to delete SSO config' });
  }
});

export default router;
