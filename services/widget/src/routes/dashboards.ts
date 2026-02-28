import { Router, Request, Response } from 'express';
import { Dashboard, Widget } from '../models';
import { authenticate } from '../middleware/auth';

const router = Router();

// All dashboard routes require auth
router.use(authenticate);

/**
 * GET / — List user's dashboards
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const dashboards = await Dashboard.find({
      $or: [
        { createdBy: req.user!.userId },
        { sharedWith: req.user!.userId },
        { sharedWith: req.user!.role },
        { isTemplate: true },
      ],
    }).sort({ isDefault: -1, updatedAt: -1 });

    res.json({ data: dashboards });
  } catch (error) {
    console.error('List dashboards error:', error);
    res.status(500).json({ error: 'Failed to list dashboards' });
  }
});

/**
 * POST / — Create a dashboard
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, description, icon, columns, isTemplate } = req.body;

    if (!name) {
      res.status(400).json({ error: 'Dashboard name is required' });
      return;
    }

    const dashboard = new Dashboard({
      name,
      description,
      icon,
      columns: columns || 12,
      isTemplate: isTemplate || false,
      createdBy: req.user!.userId,
    });

    await dashboard.save();
    res.status(201).json({ data: dashboard });
  } catch (error) {
    console.error('Create dashboard error:', error);
    res.status(500).json({ error: 'Failed to create dashboard' });
  }
});

/**
 * GET /:id — Get dashboard with widgets
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const dashboard = await Dashboard.findById(req.params.id);
    if (!dashboard) {
      res.status(404).json({ error: 'Dashboard not found' });
      return;
    }

    const widgets = await Widget.find({ dashboardId: dashboard._id }).sort({
      'position.y': 1,
      'position.x': 1,
    });

    res.json({ data: { ...dashboard.toJSON(), widgets } });
  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({ error: 'Failed to get dashboard' });
  }
});

/**
 * PATCH /:id — Update dashboard metadata
 */
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { name, description, icon, columns, sharedWith, tags, isDefault } = req.body;
    const update: any = {};

    if (name !== undefined) update.name = name;
    if (description !== undefined) update.description = description;
    if (icon !== undefined) update.icon = icon;
    if (columns !== undefined) update.columns = columns;
    if (sharedWith !== undefined) update.sharedWith = sharedWith;
    if (tags !== undefined) update.tags = tags;

    // If setting as default, unset all others first
    if (isDefault) {
      await Dashboard.updateMany(
        { createdBy: req.user!.userId },
        { isDefault: false }
      );
      update.isDefault = true;
    }

    const dashboard = await Dashboard.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true }
    );

    if (!dashboard) {
      res.status(404).json({ error: 'Dashboard not found' });
      return;
    }

    res.json({ data: dashboard });
  } catch (error) {
    console.error('Update dashboard error:', error);
    res.status(500).json({ error: 'Failed to update dashboard' });
  }
});

/**
 * DELETE /:id — Delete dashboard and its widgets
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const dashboard = await Dashboard.findByIdAndDelete(req.params.id);
    if (!dashboard) {
      res.status(404).json({ error: 'Dashboard not found' });
      return;
    }

    // Cascade delete widgets
    await Widget.deleteMany({ dashboardId: dashboard._id });

    res.json({ message: 'Dashboard deleted' });
  } catch (error) {
    console.error('Delete dashboard error:', error);
    res.status(500).json({ error: 'Failed to delete dashboard' });
  }
});

export default router;
