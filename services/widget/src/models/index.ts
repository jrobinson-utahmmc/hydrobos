import mongoose, { Schema, Document } from 'mongoose';

// ── Widget Model ──

export interface IWidget extends Document {
  dashboardId: mongoose.Types.ObjectId;
  type: string;
  config: {
    title: string;
    subtitle?: string;
    icon?: string;
    color?: string;
    showHeader?: boolean;
    refreshable?: boolean;
  };
  dataSource: {
    type: string;
    url?: string;
    connectorId?: string;
    method?: string;
    headers?: Map<string, string>;
    body?: any;
    refreshInterval?: number;
    transform?: string;
    authentication?: {
      type: string;
      config?: Map<string, string>;
    };
  };
  position: {
    x: number;
    y: number;
    w: number;
    h: number;
    minW?: number;
    minH?: number;
  };
  chartConfig?: any;
  tableConfig?: any;
  kpiConfig?: any;
  customConfig?: any;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const widgetSchema = new Schema<IWidget>(
  {
    dashboardId: {
      type: Schema.Types.ObjectId,
      ref: 'Dashboard',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        'kpi', 'line-chart', 'bar-chart', 'area-chart', 'donut-chart',
        'table', 'status-grid', 'alert-feed', 'text', 'iframe', 'image', 'custom',
      ],
      required: true,
    },
    config: {
      title: { type: String, required: true },
      subtitle: String,
      icon: String,
      color: String,
      showHeader: { type: Boolean, default: true },
      refreshable: { type: Boolean, default: true },
    },
    dataSource: {
      type: {
        type: String,
        enum: ['static', 'api', 'external-api', 'connector', 'websocket', 'graphql'],
        default: 'static',
      },
      url: String,
      connectorId: String,
      method: { type: String, default: 'GET' },
      headers: { type: Map, of: String },
      body: Schema.Types.Mixed,
      refreshInterval: { type: Number, default: 0 },
      transform: String,
      authentication: {
        type: { type: String, enum: ['none', 'bearer', 'api-key', 'basic', 'oauth2'], default: 'none' },
        config: { type: Map, of: String },
      },
    },
    position: {
      x: { type: Number, required: true, default: 0 },
      y: { type: Number, required: true, default: 0 },
      w: { type: Number, required: true, default: 4 },
      h: { type: Number, required: true, default: 3 },
      minW: Number,
      minH: Number,
    },
    chartConfig: Schema.Types.Mixed,
    tableConfig: Schema.Types.Mixed,
    kpiConfig: Schema.Types.Mixed,
    customConfig: Schema.Types.Mixed,
    createdBy: { type: String, required: true },
  },
  { timestamps: true }
);

export const Widget = mongoose.model<IWidget>('Widget', widgetSchema);

// ── Dashboard Model ──

export interface IDashboard extends Document {
  name: string;
  description?: string;
  icon?: string;
  isDefault?: boolean;
  isTemplate?: boolean;
  columns: number;
  createdBy: string;
  sharedWith?: string[];
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const dashboardSchema = new Schema<IDashboard>(
  {
    name: { type: String, required: true },
    description: String,
    icon: String,
    isDefault: { type: Boolean, default: false },
    isTemplate: { type: Boolean, default: false },
    columns: { type: Number, default: 12 },
    createdBy: { type: String, required: true },
    sharedWith: [String],
    tags: [String],
  },
  { timestamps: true }
);

export const Dashboard = mongoose.model<IDashboard>('Dashboard', dashboardSchema);

// ── Widget Template Model — pre-built widget configs ──

export interface IWidgetTemplate extends Document {
  name: string;
  description: string;
  category: string;
  type: string;
  thumbnail?: string;
  defaultConfig: any;
  defaultDataSource: any;
  defaultChartConfig?: any;
  defaultTableConfig?: any;
  defaultKpiConfig?: any;
  createdAt: Date;
}

const widgetTemplateSchema = new Schema<IWidgetTemplate>(
  {
    name: { type: String, required: true },
    description: { type: String, required: true },
    category: {
      type: String,
      enum: ['monitoring', 'analytics', 'network', 'security', 'custom', 'data'],
      required: true,
    },
    type: { type: String, required: true },
    thumbnail: String,
    defaultConfig: { type: Schema.Types.Mixed, required: true },
    defaultDataSource: { type: Schema.Types.Mixed, required: true },
    defaultChartConfig: Schema.Types.Mixed,
    defaultTableConfig: Schema.Types.Mixed,
    defaultKpiConfig: Schema.Types.Mixed,
  },
  { timestamps: true }
);

export const WidgetTemplate = mongoose.model<IWidgetTemplate>(
  'WidgetTemplate',
  widgetTemplateSchema
);
