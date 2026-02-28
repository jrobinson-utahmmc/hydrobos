import { Router, Request, Response } from 'express';
import { User } from '../models/User';
import { verifyToken } from '../utils/jwt';

const router = Router();

/**
 * Middleware: require auth + admin role
 */
function requireAdmin(req: Request, res: Response, next: Function) {
  const token = req.cookies?.token || req.headers.authorization?.replace('Bearer ', '');
  if (!token) { res.status(401).json({ error: 'Authentication required' }); return; }
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
 * GET / — List users (admin only)
 */
router.get('/', requireAdmin, async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 25;
    const search = req.query.search as string;

    const filter: any = {};
    if (search) {
      filter.$or = [
        { email: { $regex: search, $options: 'i' } },
        { displayName: { $regex: search, $options: 'i' } },
      ];
    }

    const [data, total] = await Promise.all([
      User.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .select('-password'),
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
 * POST / — Create a local user (admin only)
 */
router.post('/', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { email, password, displayName, role } = req.body;

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
      authProvider: 'local',
    });

    await user.save();
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
 * PATCH /:id — Update user (admin only)
 */
router.patch('/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { displayName, role, isActive, jobTitle, department } = req.body;
    const update: any = {};

    if (displayName !== undefined) update.displayName = displayName;
    if (role !== undefined) update.role = role;
    if (isActive !== undefined) update.isActive = isActive;
    if (jobTitle !== undefined) update.jobTitle = jobTitle;
    if (department !== undefined) update.department = department;

    const user = await User.findByIdAndUpdate(req.params.id, update, { new: true }).select('-password');
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

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
    ).select('-password');

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({ message: 'User deactivated', user });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to deactivate user' });
  }
});

export default router;
