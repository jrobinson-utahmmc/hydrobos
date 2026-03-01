import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { User } from '../models/User';
import { verifyToken } from '../utils/jwt';
import { audit, performerFromReq } from '../utils/audit';
import { AuditLog } from '../models/AuditLog';

const router = Router();

// ──────────────────────────────────────
// Middleware
// ──────────────────────────────────────

function requireAuth(req: Request, res: Response, next: Function) {
  const token = req.cookies?.token || req.headers.authorization?.replace('Bearer ', '');
  if (!token) { res.status(401).json({ error: 'Authentication required' }); return; }
  try {
    const decoded = verifyToken(token);
    (req as any).user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

/**
 * Middleware: require auth + admin role
 */
function requireAdmin(req: Request, res: Response, next: Function) {
  requireAuth(req, res, () => {
    const user = (req as any).user;
    if (!['platform_admin', 'admin'].includes(user.role)) {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }
    next();
  });
}

// ──────────────────────────────────────
// GET /audit/logs — Return audit logs (admin only)
// Must be defined BEFORE /:id to prevent route conflict
// ──────────────────────────────────────
router.get('/audit/logs', requireAdmin, async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = Math.min(parseInt(req.query.pageSize as string) || 50, 200);
    const category = req.query.category as string;

    const filter: any = {};
    if (category && category !== 'all') {
      filter.category = category;
    }

    const [data, total] = await Promise.all([
      AuditLog.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize),
      AuditLog.countDocuments(filter),
    ]);

    res.json({
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error('List audit logs error:', error);
    res.status(500).json({ error: 'Failed to list audit logs' });
  }
});

/**
 * GET / — List users (admin only)
 * Supports: search, role filter, status filter, pagination, sorting
 */
router.get('/', requireAdmin, async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = Math.min(parseInt(req.query.pageSize as string) || 25, 100);
    const search = req.query.search as string;
    const role = req.query.role as string;
    const status = req.query.status as string;
    const sort = (req.query.sort as string) || 'createdAt';
    const order = req.query.order === 'asc' ? 1 : -1;

    const filter: any = {};

    if (search) {
      filter.$or = [
        { email: { $regex: search, $options: 'i' } },
        { displayName: { $regex: search, $options: 'i' } },
        { jobTitle: { $regex: search, $options: 'i' } },
        { department: { $regex: search, $options: 'i' } },
      ];
    }

    if (role && role !== 'all') {
      filter.role = role;
    }

    if (status === 'active') filter.isActive = true;
    else if (status === 'disabled') filter.isActive = false;
    else if (status === 'invited') {
      filter.inviteAccepted = false;
      filter.inviteToken = { $exists: true };
    }

    const [data, total] = await Promise.all([
      User.find(filter)
        .sort({ [sort]: order })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .select('-password -resetToken -inviteToken'),
      User.countDocuments(filter),
    ]);

    res.json({
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error('List users error:', error);
    res.status(500).json({ error: 'Failed to list users' });
  }
});

/**
 * GET /:id — Get single user (admin only)
 */
router.get('/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.params.id).select('-password -resetToken -inviteToken');
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json({ data: user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

/**
 * POST / — Create a local user (admin only)
 */
router.post('/', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { email, password, displayName, role, jobTitle, department } = req.body;

    if (!email || !password || !displayName) {
      res.status(400).json({ error: 'Email, password, and display name are required' });
      return;
    }

    if (password.length < 12) {
      res.status(400).json({ error: 'Password must be at least 12 characters' });
      return;
    }

    const user = new User({
      email,
      password,
      displayName,
      role: role || 'user',
      jobTitle,
      department,
      authProvider: 'local',
      emailVerified: true,
      inviteAccepted: true,
    });

    await user.save();

    await audit({
      action: 'user.created',
      category: 'user',
      performedBy: performerFromReq(req),
      target: { type: 'user', id: user._id.toString(), label: user.email },
      details: { role: user.role, displayName: user.displayName },
      req,
    });

    res.status(201).json({ user: user.toJSON() });
  } catch (error: any) {
    if (error.code === 11000) {
      res.status(400).json({ error: 'Email already in use' });
      return;
    }
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

/**
 * POST /invite — Invite a new user (admin only)
 * Generates an invite token; user sets password via the acceptance page.
 */
router.post('/invite', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { email, displayName, role, jobTitle, department } = req.body;

    if (!email || !displayName) {
      res.status(400).json({ error: 'Email and display name are required' });
      return;
    }

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      res.status(400).json({ error: 'A user with this email already exists' });
      return;
    }

    const inviteToken = crypto.randomBytes(32).toString('hex');
    const inviteExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const user = new User({
      email,
      displayName,
      role: role || 'user',
      jobTitle,
      department,
      authProvider: 'local',
      inviteToken,
      inviteExpires,
      inviteAccepted: false,
      emailVerified: false,
      isActive: true,
    });

    await user.save();

    const baseUrl = req.headers.origin || 'http://localhost:5000';
    const inviteUrl = `${baseUrl}/invite?token=${inviteToken}`;

    console.log(`\n  📧 Invite sent to ${email}`);
    console.log(`  └─ Accept URL: ${inviteUrl}\n`);

    await audit({
      action: 'user.invited',
      category: 'user',
      performedBy: performerFromReq(req),
      target: { type: 'user', id: user._id.toString(), label: user.email },
      details: { role: user.role, displayName: user.displayName },
      req,
    });

    res.status(201).json({
      message: `Invitation created for ${email}`,
      inviteUrl,
      user: user.toJSON(),
    });
  } catch (error: any) {
    if (error.code === 11000) {
      res.status(400).json({ error: 'Email already in use' });
      return;
    }
    console.error('Invite user error:', error);
    res.status(500).json({ error: 'Failed to invite user' });
  }
});

/**
 * POST /invite/resend — Resend an invitation (admin only)
 */
router.post('/invite/resend', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      res.status(400).json({ error: 'userId is required' });
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    if (user.inviteAccepted) {
      res.status(400).json({ error: 'User has already accepted the invitation' });
      return;
    }

    const inviteToken = crypto.randomBytes(32).toString('hex');
    user.inviteToken = inviteToken;
    user.inviteExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await user.save();

    const baseUrl = req.headers.origin || 'http://localhost:5000';
    const inviteUrl = `${baseUrl}/invite?token=${inviteToken}`;

    console.log(`\n  📧 Invite re-sent to ${user.email}`);
    console.log(`  └─ Accept URL: ${inviteUrl}\n`);

    await audit({
      action: 'user.invite_resent',
      category: 'user',
      performedBy: performerFromReq(req),
      target: { type: 'user', id: user._id.toString(), label: user.email },
      req,
    });

    res.json({ message: `Invitation resent to ${user.email}`, inviteUrl });
  } catch (error) {
    console.error('Resend invite error:', error);
    res.status(500).json({ error: 'Failed to resend invitation' });
  }
});

/**
 * PATCH /:id — Update user (admin only)
 */
router.patch('/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { displayName, role, isActive, jobTitle, department, phone } = req.body;
    const update: any = {};
    const changes: Record<string, any> = {};

    if (displayName !== undefined) { update.displayName = displayName; changes.displayName = displayName; }
    if (role !== undefined) { update.role = role; changes.role = role; }
    if (isActive !== undefined) { update.isActive = isActive; changes.isActive = isActive; }
    if (jobTitle !== undefined) { update.jobTitle = jobTitle; changes.jobTitle = jobTitle; }
    if (department !== undefined) { update.department = department; changes.department = department; }
    if (phone !== undefined) { update.phone = phone; changes.phone = phone; }

    const user = await User.findByIdAndUpdate(req.params.id, update, { new: true }).select('-password -resetToken -inviteToken');
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const action = isActive === false ? 'user.deactivated' : isActive === true ? 'user.reactivated' : 'user.updated';

    await audit({
      action,
      category: 'user',
      performedBy: performerFromReq(req),
      target: { type: 'user', id: user._id.toString(), label: user.email },
      details: changes,
      req,
    });

    res.json({ user });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

/**
 * DELETE /:id — Soft-delete (deactivate) user
 */
router.delete('/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    ).select('-password -resetToken -inviteToken');

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    await audit({
      action: 'user.deactivated',
      category: 'user',
      performedBy: performerFromReq(req),
      target: { type: 'user', id: user._id.toString(), label: user.email },
      req,
    });

    res.json({ message: 'User deactivated', user });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to deactivate user' });
  }
});

export default router;
