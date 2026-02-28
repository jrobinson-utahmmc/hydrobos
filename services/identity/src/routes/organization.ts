import { Router, Request, Response } from 'express';
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
 * GET / — Get current organization settings
 */
router.get('/', requireAdmin, async (_req: Request, res: Response) => {
  try {
    const org = await Organization.findOne();
    if (!org) {
      res.json({ configured: false });
      return;
    }
    res.json({ configured: true, data: org });
  } catch (error) {
    console.error('Get org error:', error);
    res.status(500).json({ error: 'Failed to fetch organization' });
  }
});

/**
 * PUT / — Create or update organization settings
 */
router.put('/', requireAdmin, async (req: Request, res: Response) => {
  try {
    const {
      name,
      domain,
      logoUrl,
      primaryColor,
      timezone,
      locale,
      features,
      contact,
      subscription,
    } = req.body;

    if (!name) {
      res.status(400).json({ error: 'Organization name is required' });
      return;
    }

    // Generate slug from name
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const update: any = {
      name,
      slug,
    };

    if (domain !== undefined) update.domain = domain;
    if (logoUrl !== undefined) update.logoUrl = logoUrl;
    if (primaryColor !== undefined) update.primaryColor = primaryColor;
    if (timezone !== undefined) update.timezone = timezone;
    if (locale !== undefined) update.locale = locale;
    if (features !== undefined) update.features = features;
    if (contact !== undefined) update.contact = contact;
    if (subscription !== undefined) update.subscription = subscription;

    const org = await Organization.findOneAndUpdate(
      {},
      {
        $set: update,
        $setOnInsert: { createdBy: (req as any).user.userId },
      },
      { upsert: true, new: true }
    );

    res.json({ message: 'Organization settings saved', data: org });
  } catch (error) {
    console.error('Save org error:', error);
    res.status(500).json({ error: 'Failed to save organization settings' });
  }
});

export default router;
