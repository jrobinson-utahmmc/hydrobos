/**
 * Package Routes — Browse, search, and manage the package registry.
 */

import { Router, Request, Response } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { Package } from '../models/Package';
import { PackageInstallation } from '../models/PackageInstallation';

const router = Router();

/** GET / — List all available packages with install status. */
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const { category, type, search } = req.query;
    const query: Record<string, any> = { status: 'available' };
    if (category) query.category = category;
    if (type) query.type = type;
    if (search) query.name = { $regex: search, $options: 'i' };

    const packages = await Package.find(query).sort({ type: 1, name: 1 }).lean();

    // Attach installation status for the current user's context
    const installations = await PackageInstallation.find({
      packageId: { $in: packages.map((p) => p.packageId) },
      tenantId: null, // org-wide installations
    }).lean();

    const installMap = new Map(installations.map((i) => [i.packageId, i]));

    const enriched = packages.map((pkg) => {
      const installation = installMap.get(pkg.packageId);
      return {
        ...pkg,
        installed: !!installation,
        installationStatus: installation?.status || null,
        installationId: installation?._id || null,
      };
    });

    res.json({ success: true, data: enriched });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/** GET /:packageId — Get a single package with full details. */
router.get('/:packageId', authenticate, async (req: Request, res: Response) => {
  try {
    const pkg = await Package.findOne({
      packageId: req.params.packageId as string,
    }).lean();
    if (!pkg) {
      res.status(404).json({ success: false, error: 'Package not found' });
      return;
    }

    const installation = await PackageInstallation.findOne({
      packageId: pkg.packageId,
      tenantId: null,
    }).lean();

    res.json({
      success: true,
      data: {
        ...pkg,
        installed: !!installation,
        installation: installation || null,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/** POST / — Register a new custom package (admin only). */
router.post(
  '/',
  authenticate,
  requireRole('platform_admin', 'admin'),
  async (req: Request, res: Response) => {
    try {
      const {
        packageId,
        name,
        description,
        version,
        icon,
        category,
        serviceUrl,
        port,
        basePath,
        requiredIntegrations,
        permissions,
        features,
      } = req.body;

      if (!packageId || !name || !serviceUrl || !port || !basePath) {
        res.status(400).json({
          success: false,
          error: 'packageId, name, serviceUrl, port, and basePath are required',
        });
        return;
      }

      const existing = await Package.findOne({ packageId });
      if (existing) {
        res.status(409).json({ success: false, error: 'Package ID already exists' });
        return;
      }

      const pkg = await Package.create({
        packageId,
        name,
        description,
        version: version || '1.0.0',
        icon: icon || 'package',
        category: category || 'general',
        type: 'custom',
        serviceUrl,
        port,
        basePath,
        requiredIntegrations: requiredIntegrations || [],
        permissions: permissions || [],
        features: features || [],
        author: req.user?.email || 'admin',
      });

      res.status(201).json({ success: true, data: pkg });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/** DELETE /:packageId — Unregister a custom package (admin only). */
router.delete(
  '/:packageId',
  authenticate,
  requireRole('platform_admin'),
  async (req: Request, res: Response) => {
    try {
      const pkg = await Package.findOne({
        packageId: req.params.packageId as string,
      });
      if (!pkg) {
        res.status(404).json({ success: false, error: 'Package not found' });
        return;
      }
      if (pkg.type === 'builtin') {
        res.status(400).json({ success: false, error: 'Cannot delete built-in packages' });
        return;
      }

      // Remove all installations first
      await PackageInstallation.deleteMany({ packageId: pkg.packageId });
      await pkg.deleteOne();

      res.json({ success: true, message: `Package "${pkg.name}" removed` });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

export default router;
