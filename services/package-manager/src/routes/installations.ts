/**
 * Installation Routes — Install, uninstall, enable, disable packages.
 */

import { Router, Request, Response } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { Package } from '../models/Package';
import { PackageInstallation } from '../models/PackageInstallation';
import { PlatformIntegration } from '../models/PlatformIntegration';

const router = Router();

/** GET / — List all current installations. */
router.get('/', authenticate, async (_req: Request, res: Response) => {
  try {
    const installations = await PackageInstallation.find().sort({ installedAt: -1 }).lean();

    // Enrich with package details
    const packageIds = [...new Set(installations.map((i) => i.packageId))];
    const packages = await Package.find({ packageId: { $in: packageIds } }).lean();
    const pkgMap = new Map(packages.map((p) => [p.packageId, p]));

    const enriched = installations.map((inst) => ({
      ...inst,
      package: pkgMap.get(inst.packageId) || null,
    }));

    res.json({ success: true, data: enriched });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/** POST /install — Install a package. */
router.post(
  '/install',
  authenticate,
  requireRole('platform_admin', 'admin'),
  async (req: Request, res: Response) => {
    try {
      const { packageId, tenantId = null, config: pkgConfig = {} } = req.body;
      if (!packageId) {
        res.status(400).json({ success: false, error: 'packageId is required' });
        return;
      }

      // Verify package exists
      const pkg = await Package.findOne({ packageId, status: 'available' });
      if (!pkg) {
        res.status(404).json({ success: false, error: 'Package not found or unavailable' });
        return;
      }

      // Check not already installed
      const existing = await PackageInstallation.findOne({ packageId, tenantId });
      if (existing) {
        res.status(409).json({ success: false, error: 'Package already installed' });
        return;
      }

      // Check required integrations are configured
      if (pkg.requiredIntegrations.length > 0) {
        const integrations = await PlatformIntegration.find({
          integrationId: { $in: pkg.requiredIntegrations },
        }).lean();

        const missing = pkg.requiredIntegrations.filter(
          (reqId) => !integrations.some((i) => i.integrationId === reqId && i.enabled && i.config?.apiKey)
        );

        // Warn but don't block — allow install with unconfigured integrations
        if (missing.length > 0) {
          console.log(
            `  ⚠️  Package "${pkg.name}" installed without configured integrations: ${missing.join(', ')}`
          );
        }
      }

      const installation = await PackageInstallation.create({
        packageId,
        tenantId,
        status: 'active',
        config: pkgConfig,
        enabledFeatures: pkg.features,
        installedBy: req.user!.userId,
      });

      // Health check the service
      try {
        const healthUrl = `${pkg.serviceUrl}${pkg.healthEndpoint}`;
        const healthRes = await fetch(healthUrl, { signal: AbortSignal.timeout(5000) });
        if (healthRes.ok) {
          await PackageInstallation.updateOne(
            { _id: installation._id },
            { lastHealthCheck: new Date(), lastHealthStatus: 'healthy' }
          );
        } else {
          await PackageInstallation.updateOne(
            { _id: installation._id },
            { lastHealthCheck: new Date(), lastHealthStatus: 'unhealthy' }
          );
        }
      } catch {
        await PackageInstallation.updateOne(
          { _id: installation._id },
          {
            lastHealthCheck: new Date(),
            lastHealthStatus: 'unhealthy',
            errorMessage: 'Service not reachable during installation',
          }
        );
      }

      res.status(201).json({
        success: true,
        message: `Package "${pkg.name}" installed successfully`,
        data: installation,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/** POST /uninstall — Uninstall a package. */
router.post(
  '/uninstall',
  authenticate,
  requireRole('platform_admin', 'admin'),
  async (req: Request, res: Response) => {
    try {
      const { packageId, tenantId = null } = req.body;
      if (!packageId) {
        res.status(400).json({ success: false, error: 'packageId is required' });
        return;
      }

      const installation = await PackageInstallation.findOne({ packageId, tenantId });
      if (!installation) {
        res.status(404).json({ success: false, error: 'Package not installed' });
        return;
      }

      await installation.deleteOne();

      res.json({ success: true, message: `Package "${packageId}" uninstalled` });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/** PATCH /:packageId/status — Enable or disable an installed package. */
router.patch(
  '/:packageId/status',
  authenticate,
  requireRole('platform_admin', 'admin'),
  async (req: Request, res: Response) => {
    try {
      const { status } = req.body;
      if (!['active', 'disabled'].includes(status)) {
        res.status(400).json({ success: false, error: 'Status must be "active" or "disabled"' });
        return;
      }

      const installation = await PackageInstallation.findOne({
        packageId: req.params.packageId as string,
        tenantId: null,
      });
      if (!installation) {
        res.status(404).json({ success: false, error: 'Package not installed' });
        return;
      }

      installation.status = status;
      await installation.save();

      res.json({ success: true, data: installation });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/** POST /:packageId/health — Run a health check on an installed package. */
router.post(
  '/:packageId/health',
  authenticate,
  requireRole('platform_admin', 'admin'),
  async (req: Request, res: Response) => {
    try {
      const pkg = await Package.findOne({
        packageId: req.params.packageId as string,
      });
      if (!pkg) {
        res.status(404).json({ success: false, error: 'Package not found' });
        return;
      }

      const installation = await PackageInstallation.findOne({
        packageId: pkg.packageId,
        tenantId: null,
      });
      if (!installation) {
        res.status(404).json({ success: false, error: 'Package not installed' });
        return;
      }

      try {
        const healthUrl = `${pkg.serviceUrl}${pkg.healthEndpoint}`;
        const healthRes = await fetch(healthUrl, { signal: AbortSignal.timeout(5000) });
        const healthData = await healthRes.json().catch(() => ({}));

        const healthStatus = healthRes.ok ? 'healthy' : 'unhealthy';
        installation.lastHealthCheck = new Date();
        installation.lastHealthStatus = healthStatus;
        installation.errorMessage = healthRes.ok ? null : 'Health check failed';
        await installation.save();

        res.json({
          success: true,
          data: {
            status: healthStatus,
            serviceResponse: healthData,
            checkedAt: installation.lastHealthCheck,
          },
        });
      } catch (err: any) {
        installation.lastHealthCheck = new Date();
        installation.lastHealthStatus = 'unhealthy';
        installation.errorMessage = err.message;
        await installation.save();

        res.json({
          success: true,
          data: {
            status: 'unhealthy',
            error: err.message,
            checkedAt: installation.lastHealthCheck,
          },
        });
      }
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

export default router;
