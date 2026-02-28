import { WidgetTemplate } from '../models';

/**
 * Seed default widget templates for the Widget Builder.
 * Only inserts if the collection is empty (first run).
 */
export async function seedWidgetTemplates(): Promise<void> {
  const count = await WidgetTemplate.countDocuments();
  if (count > 0) return;

  const templates = [
    {
      name: 'KPI Card',
      description: 'A single key performance indicator with trend arrow',
      category: 'analytics',
      type: 'kpi',
      defaultConfig: { title: 'New KPI', showHeader: true, refreshable: true, icon: 'trending-up', color: '#3b82f6' },
      defaultDataSource: { type: 'static' },
      defaultKpiConfig: { valueField: 'value', labelField: 'label', changeField: 'change', format: 'number' },
    },
    {
      name: 'Line Chart',
      description: 'Time-series line chart for trends and metrics',
      category: 'analytics',
      type: 'line-chart',
      defaultConfig: { title: 'Line Chart', showHeader: true, refreshable: true, icon: 'line-chart' },
      defaultDataSource: { type: 'static', refreshInterval: 30 },
      defaultChartConfig: { xAxis: 'date', yAxis: 'value', showLegend: true, showGrid: true },
    },
    {
      name: 'Bar Chart',
      description: 'Categorical bar chart for comparisons',
      category: 'analytics',
      type: 'bar-chart',
      defaultConfig: { title: 'Bar Chart', showHeader: true, refreshable: true, icon: 'bar-chart-2' },
      defaultDataSource: { type: 'static' },
      defaultChartConfig: { xAxis: 'category', yAxis: 'value', showLegend: false, showGrid: true },
    },
    {
      name: 'Data Table',
      description: 'Sortable, filterable data table from any data source',
      category: 'data',
      type: 'table',
      defaultConfig: { title: 'Data Table', showHeader: true, refreshable: true, icon: 'table' },
      defaultDataSource: { type: 'static' },
      defaultTableConfig: { columns: [], pageSize: 10, sortable: true, filterable: true, searchable: true },
    },
    {
      name: 'Status Grid',
      description: 'Grid of status indicators for monitoring',
      category: 'monitoring',
      type: 'status-grid',
      defaultConfig: { title: 'Status Grid', showHeader: true, refreshable: true, icon: 'grid-3x3' },
      defaultDataSource: { type: 'static', refreshInterval: 15 },
    },
    {
      name: 'Alert Feed',
      description: 'Real-time feed of alerts and notifications',
      category: 'monitoring',
      type: 'alert-feed',
      defaultConfig: { title: 'Alerts', showHeader: true, refreshable: true, icon: 'bell' },
      defaultDataSource: { type: 'static', refreshInterval: 10 },
    },
    {
      name: 'Text / Markdown',
      description: 'Static text, notes, or markdown content',
      category: 'custom',
      type: 'text',
      defaultConfig: { title: 'Notes', showHeader: true, refreshable: false, icon: 'file-text' },
      defaultDataSource: { type: 'static' },
    },
    {
      name: 'Embedded Web Page',
      description: 'Embed any external web page or third-party dashboard',
      category: 'custom',
      type: 'iframe',
      defaultConfig: { title: 'Embedded View', showHeader: true, refreshable: true, icon: 'globe' },
      defaultDataSource: { type: 'external-api', url: '' },
    },
    {
      name: 'Image / Graphic',
      description: 'Display an image, logo, or graphic from a URL',
      category: 'custom',
      type: 'image',
      defaultConfig: { title: 'Image', showHeader: false, refreshable: false, icon: 'image' },
      defaultDataSource: { type: 'static' },
    },
    {
      name: 'External API Widget',
      description: 'Pull data from any REST API and visualize it',
      category: 'data',
      type: 'custom',
      defaultConfig: { title: 'API Data', showHeader: true, refreshable: true, icon: 'plug' },
      defaultDataSource: { type: 'external-api', method: 'GET', refreshInterval: 60, authentication: { type: 'none' } },
    },
    {
      name: 'Area Chart',
      description: 'Filled area chart for volume and trend visualization',
      category: 'analytics',
      type: 'area-chart',
      defaultConfig: { title: 'Area Chart', showHeader: true, refreshable: true, icon: 'area-chart' },
      defaultDataSource: { type: 'static' },
      defaultChartConfig: { xAxis: 'date', yAxis: 'value', showLegend: true, stacked: false },
    },
    {
      name: 'Donut Chart',
      description: 'Proportional donut/pie chart for composition breakdown',
      category: 'analytics',
      type: 'donut-chart',
      defaultConfig: { title: 'Donut Chart', showHeader: true, refreshable: true, icon: 'pie-chart' },
      defaultDataSource: { type: 'static' },
      defaultChartConfig: { showLegend: true },
    },
  ];

  await WidgetTemplate.insertMany(templates);
  console.log(`  ✓ Seeded ${templates.length} widget templates`);
}
