// ──────────────────────────────────────
// HydroBOS Widget & Dashboard Types
// ──────────────────────────────────────

export type WidgetType =
  | 'kpi'
  | 'line-chart'
  | 'bar-chart'
  | 'area-chart'
  | 'donut-chart'
  | 'table'
  | 'status-grid'
  | 'alert-feed'
  | 'text'
  | 'iframe'
  | 'image'
  | 'custom';

export type DataSourceType =
  | 'static'        // hardcoded data
  | 'api'           // HydroBOS internal API
  | 'external-api'  // third-party REST endpoint
  | 'connector'     // data from a HydroBOS connector
  | 'websocket'     // real-time stream
  | 'graphql';      // external GraphQL endpoint

export interface DataSource {
  type: DataSourceType;
  url?: string;                // API endpoint (for api/external-api)
  connectorId?: string;        // connector reference
  method?: 'GET' | 'POST';
  headers?: Record<string, string>;
  body?: Record<string, any>;
  refreshInterval?: number;    // seconds, 0 = manual only
  transform?: string;          // JSONPath or JS transform expression
  authentication?: {
    type: 'none' | 'bearer' | 'api-key' | 'basic' | 'oauth2';
    config?: Record<string, string>;
  };
}

export interface WidgetConfig {
  title: string;
  subtitle?: string;
  icon?: string;               // Lucide icon name
  color?: string;              // accent color
  showHeader?: boolean;
  refreshable?: boolean;
}

export interface WidgetPosition {
  x: number;
  y: number;
  w: number;                   // grid columns (1-12)
  h: number;                   // grid rows
  minW?: number;
  minH?: number;
}

export interface Widget {
  _id: string;
  type: WidgetType;
  config: WidgetConfig;
  dataSource: DataSource;
  position: WidgetPosition;
  chartConfig?: ChartConfig;
  tableConfig?: TableConfig;
  kpiConfig?: KpiConfig;
  customConfig?: Record<string, any>;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChartConfig {
  xAxis?: string;              // data field for X axis
  yAxis?: string | string[];   // data field(s) for Y axis
  series?: ChartSeries[];
  stacked?: boolean;
  showLegend?: boolean;
  showGrid?: boolean;
  colors?: string[];
  yAxisLabel?: string;
  xAxisLabel?: string;
}

export interface ChartSeries {
  name: string;
  dataKey: string;
  color?: string;
  type?: 'line' | 'bar' | 'area';
}

export interface TableConfig {
  columns: TableColumn[];
  pageSize?: number;
  sortable?: boolean;
  filterable?: boolean;
  searchable?: boolean;
}

export interface TableColumn {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'date' | 'badge' | 'status' | 'link';
  width?: number;
  sortable?: boolean;
  format?: string;
}

export interface KpiConfig {
  valueField: string;
  labelField?: string;
  changeField?: string;        // field for % change
  changeDirection?: 'up-good' | 'down-good';
  format?: 'number' | 'currency' | 'percent' | 'bytes';
  prefix?: string;
  suffix?: string;
}

// ── Dashboard Layout ──

export interface Dashboard {
  _id: string;
  name: string;
  description?: string;
  icon?: string;
  isDefault?: boolean;
  isTemplate?: boolean;
  columns: number;             // grid column count (default 12)
  widgets: Widget[];
  createdBy: string;
  sharedWith?: string[];       // user/role IDs
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateDashboardDto {
  name: string;
  description?: string;
  icon?: string;
  columns?: number;
  isTemplate?: boolean;
}

export interface CreateWidgetDto {
  dashboardId: string;
  type: WidgetType;
  config: WidgetConfig;
  dataSource: DataSource;
  position: WidgetPosition;
  chartConfig?: ChartConfig;
  tableConfig?: TableConfig;
  kpiConfig?: KpiConfig;
  customConfig?: Record<string, any>;
}

export interface UpdateWidgetDto {
  config?: Partial<WidgetConfig>;
  dataSource?: Partial<DataSource>;
  position?: Partial<WidgetPosition>;
  chartConfig?: Partial<ChartConfig>;
  tableConfig?: Partial<TableConfig>;
  kpiConfig?: Partial<KpiConfig>;
  customConfig?: Record<string, any>;
}
