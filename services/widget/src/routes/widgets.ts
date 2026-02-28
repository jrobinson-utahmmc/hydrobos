import { Router, Request, Response } from 'express';
import { Widget, WidgetTemplate } from '../models';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

/**
 * GET /templates — List pre-built widget templates
 */
router.get('/templates', async (_req: Request, res: Response) => {
  try {
    const templates = await WidgetTemplate.find().sort({ category: 1, name: 1 });
    res.json({ data: templates });
  } catch (error) {
    console.error('List templates error:', error);
    res.status(500).json({ error: 'Failed to list widget templates' });
  }
});

/**
 * POST / — Create a widget in a dashboard
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      dashboardId,
      type,
      config: widgetConfig,
      dataSource,
      position,
      chartConfig,
      tableConfig,
      kpiConfig,
      customConfig,
    } = req.body;

    if (!dashboardId || !type || !widgetConfig?.title) {
      res.status(400).json({ error: 'dashboardId, type, and config.title are required' });
      return;
    }

    const widget = new Widget({
      dashboardId,
      type,
      config: widgetConfig,
      dataSource: dataSource || { type: 'static' },
      position: position || { x: 0, y: 0, w: 4, h: 3 },
      chartConfig,
      tableConfig,
      kpiConfig,
      customConfig,
      createdBy: req.user!.userId,
    });

    await widget.save();
    res.status(201).json({ data: widget });
  } catch (error) {
    console.error('Create widget error:', error);
    res.status(500).json({ error: 'Failed to create widget' });
  }
});

/**
 * GET /:id — Get a single widget
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const widget = await Widget.findById(req.params.id);
    if (!widget) {
      res.status(404).json({ error: 'Widget not found' });
      return;
    }
    res.json({ data: widget });
  } catch (error) {
    console.error('Get widget error:', error);
    res.status(500).json({ error: 'Failed to get widget' });
  }
});

/**
 * PATCH /:id — Update a widget
 */
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const {
      config: widgetConfig,
      dataSource,
      position,
      chartConfig,
      tableConfig,
      kpiConfig,
      customConfig,
    } = req.body;

    const update: any = {};
    if (widgetConfig) update.config = widgetConfig;
    if (dataSource) update.dataSource = dataSource;
    if (position) update.position = position;
    if (chartConfig !== undefined) update.chartConfig = chartConfig;
    if (tableConfig !== undefined) update.tableConfig = tableConfig;
    if (kpiConfig !== undefined) update.kpiConfig = kpiConfig;
    if (customConfig !== undefined) update.customConfig = customConfig;

    const widget = await Widget.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!widget) {
      res.status(404).json({ error: 'Widget not found' });
      return;
    }

    res.json({ data: widget });
  } catch (error) {
    console.error('Update widget error:', error);
    res.status(500).json({ error: 'Failed to update widget' });
  }
});

/**
 * PATCH /:id/position — Quick-update position only (for drag-and-drop)
 */
router.patch('/:id/position', async (req: Request, res: Response) => {
  try {
    const { x, y, w, h } = req.body;
    const widget = await Widget.findByIdAndUpdate(
      req.params.id,
      { position: { x, y, w, h } },
      { new: true }
    );

    if (!widget) {
      res.status(404).json({ error: 'Widget not found' });
      return;
    }

    res.json({ data: widget });
  } catch (error) {
    console.error('Update widget position error:', error);
    res.status(500).json({ error: 'Failed to update position' });
  }
});

/**
 * DELETE /:id — Delete a widget
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const widget = await Widget.findByIdAndDelete(req.params.id);
    if (!widget) {
      res.status(404).json({ error: 'Widget not found' });
      return;
    }
    res.json({ message: 'Widget deleted' });
  } catch (error) {
    console.error('Delete widget error:', error);
    res.status(500).json({ error: 'Failed to delete widget' });
  }
});

/**
 * POST /data-proxy — Proxy external data requests (for 3rd-party APIs)
 * Avoids CORS issues by fetching data server-side.
 */
router.post('/data-proxy', async (req: Request, res: Response) => {
  try {
    const { url, method, headers, body: requestBody, authentication } = req.body;

    if (!url) {
      res.status(400).json({ error: 'URL is required' });
      return;
    }

    // Build headers
    const fetchHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers,
    };

    // Apply authentication
    if (authentication?.type === 'bearer' && authentication?.config?.token) {
      fetchHeaders['Authorization'] = `Bearer ${authentication.config.token}`;
    } else if (authentication?.type === 'api-key' && authentication?.config) {
      const { headerName, apiKey } = authentication.config;
      fetchHeaders[headerName || 'X-API-Key'] = apiKey;
    }

    const response = await fetch(url, {
      method: method || 'GET',
      headers: fetchHeaders,
      body: requestBody ? JSON.stringify(requestBody) : undefined,
    });

    const data = await response.json();
    res.json({ data, status: response.status });
  } catch (error: any) {
    console.error('Data proxy error:', error);
    res.status(502).json({ error: 'Failed to fetch external data', details: error.message });
  }
});

export default router;
