import { Router, Request, Response } from 'express';
import { SsoConfig } from '../models/SsoConfig';
import { verifyToken } from '../utils/jwt';
import { audit, performerFromReq } from '../utils/audit';
import { bulkSyncUsers, getSsoConfig } from '../services/entra';

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
 * If clientSecret is empty/masked and config already exists, preserves the existing secret.
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

    if (!tenantId || !clientId || !redirectUri) {
      res.status(400).json({
        error: 'tenantId, clientId, and redirectUri are required',
      });
      return;
    }

    // Check if we need to preserve existing client secret
    const existing = await SsoConfig.findOne({ provider: 'entra_id' });
    const effectiveSecret =
      clientSecret && clientSecret !== '••••••••'
        ? clientSecret
        : existing?.clientSecret;

    if (!effectiveSecret) {
      res.status(400).json({ error: 'Client secret is required for new configuration' });
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
          clientSecret: effectiveSecret,
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

    await audit({
      action: 'sso.config_updated',
      category: 'sso',
      performedBy: performerFromReq(req),
      details: { enabled, tenantId, clientId, autoProvision, defaultRole },
      req,
    });

    res.json({ message: 'SSO configuration saved', config: safeConfig });
  } catch (error) {
    console.error('Save SSO config error:', error);
    res.status(500).json({ error: 'Failed to save SSO config' });
  }
});

/**
 * DELETE / — Remove SSO configuration (admin only)
 */
router.delete('/', requireAdmin, async (req: Request, res: Response) => {
  try {
    await SsoConfig.deleteOne({ provider: 'entra_id' });

    await audit({
      action: 'sso.config_removed',
      category: 'sso',
      performedBy: performerFromReq(req),
      req,
    });

    res.json({ message: 'SSO configuration removed' });
  } catch (error) {
    console.error('Delete SSO config error:', error);
    res.status(500).json({ error: 'Failed to delete SSO config' });
  }
});

/**
 * POST /sync — Trigger a bulk user sync from Microsoft Graph (admin only).
 * Fetches all users from Azure AD and syncs them into HydroBOS.
 */
router.post('/sync', requireAdmin, async (req: Request, res: Response) => {
  try {
    const ssoConfig = await getSsoConfig();
    if (!ssoConfig?.enabled) {
      res.status(400).json({ error: 'SSO is not enabled. Enable SSO first.' });
      return;
    }

    console.log('  🔄 Starting bulk user sync from Microsoft Graph...');
    const result = await bulkSyncUsers(ssoConfig);
    console.log(`  ✅ Sync complete: ${result.created} created, ${result.updated} updated, ${result.deactivated} deactivated, ${result.skipped} skipped`);

    await audit({
      action: 'sso.user_sync',
      category: 'sso',
      performedBy: performerFromReq(req),
      details: {
        totalGraphUsers: result.total,
        created: result.created,
        updated: result.updated,
        deactivated: result.deactivated,
        skipped: result.skipped,
        errors: result.errors.length,
      },
      req,
    });

    res.json({
      message: 'User sync completed',
      result,
    });
  } catch (error: any) {
    console.error('User sync error:', error);
    res.status(500).json({
      error: error.message || 'User sync failed',
      details: 'Ensure the app registration has User.Read.All and GroupMember.Read.All application permissions with admin consent.',
    });
  }
});

/**
 * GET /sync/status — Get SSO sync status (count of SSO users, last sync info)
 */
router.get('/sync/status', requireAdmin, async (_req: Request, res: Response) => {
  try {
    const ssoConfig = await SsoConfig.findOne({ provider: 'entra_id' });
    const ssoUserCount = await (await import('../models/User')).User.countDocuments({ authProvider: 'entra_id' });
    const activeSsoUsers = await (await import('../models/User')).User.countDocuments({ authProvider: 'entra_id', isActive: true });
    const disabledSsoUsers = await (await import('../models/User')).User.countDocuments({ authProvider: 'entra_id', isActive: false });

    // Get last sync audit log
    const lastSync = await (await import('../models/AuditLog')).AuditLog.findOne(
      { action: 'sso.user_sync' },
      { createdAt: 1, details: 1 },
      { sort: { createdAt: -1 } }
    );

    res.json({
      configured: !!ssoConfig,
      enabled: ssoConfig?.enabled ?? false,
      users: {
        total: ssoUserCount,
        active: activeSsoUsers,
        disabled: disabledSsoUsers,
      },
      lastSync: lastSync
        ? {
            timestamp: lastSync.createdAt,
            ...((lastSync as any).details || {}),
          }
        : null,
    });
  } catch (error) {
    console.error('Sync status error:', error);
    res.status(500).json({ error: 'Failed to fetch sync status' });
  }
});

export default router;
