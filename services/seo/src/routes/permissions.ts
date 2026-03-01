/**
 * Permissions Admin Routes — View and override role→permission mappings.
 */

import { Router, Request, Response } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { getPermissionMap, refreshPermissionCache, SEO_PERMISSIONS, ALL_SEO_PERMISSIONS } from '../middleware/permissions';
import { AppletPermissionOverride } from '../middleware/models';

const router = Router();
router.use(authenticate);

/** GET / — List all SEO permissions and current role mappings. */
router.get(
  '/',
  requireRole('platform_admin', 'admin'),
  async (_req: Request, res: Response) => {
    try {
      const map = await getPermissionMap();
      res.json({
        success: true,
        data: {
          permissions: SEO_PERMISSIONS,
          roleMappings: map,
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

/** PUT /override — Create or update a role→permissions override. */
router.put(
  '/override',
  requireRole('platform_admin'),
  async (req: Request, res: Response) => {
    try {
      const { role, permissions } = req.body;
      if (!role || !Array.isArray(permissions)) {
        return res.status(400).json({ success: false, error: 'role and permissions[] are required' });
      }

      // Validate permission keys
      const validKeys: readonly string[] = ALL_SEO_PERMISSIONS;
      const invalid = permissions.filter((p: string) => !validKeys.includes(p));
      if (invalid.length) {
        return res.status(400).json({ success: false, error: `Invalid permissions: ${invalid.join(', ')}` });
      }

      await AppletPermissionOverride.findOneAndUpdate(
        { appletId: 'seo-optimizer', role },
        { appletId: 'seo-optimizer', role, permissions, updatedBy: (req as any).user?.userId },
        { upsert: true, new: true },
      );

      await refreshPermissionCache();
      res.json({ success: true, message: `Permissions updated for role: ${role}` });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

/** DELETE /override/:role — Remove a permission override (reverts to defaults). */
router.delete(
  '/override/:role',
  requireRole('platform_admin'),
  async (req: Request, res: Response) => {
    try {
      await AppletPermissionOverride.deleteOne({ appletId: 'seo-optimizer', role: req.params.role });
      await refreshPermissionCache();
      res.json({ success: true, message: `Override removed for role: ${req.params.role}` });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

export default router;
