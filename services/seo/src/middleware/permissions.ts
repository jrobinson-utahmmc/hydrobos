/**
 * Applet Permission Middleware — ACL enforcement
 *
 * This module implements the **Permission Mapper** pattern:
 *
 * 1.  Each applet declares a set of granular permissions in its manifest.
 * 2.  A default mapping from platform roles → applet permissions is shipped.
 * 3.  Admins can override mappings per-role via the admin panel (stored in
 *     the `applet_permission_overrides` collection).
 * 4.  At request time the middleware resolves the effective permission set
 *     for the user's role, then checks whether the required permission is
 *     present.
 *
 * This design keeps the permission model **applet-scoped** — platform roles
 * stay generic while each applet can define arbitrarily fine-grained
 * permissions.
 *
 * ─── Usage in a route ─────────────────────────────────────────────────────
 *
 *   router.post('/analyze',
 *     authenticate,
 *     requirePermission('seo:analysis:run'),
 *     handler
 *   );
 *
 * ─── Template for new applets ─────────────────────────────────────────────
 *
 *   Copy this file into your applet's middleware/ folder and update
 *   `APPLET_ID` and `DEFAULT_ROLE_PERMISSIONS`.
 */

import { Request, Response, NextFunction } from 'express';
import { AppletPermissionOverride } from './models';

// ────────────────────────────────────────────────────────────────────────────
// Constants
// ────────────────────────────────────────────────────────────────────────────

/** Must match the `id` field in this applet's manifest. */
const APPLET_ID = 'seo-optimizer';

// ────────────────────────────────────────────────────────────────────────────
// SEO Applet Permissions
// ────────────────────────────────────────────────────────────────────────────

export const SEO_PERMISSIONS = {
  // Analysis
  ANALYSIS_RUN:        'seo:analysis:run',
  ANALYSIS_READ:       'seo:analysis:read',

  // Content generation
  CONTENT_READ:        'seo:content:read',
  CONTENT_GENERATE:    'seo:content:generate',
  CONTENT_WRITE:       'seo:content:write',

  // Images
  IMAGES_READ:         'seo:images:read',
  IMAGES_ANALYZE:      'seo:images:analyze',
  IMAGES_MANAGE:       'seo:images:manage',

  // Project / files
  PROJECT_READ:        'seo:project:read',
  FILES_READ:          'seo:files:read',
  FILES_WRITE:         'seo:files:write',

  // External data
  AHREFS_READ:         'seo:ahrefs:read',

  // AI
  AI_CHAT:             'seo:ai:chat',

  // Settings / admin
  SETTINGS_MANAGE:     'seo:settings:manage',
} as const;

export type SeoPermission = (typeof SEO_PERMISSIONS)[keyof typeof SEO_PERMISSIONS];

/** All permissions as an array. */
export const ALL_SEO_PERMISSIONS = Object.values(SEO_PERMISSIONS);

// ────────────────────────────────────────────────────────────────────────────
// Default Permission Mapper  (role → permissions)
// ────────────────────────────────────────────────────────────────────────────

const DEFAULT_ROLE_PERMISSIONS: Record<string, readonly string[]> = {
  platform_admin: ALL_SEO_PERMISSIONS,
  admin:          ALL_SEO_PERMISSIONS,

  it_operations: [
    SEO_PERMISSIONS.ANALYSIS_RUN,
    SEO_PERMISSIONS.ANALYSIS_READ,
    SEO_PERMISSIONS.CONTENT_READ,
    SEO_PERMISSIONS.CONTENT_GENERATE,
    SEO_PERMISSIONS.IMAGES_READ,
    SEO_PERMISSIONS.IMAGES_ANALYZE,
    SEO_PERMISSIONS.PROJECT_READ,
    SEO_PERMISSIONS.FILES_READ,
    SEO_PERMISSIONS.AHREFS_READ,
    SEO_PERMISSIONS.AI_CHAT,
  ],

  security_analyst: [
    SEO_PERMISSIONS.ANALYSIS_RUN,
    SEO_PERMISSIONS.ANALYSIS_READ,
    SEO_PERMISSIONS.PROJECT_READ,
    SEO_PERMISSIONS.FILES_READ,
  ],

  executive_viewer: [
    SEO_PERMISSIONS.ANALYSIS_READ,
    SEO_PERMISSIONS.CONTENT_READ,
    SEO_PERMISSIONS.IMAGES_READ,
    SEO_PERMISSIONS.AHREFS_READ,
  ],

  user: [
    SEO_PERMISSIONS.ANALYSIS_RUN,
    SEO_PERMISSIONS.ANALYSIS_READ,
    SEO_PERMISSIONS.CONTENT_READ,
    SEO_PERMISSIONS.CONTENT_GENERATE,
    SEO_PERMISSIONS.IMAGES_READ,
    SEO_PERMISSIONS.IMAGES_ANALYZE,
    SEO_PERMISSIONS.PROJECT_READ,
    SEO_PERMISSIONS.FILES_READ,
    SEO_PERMISSIONS.AHREFS_READ,
    SEO_PERMISSIONS.AI_CHAT,
  ],

  viewer: [
    SEO_PERMISSIONS.ANALYSIS_READ,
    SEO_PERMISSIONS.CONTENT_READ,
    SEO_PERMISSIONS.IMAGES_READ,
  ],
};

// ────────────────────────────────────────────────────────────────────────────
// Permission Resolution
// ────────────────────────────────────────────────────────────────────────────

/**
 * In-memory cache of admin overrides.  Populated once and refreshed on
 * explicit cache-bust (e.g. after an admin saves new mappings).
 */
let overrideCache: Record<string, string[]> | null = null;

/**
 * Load admin overrides from MongoDB into memory.
 */
export async function refreshPermissionCache(): Promise<void> {
  const overrides = await AppletPermissionOverride.find({ appletId: APPLET_ID }).lean();
  overrideCache = {};
  for (const o of overrides) {
    overrideCache[o.role] = o.permissions;
  }
}

/**
 * Resolve the effective permissions for a given platform role.
 *
 * Priority: admin override > default mapping > empty set.
 */
export async function resolvePermissions(role: string): Promise<string[]> {
  // Lazy-load cache
  if (overrideCache === null) {
    await refreshPermissionCache();
  }

  // Admin override wins
  if (overrideCache![role]) {
    return overrideCache![role];
  }

  // Fall back to defaults
  return [...(DEFAULT_ROLE_PERMISSIONS[role] ?? [])];
}

// ────────────────────────────────────────────────────────────────────────────
// Express Middleware
// ────────────────────────────────────────────────────────────────────────────

/**
 * Express middleware factory.  Pass the required permission key(s).
 *
 * ```ts
 * router.get('/report', authenticate, requirePermission('seo:analysis:read'), handler);
 * ```
 */
export function requirePermission(...requiredPermissions: string[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    try {
      const effective = await resolvePermissions(req.user.role);

      const missing = requiredPermissions.filter((p) => !effective.includes(p));
      if (missing.length > 0) {
        res.status(403).json({
          error: 'Permission denied',
          required: missing,
          role: req.user.role,
        });
        return;
      }

      next();
    } catch (err) {
      console.error('Permission check error:', err);
      res.status(500).json({ error: 'Permission check failed' });
    }
  };
}

/**
 * Helper: return the full permission map (for GET /permissions endpoint).
 */
export function getPermissionMap(): {
  defaults: Record<string, readonly string[]>;
  all: readonly string[];
} {
  return {
    defaults: DEFAULT_ROLE_PERMISSIONS,
    all: ALL_SEO_PERMISSIONS,
  };
}
