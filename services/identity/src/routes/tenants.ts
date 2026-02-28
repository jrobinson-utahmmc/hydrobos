import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { Tenant, generateTenantId } from '../models/Tenant';
import { Organization } from '../models/Organization';
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
 * GET / — List all tenants (with optional status filter)
 */
router.get('/', requireAdmin, async (req: Request, res: Response) => {
  try {
    const status = req.query.status as string;
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 25;

    const filter: any = {};
    if (status) filter.status = status;

    const [data, total] = await Promise.all([
      Tenant.find(filter)
        .populate('organizationId', 'name slug')
        .sort({ createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize),
      Tenant.countDocuments(filter),
    ]);

    res.json({
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error('List tenants error:', error);
    res.status(500).json({ error: 'Failed to list tenants' });
  }
});

/**
 * GET /:id — Get a single tenant by tenantId or _id
 */
router.get('/:id', requireAdmin, async (req: Request<{id: string}>, res: Response) => {
  try {
    const id: string = req.params.id;
    const tenant = await Tenant.findOne({
      $or: [
        { tenantId: id },
        ...(mongoose.Types.ObjectId.isValid(id) ? [{ _id: id }] : []),
      ],
    }).populate('organizationId', 'name slug');

    if (!tenant) {
      res.status(404).json({ error: 'Tenant not found' });
      return;
    }

    res.json({ data: tenant });
  } catch (error) {
    console.error('Get tenant error:', error);
    res.status(500).json({ error: 'Failed to get tenant' });
  }
});

/**
 * POST / — Create a new tenant & provision its database
 */
router.post('/', requireAdmin, async (req: Request, res: Response) => {
  try {
    const {
      name,
      description,
      settings,
      metadata,
    } = req.body;

    if (!name) {
      res.status(400).json({ error: 'Tenant name is required' });
      return;
    }

    // Get the organization (there should be exactly one)
    const org = await Organization.findOne();
    if (!org) {
      res.status(400).json({
        error: 'Organization must be configured before creating tenants',
      });
      return;
    }

    // Check tenant limit
    const currentCount = await Tenant.countDocuments({
      organizationId: org._id,
      status: { $ne: 'decommissioned' },
    });
    if (currentCount >= org.subscription.maxTenants) {
      res.status(400).json({
        error: `Tenant limit reached (${org.subscription.maxTenants}). Upgrade your plan.`,
      });
      return;
    }

    // Generate tenant ID & slug
    const tenantId = generateTenantId();
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    // Database name derived from tenant ID for isolation
    const dbName = `hydrobos_${tenantId}`;

    const tenant = new Tenant({
      tenantId,
      name,
      slug,
      description,
      organizationId: org._id,
      status: 'provisioning',
      database: {
        name: dbName,
        host: process.env.MONGO_HOST || 'localhost',
        port: parseInt(process.env.MONGO_PORT || '27017', 10),
        provisioned: false,
      },
      settings: {
        maxUsers: settings?.maxUsers || 25,
        storageQuotaMb: settings?.storageQuotaMb || 1024,
        features: settings?.features || ['dashboards', 'widgets', 'reports'],
        customDomain: settings?.customDomain,
      },
      metadata: metadata || {},
      createdBy: (req as any).user.userId,
    });

    await tenant.save();

    // Provision the tenant database (create collections)
    try {
      await provisionTenantDatabase(tenant);
      tenant.status = 'active';
      tenant.database.provisioned = true;
      tenant.database.provisionedAt = new Date();
      await tenant.save();
    } catch (provisionErr) {
      console.error(`Failed to provision DB for ${tenantId}:`, provisionErr);
      // Tenant still exists in "provisioning" state — admin can retry
    }

    res.status(201).json({
      message: 'Tenant created',
      data: tenant,
    });
  } catch (error: any) {
    if (error.code === 11000) {
      res.status(400).json({ error: 'A tenant with this name/slug already exists' });
      return;
    }
    console.error('Create tenant error:', error);
    res.status(500).json({ error: 'Failed to create tenant' });
  }
});

/**
 * PATCH /:id — Update tenant settings
 */
router.patch('/:id', requireAdmin, async (req: Request<{id: string}>, res: Response) => {
  try {
    const { name, description, status, settings, metadata } = req.body;
    const update: any = {};

    if (name !== undefined) {
      update.name = name;
      update.slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    }
    if (description !== undefined) update.description = description;
    if (status !== undefined) update.status = status;
    if (settings !== undefined) update.settings = settings;
    if (metadata !== undefined) update.metadata = metadata;

    const id: string = req.params.id;
    const tenant = await Tenant.findOneAndUpdate(
      {
        $or: [
          { tenantId: id },
          ...(mongoose.Types.ObjectId.isValid(id) ? [{ _id: id }] : []),
        ],
      },
      { $set: update },
      { new: true }
    );

    if (!tenant) {
      res.status(404).json({ error: 'Tenant not found' });
      return;
    }

    res.json({ message: 'Tenant updated', data: tenant });
  } catch (error) {
    console.error('Update tenant error:', error);
    res.status(500).json({ error: 'Failed to update tenant' });
  }
});

/**
 * DELETE /:id — Decommission a tenant (soft-delete)
 */
router.delete('/:id', requireAdmin, async (req: Request<{id: string}>, res: Response) => {
  try {
    const delId: string = req.params.id;
    const tenant = await Tenant.findOneAndUpdate(
      {
        $or: [
          { tenantId: delId },
          ...(mongoose.Types.ObjectId.isValid(delId) ? [{ _id: delId }] : []),
        ],
      },
      { status: 'decommissioned' },
      { new: true }
    );

    if (!tenant) {
      res.status(404).json({ error: 'Tenant not found' });
      return;
    }

    res.json({ message: 'Tenant decommissioned', data: tenant });
  } catch (error) {
    console.error('Delete tenant error:', error);
    res.status(500).json({ error: 'Failed to decommission tenant' });
  }
});

/**
 * POST /:id/provision — Retry provisioning a tenant database
 */
router.post('/:id/provision', requireAdmin, async (req: Request<{id: string}>, res: Response) => {
  try {
    const provId: string = req.params.id;
    const tenant = await Tenant.findOne({
      $or: [
        { tenantId: provId },
        ...(mongoose.Types.ObjectId.isValid(provId) ? [{ _id: provId }] : []),
      ],
    });

    if (!tenant) {
      res.status(404).json({ error: 'Tenant not found' });
      return;
    }

    if (tenant.database.provisioned) {
      res.status(400).json({ error: 'Database already provisioned' });
      return;
    }

    await provisionTenantDatabase(tenant);

    tenant.status = 'active';
    tenant.database.provisioned = true;
    tenant.database.provisionedAt = new Date();
    await tenant.save();

    res.json({ message: 'Database provisioned successfully', data: tenant });
  } catch (error) {
    console.error('Provision tenant error:', error);
    res.status(500).json({ error: 'Failed to provision database' });
  }
});

/**
 * Provision a new MongoDB database for a tenant.
 * Creates the necessary collections and indexes.
 */
async function provisionTenantDatabase(tenant: InstanceType<typeof Tenant>): Promise<void> {
  const { name: dbName, host, port } = tenant.database;
  const connectionUri = `mongodb://${host}:${port}/${dbName}`;

  const tenantConn = await mongoose.createConnection(connectionUri).asPromise();

  try {
    // Create core collections with validation
    await tenantConn.createCollection('users');
    await tenantConn.createCollection('dashboards');
    await tenantConn.createCollection('widgets');
    await tenantConn.createCollection('audit_logs');
    await tenantConn.createCollection('settings');

    // Create indexes
    const usersCollection = tenantConn.collection('users');
    await usersCollection.createIndex({ email: 1 }, { unique: true });
    await usersCollection.createIndex({ role: 1 });

    const dashboardsCollection = tenantConn.collection('dashboards');
    await dashboardsCollection.createIndex({ createdBy: 1 });

    const widgetsCollection = tenantConn.collection('widgets');
    await widgetsCollection.createIndex({ dashboardId: 1 });

    const auditCollection = tenantConn.collection('audit_logs');
    await auditCollection.createIndex({ timestamp: -1 });
    await auditCollection.createIndex({ userId: 1 });

    // Insert a metadata document
    const settingsCollection = tenantConn.collection('settings');
    await settingsCollection.insertOne({
      tenantId: tenant.tenantId,
      tenantName: tenant.name,
      provisionedAt: new Date(),
      version: '1.0.0',
    });

    console.log(`  ✓ Provisioned database '${dbName}' for tenant '${tenant.name}'`);
  } finally {
    await tenantConn.close();
  }
}

export default router;
