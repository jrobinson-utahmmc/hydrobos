import { useState, useEffect } from 'react';
import {
  Puzzle, Plus, ArrowLeft, Search, BarChart2, TrendingUp,
  PieChart, Table, Grid3x3, Bell, FileText, Globe, Image,
  Plug, AreaChart, Loader2, ChevronRight, X, Save, Eye,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../services/api';

// ── Types ──

interface WidgetTemplate {
  _id: string;
  name: string;
  description: string;
  category: string;
  type: string;
  defaultConfig: any;
  defaultDataSource: any;
  defaultChartConfig?: any;
  defaultTableConfig?: any;
  defaultKpiConfig?: any;
}

interface Dashboard {
  _id: string;
  name: string;
  description?: string;
  icon?: string;
}

const typeIcons: Record<string, any> = {
  'kpi': TrendingUp,
  'line-chart': TrendingUp,
  'bar-chart': BarChart2,
  'area-chart': AreaChart,
  'donut-chart': PieChart,
  'table': Table,
  'status-grid': Grid3x3,
  'alert-feed': Bell,
  'text': FileText,
  'iframe': Globe,
  'image': Image,
  'custom': Plug,
};

const categoryColors: Record<string, string> = {
  analytics: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  monitoring: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  data: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  security: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  network: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  custom: 'bg-slate-100 text-slate-700 dark:bg-slate-700/30 dark:text-slate-400',
};

// ── Steps ──

type Step = 'select-template' | 'configure' | 'data-source' | 'preview';

export function WidgetBuilderPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('select-template');
  const [templates, setTemplates] = useState<WidgetTemplate[]>([]);
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);

  // Builder state
  const [selectedTemplate, setSelectedTemplate] = useState<WidgetTemplate | null>(null);
  const [targetDashboard, setTargetDashboard] = useState<string>('');
  const [widgetConfig, setWidgetConfig] = useState({
    title: '', subtitle: '', icon: '', color: '#3b82f6',
    showHeader: true, refreshable: true,
  });
  const [dataSource, setDataSource] = useState({
    type: 'static', url: '', method: 'GET', refreshInterval: 0,
    authType: 'none', authToken: '', authHeaderName: 'X-API-Key', authApiKey: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [tmplRes, dashRes] = await Promise.all([
        apiRequest<{ data: WidgetTemplate[] }>('/widgets/templates'),
        apiRequest<{ data: Dashboard[] }>('/dashboards'),
      ]);
      setTemplates(tmplRes.data || []);
      setDashboards(dashRes.data || []);
    } catch {
      setError('Unable to load widget templates. Is the Widget Service running?');
    } finally {
      setLoading(false);
    }
  }

  function selectTemplate(t: WidgetTemplate) {
    setSelectedTemplate(t);
    setWidgetConfig({
      title: t.defaultConfig.title || t.name,
      subtitle: t.defaultConfig.subtitle || '',
      icon: t.defaultConfig.icon || '',
      color: t.defaultConfig.color || '#3b82f6',
      showHeader: t.defaultConfig.showHeader ?? true,
      refreshable: t.defaultConfig.refreshable ?? true,
    });
    setDataSource({
      type: t.defaultDataSource.type || 'static',
      url: t.defaultDataSource.url || '',
      method: t.defaultDataSource.method || 'GET',
      refreshInterval: t.defaultDataSource.refreshInterval || 0,
      authType: t.defaultDataSource.authentication?.type || 'none',
      authToken: '', authHeaderName: 'X-API-Key', authApiKey: '',
    });
    setStep('configure');
  }

  async function handleSave() {
    if (!selectedTemplate || !targetDashboard) return;
    try {
      setSaving(true);
      const payload: any = {
        dashboardId: targetDashboard,
        type: selectedTemplate.type,
        config: {
          title: widgetConfig.title,
          subtitle: widgetConfig.subtitle || undefined,
          icon: widgetConfig.icon || undefined,
          color: widgetConfig.color,
          showHeader: widgetConfig.showHeader,
          refreshable: widgetConfig.refreshable,
        },
        dataSource: {
          type: dataSource.type,
          url: dataSource.url || undefined,
          method: dataSource.method,
          refreshInterval: dataSource.refreshInterval,
          authentication: dataSource.authType !== 'none' ? {
            type: dataSource.authType,
            config: dataSource.authType === 'bearer'
              ? { token: dataSource.authToken }
              : dataSource.authType === 'api-key'
              ? { headerName: dataSource.authHeaderName, apiKey: dataSource.authApiKey }
              : undefined,
          } : undefined,
        },
        position: { x: 0, y: 0, w: 4, h: 3 },
      };

      if (selectedTemplate.defaultChartConfig) payload.chartConfig = selectedTemplate.defaultChartConfig;
      if (selectedTemplate.defaultTableConfig) payload.tableConfig = selectedTemplate.defaultTableConfig;
      if (selectedTemplate.defaultKpiConfig) payload.kpiConfig = selectedTemplate.defaultKpiConfig;

      await apiRequest('/widgets', { method: 'POST', body: JSON.stringify(payload) });
      navigate('/dashboards');
    } catch (err: any) {
      setError(err.message || 'Failed to create widget');
    } finally {
      setSaving(false);
    }
  }

  const filteredTemplates = templates.filter((t) => {
    const matchSearch = !searchQuery
      || t.name.toLowerCase().includes(searchQuery.toLowerCase())
      || t.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCat = filterCategory === 'all' || t.category === filterCategory;
    return matchSearch && matchCat;
  });

  const categories = ['all', ...Array.from(new Set(templates.map((t) => t.category)))];

  // ── Loading state ──
  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
          <p className="text-sm text-[var(--text-secondary)]">Loading Widget Builder...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => step === 'select-template' ? navigate('/') : setStep('select-template')}
          className="p-2 hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-[var(--text-secondary)]" />
        </button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-700 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/20">
            <Puzzle className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-[var(--text-primary)]">Widget Builder</h1>
            <p className="text-xs text-[var(--text-secondary)]">
              {step === 'select-template' && 'Choose a template to get started'}
              {step === 'configure' && 'Configure your widget'}
              {step === 'data-source' && 'Connect a data source'}
              {step === 'preview' && 'Review and save'}
            </p>
          </div>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {(['select-template', 'configure', 'data-source', 'preview'] as Step[]).map((s, i) => {
          const labels = ['Template', 'Configure', 'Data Source', 'Save'];
          const isActive = s === step;
          const isDone = (['select-template', 'configure', 'data-source', 'preview'] as Step[]).indexOf(step) > i;
          return (
            <div key={s} className="flex items-center gap-2">
              <button
                onClick={() => isDone && setStep(s)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-[var(--accent)] text-white'
                    : isDone
                    ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 cursor-pointer'
                    : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'
                }`}
              >
                <span className="w-5 h-5 rounded-full border flex items-center justify-center text-[10px]">
                  {isDone ? '✓' : i + 1}
                </span>
                {labels[i]}
              </button>
              {i < 3 && <ChevronRight className="w-4 h-4 text-[var(--text-secondary)]" />}
            </div>
          );
        })}
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center justify-between bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/50 rounded-xl p-4">
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          <button onClick={() => setError(null)}><X className="w-4 h-4 text-red-500" /></button>
        </div>
      )}

      {/* ─── Step 1: Template selection ─── */}
      {step === 'select-template' && (
        <div className="space-y-4">
          {/* Search & filter */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
              <input
                type="text"
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)]"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setFilterCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                    filterCategory === cat
                      ? 'bg-[var(--accent)] text-white'
                      : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Template grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredTemplates.map((t) => {
              const Icon = typeIcons[t.type] || Plug;
              return (
                <button
                  key={t._id}
                  onClick={() => selectTemplate(t)}
                  className="flex flex-col items-start p-5 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl hover:shadow-md hover:border-[var(--accent)]/30 transition-all text-left group"
                >
                  <div className="flex items-center justify-between w-full mb-3">
                    <div className="w-10 h-10 rounded-lg bg-[var(--bg-tertiary)] flex items-center justify-center group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 transition-colors">
                      <Icon className="w-5 h-5 text-[var(--text-secondary)] group-hover:text-blue-600 dark:group-hover:text-blue-400" />
                    </div>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-medium capitalize ${categoryColors[t.category] || categoryColors.custom}`}>
                      {t.category}
                    </span>
                  </div>
                  <h4 className="text-sm font-semibold text-[var(--text-primary)]">{t.name}</h4>
                  <p className="text-xs text-[var(--text-secondary)] mt-1 line-clamp-2">{t.description}</p>
                  <div className="mt-3 flex items-center gap-1 text-[var(--accent)] text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    <Plus className="w-3.5 h-3.5" /> Use this template
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── Step 2: Configure ─── */}
      {step === 'configure' && selectedTemplate && (
        <div className="max-w-2xl space-y-6">
          <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-6 space-y-5">
            <h3 className="font-medium text-[var(--text-primary)]">Widget Configuration</h3>

            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Title *</label>
              <input
                type="text"
                value={widgetConfig.title}
                onChange={(e) => setWidgetConfig({ ...widgetConfig, title: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Subtitle</label>
              <input
                type="text"
                value={widgetConfig.subtitle}
                onChange={(e) => setWidgetConfig({ ...widgetConfig, subtitle: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)]"
                placeholder="Optional subtitle text"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Accent Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={widgetConfig.color}
                    onChange={(e) => setWidgetConfig({ ...widgetConfig, color: e.target.value })}
                    className="w-10 h-10 rounded-lg border border-[var(--border)] cursor-pointer"
                  />
                  <span className="text-xs text-[var(--text-secondary)] font-mono">{widgetConfig.color}</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Widget Type</label>
                <p className="text-sm text-[var(--text-primary)] bg-[var(--bg-tertiary)] px-3 py-2 rounded-lg">
                  {selectedTemplate.type}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={widgetConfig.showHeader}
                  onChange={(e) => setWidgetConfig({ ...widgetConfig, showHeader: e.target.checked })}
                  className="rounded border-[var(--border)]"
                />
                <span className="text-sm text-[var(--text-primary)]">Show header</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={widgetConfig.refreshable}
                  onChange={(e) => setWidgetConfig({ ...widgetConfig, refreshable: e.target.checked })}
                  className="rounded border-[var(--border)]"
                />
                <span className="text-sm text-[var(--text-primary)]">Auto-refresh</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={() => setStep('select-template')}
              className="px-4 py-2 text-sm rounded-xl border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]"
            >
              Back
            </button>
            <button
              onClick={() => setStep('data-source')}
              className="px-5 py-2 text-sm font-medium rounded-xl bg-[var(--accent)] text-white hover:opacity-90"
            >
              Next: Data Source
            </button>
          </div>
        </div>
      )}

      {/* ─── Step 3: Data source ─── */}
      {step === 'data-source' && (
        <div className="max-w-2xl space-y-6">
          <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-6 space-y-5">
            <h3 className="font-medium text-[var(--text-primary)]">Data Source</h3>

            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Source Type</label>
              <select
                value={dataSource.type}
                onChange={(e) => setDataSource({ ...dataSource, type: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
              >
                <option value="static">Static / Manual Data</option>
                <option value="api">Internal HydroBOS API</option>
                <option value="external-api">External REST API (3rd Party)</option>
                <option value="connector">Data Connector (Coming Soon)</option>
                <option value="websocket">WebSocket (Coming Soon)</option>
              </select>
            </div>

            {(dataSource.type === 'api' || dataSource.type === 'external-api') && (
              <>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">API URL</label>
                  <input
                    type="url"
                    value={dataSource.url}
                    onChange={(e) => setDataSource({ ...dataSource, url: e.target.value })}
                    placeholder="https://api.example.com/v1/data"
                    className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">HTTP Method</label>
                    <select
                      value={dataSource.method}
                      onChange={(e) => setDataSource({ ...dataSource, method: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
                    >
                      <option value="GET">GET</option>
                      <option value="POST">POST</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Refresh Interval (sec)</label>
                    <input
                      type="number"
                      min={0}
                      value={dataSource.refreshInterval}
                      onChange={(e) => setDataSource({ ...dataSource, refreshInterval: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
                    />
                  </div>
                </div>

                {/* Authentication */}
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Authentication</label>
                  <select
                    value={dataSource.authType}
                    onChange={(e) => setDataSource({ ...dataSource, authType: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
                  >
                    <option value="none">None</option>
                    <option value="bearer">Bearer Token</option>
                    <option value="api-key">API Key</option>
                  </select>
                </div>

                {dataSource.authType === 'bearer' && (
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Bearer Token</label>
                    <input
                      type="password"
                      value={dataSource.authToken}
                      onChange={(e) => setDataSource({ ...dataSource, authToken: e.target.value })}
                      placeholder="sk_live_…"
                      className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
                    />
                  </div>
                )}

                {dataSource.authType === 'api-key' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Header Name</label>
                      <input
                        type="text"
                        value={dataSource.authHeaderName}
                        onChange={(e) => setDataSource({ ...dataSource, authHeaderName: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">API Key</label>
                      <input
                        type="password"
                        value={dataSource.authApiKey}
                        onChange={(e) => setDataSource({ ...dataSource, authApiKey: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
                      />
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={() => setStep('configure')}
              className="px-4 py-2 text-sm rounded-xl border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]"
            >
              Back
            </button>
            <button
              onClick={() => setStep('preview')}
              className="px-5 py-2 text-sm font-medium rounded-xl bg-[var(--accent)] text-white hover:opacity-90"
            >
              Next: Preview & Save
            </button>
          </div>
        </div>
      )}

      {/* ─── Step 4: Preview & save ─── */}
      {step === 'preview' && selectedTemplate && (
        <div className="max-w-2xl space-y-6">
          {/* Preview card */}
          <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3 border-b border-[var(--border)] bg-[var(--bg-tertiary)]">
              <Eye className="w-4 h-4 text-[var(--text-secondary)]" />
              <span className="text-sm font-medium text-[var(--text-primary)]">Widget Preview</span>
            </div>
            <div className="p-6">
              <div
                className="border border-dashed border-[var(--border)] rounded-xl p-6 text-center"
                style={{ borderColor: widgetConfig.color }}
              >
                {(() => {
                  const Icon = typeIcons[selectedTemplate.type] || Plug;
                  return <Icon className="w-10 h-10 mx-auto mb-3" style={{ color: widgetConfig.color }} />;
                })()}
                <h4 className="font-semibold text-[var(--text-primary)]">{widgetConfig.title}</h4>
                {widgetConfig.subtitle && (
                  <p className="text-xs text-[var(--text-secondary)] mt-1">{widgetConfig.subtitle}</p>
                )}
                <p className="text-xs text-[var(--text-secondary)] mt-3">
                  Type: <span className="font-mono">{selectedTemplate.type}</span> &middot;
                  Source: <span className="font-mono">{dataSource.type}</span>
                  {dataSource.refreshInterval > 0 && ` · Refresh: ${dataSource.refreshInterval}s`}
                </p>
              </div>
            </div>
          </div>

          {/* Target dashboard selector */}
          <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-6 space-y-4">
            <h3 className="font-medium text-[var(--text-primary)]">Save to Dashboard</h3>

            {dashboards.length === 0 ? (
              <p className="text-sm text-[var(--text-secondary)]">
                No dashboards yet. A default dashboard will be created for you.
              </p>
            ) : (
              <select
                value={targetDashboard}
                onChange={(e) => setTargetDashboard(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
              >
                <option value="">Select a dashboard…</option>
                {dashboards.map((d) => (
                  <option key={d._id} value={d._id}>{d.name}</option>
                ))}
              </select>
            )}
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={() => setStep('data-source')}
              className="px-4 py-2 text-sm rounded-xl border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]"
            >
              Back
            </button>
            <button
              onClick={handleSave}
              disabled={saving || (!targetDashboard && dashboards.length > 0)}
              className="px-5 py-2 text-sm font-medium rounded-xl bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Creating…' : 'Create Widget'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
