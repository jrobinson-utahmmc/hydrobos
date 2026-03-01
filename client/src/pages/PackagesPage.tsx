import { useState, useEffect } from 'react';
import {
  Package,
  Search,
  Download,
  Trash2,
  Power,
  PowerOff,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Activity,
  Key,
  Shield,
  Eye,
  EyeOff,
  TestTube,
  RefreshCw,
  Info,
  ExternalLink,
  ChevronRight,
  Check,
  Brain,
  Gauge,
  Link,
} from 'lucide-react';
import { packageApi, integrationApi } from '../services/api';

type Tab = 'browse' | 'installed' | 'integrations';

// Icon map for integrations
const integrationIcons: Record<string, any> = {
  anthropic: Brain,
  'google-pagespeed': Gauge,
  'google-vision': Eye,
  ahrefs: Link,
};

export function PackagesPage() {
  const [activeTab, setActiveTab] = useState<Tab>('browse');

  const tabs = [
    { id: 'browse' as Tab, label: 'Browse Packages', icon: Package },
    { id: 'installed' as Tab, label: 'Installed', icon: Download },
    { id: 'integrations' as Tab, label: 'API Integrations', icon: Key },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
          Package Manager
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Browse, install, and manage packages. Configure platform API integrations.
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 p-1 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              activeTab === tab.id
                ? 'bg-gradient-to-r from-slate-800 to-blue-900 text-white shadow-md shadow-slate-900/25'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'browse' && <BrowseTab />}
      {activeTab === 'installed' && <InstalledTab />}
      {activeTab === 'integrations' && <IntegrationsTab />}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   Browse Packages Tab
   ═══════════════════════════════════════════════ */

function BrowseTab() {
  const [packages, setPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadPackages();
  }, []);

  async function loadPackages() {
    try {
      const res = await packageApi.list(search ? { search } : undefined);
      setPackages(res.data);
    } catch {
      setPackages([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleInstall(packageId: string) {
    setActionLoading(packageId);
    setMessage(null);
    try {
      const res = await packageApi.install(packageId);
      setMessage({ type: 'success', text: res.message });
      await loadPackages();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setActionLoading(null);
    }
  }

  async function handleUninstall(packageId: string) {
    setActionLoading(packageId);
    setMessage(null);
    try {
      const res = await packageApi.uninstall(packageId);
      setMessage({ type: 'success', text: res.message });
      await loadPackages();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setActionLoading(null);
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(true);
      loadPackages();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  if (loading && packages.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--accent)]" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {message && (
        <div
          className={`p-3.5 rounded-xl text-sm flex items-center gap-2.5 animate-fade-in ${
            message.type === 'success'
              ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/50 text-green-700 dark:text-green-400'
              : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-400'
          }`}
        >
          {message.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {message.text}
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search packages..."
          className="w-full pl-10 pr-4 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50"
        />
      </div>

      {/* Package Grid */}
      {packages.length === 0 ? (
        <div className="text-center py-12 text-[var(--text-secondary)]">
          <Package className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="text-sm">No packages found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {packages.map((pkg) => (
            <div
              key={pkg.packageId}
              className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-5 hover:border-[var(--accent)]/30 transition-all"
            >
              {/* Header */}
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Package className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-[var(--text-primary)] truncate">{pkg.name}</h3>
                  <p className="text-xs text-[var(--text-secondary)]">
                    v{pkg.version} &middot; {pkg.category}
                  </p>
                </div>
                {pkg.installed && (
                  <span className="px-2 py-0.5 text-[10px] font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full">
                    Installed
                  </span>
                )}
              </div>

              {/* Description */}
              <p className="text-sm text-[var(--text-secondary)] mb-4 line-clamp-2">
                {pkg.description}
              </p>

              {/* Features tag count */}
              {pkg.features && pkg.features.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {pkg.features.slice(0, 4).map((f: string) => (
                    <span
                      key={f}
                      className="px-2 py-0.5 text-[10px] bg-[var(--bg-tertiary)] text-[var(--text-secondary)] rounded-md"
                    >
                      {f}
                    </span>
                  ))}
                  {pkg.features.length > 4 && (
                    <span className="px-2 py-0.5 text-[10px] text-[var(--text-secondary)]">
                      +{pkg.features.length - 4} more
                    </span>
                  )}
                </div>
              )}

              {/* Required Integrations */}
              {pkg.requiredIntegrations && pkg.requiredIntegrations.length > 0 && (
                <div className="flex items-center gap-1.5 mb-4 text-xs text-[var(--text-secondary)]">
                  <Key className="w-3 h-3" />
                  Requires: {pkg.requiredIntegrations.join(', ')}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                {pkg.installed ? (
                  <button
                    onClick={() => handleUninstall(pkg.packageId)}
                    disabled={actionLoading === pkg.packageId}
                    className="flex-1 px-3 py-2 text-sm text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/50 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {actionLoading === pkg.packageId ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                    Uninstall
                  </button>
                ) : (
                  <button
                    onClick={() => handleInstall(pkg.packageId)}
                    disabled={actionLoading === pkg.packageId}
                    className="flex-1 px-3 py-2 text-sm bg-gradient-to-r from-slate-800 to-blue-900 hover:from-slate-900 hover:to-blue-950 text-white rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-md shadow-slate-900/25"
                  >
                    {actionLoading === pkg.packageId ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    Install
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   Installed Packages Tab
   ═══════════════════════════════════════════════ */

function InstalledTab() {
  const [installations, setInstallations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadInstallations();
  }, []);

  async function loadInstallations() {
    try {
      const res = await packageApi.installations();
      setInstallations(res.data);
    } catch {
      setInstallations([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleToggle(packageId: string, currentStatus: string) {
    const newStatus = currentStatus === 'active' ? 'disabled' : 'active';
    setActionLoading(packageId);
    try {
      await packageApi.setStatus(packageId, newStatus);
      await loadInstallations();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setActionLoading(null);
    }
  }

  async function handleHealthCheck(packageId: string) {
    setActionLoading(`health-${packageId}`);
    try {
      const res = await packageApi.healthCheck(packageId);
      setMessage({
        type: res.data.status === 'healthy' ? 'success' : 'error',
        text: `${packageId}: ${res.data.status}`,
      });
      await loadInstallations();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setActionLoading(null);
    }
  }

  async function handleUninstall(packageId: string) {
    setActionLoading(packageId);
    try {
      await packageApi.uninstall(packageId);
      await loadInstallations();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--accent)]" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {message && (
        <div
          className={`p-3.5 rounded-xl text-sm flex items-center gap-2.5 animate-fade-in ${
            message.type === 'success'
              ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/50 text-green-700 dark:text-green-400'
              : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-400'
          }`}
        >
          {message.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {message.text}
        </div>
      )}

      {installations.length === 0 ? (
        <div className="text-center py-12 text-[var(--text-secondary)]">
          <Download className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="text-sm">No packages installed yet</p>
          <p className="text-xs mt-1">Browse packages and install one to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {installations.map((inst) => {
            const pkg = inst.package || {};
            return (
              <div
                key={inst._id}
                className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      inst.status === 'active'
                        ? 'bg-gradient-to-br from-green-500 to-emerald-600'
                        : 'bg-gradient-to-br from-slate-400 to-slate-500'
                    }`}>
                      <Package className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-medium text-[var(--text-primary)]">
                        {pkg.name || inst.packageId}
                      </h3>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs text-[var(--text-secondary)]">
                          v{pkg.version || '?'}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          inst.status === 'active'
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                            : inst.status === 'disabled'
                            ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                            : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                        }`}>
                          {inst.status}
                        </span>
                        {inst.lastHealthStatus && (
                          <span className={`text-xs flex items-center gap-1 ${
                            inst.lastHealthStatus === 'healthy'
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-red-600 dark:text-red-400'
                          }`}>
                            {inst.lastHealthStatus === 'healthy' ? (
                              <CheckCircle className="w-3 h-3" />
                            ) : (
                              <XCircle className="w-3 h-3" />
                            )}
                            {inst.lastHealthStatus}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleHealthCheck(inst.packageId)}
                      disabled={actionLoading === `health-${inst.packageId}`}
                      className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] rounded-lg transition-all"
                      title="Health Check"
                    >
                      {actionLoading === `health-${inst.packageId}` ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Activity className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => handleToggle(inst.packageId, inst.status)}
                      disabled={actionLoading === inst.packageId}
                      className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] rounded-lg transition-all"
                      title={inst.status === 'active' ? 'Disable' : 'Enable'}
                    >
                      {inst.status === 'active' ? (
                        <PowerOff className="w-4 h-4" />
                      ) : (
                        <Power className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => handleUninstall(inst.packageId)}
                      disabled={actionLoading === inst.packageId}
                      className="p-2 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                      title="Uninstall"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {inst.errorMessage && (
                  <div className="mt-3 p-2.5 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/40 rounded-lg text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    {inst.errorMessage}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   Platform API Integrations Tab
   ═══════════════════════════════════════════════ */

function IntegrationsTab() {
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editKey, setEditKey] = useState('');
  const [saving, setSaving] = useState<string | null>(null);
  const [testing, setTesting] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadIntegrations();
  }, []);

  async function loadIntegrations() {
    try {
      const res = await integrationApi.list();
      setIntegrations(res.data);
    } catch {
      setIntegrations([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveKey(integrationId: string) {
    setSaving(integrationId);
    setMessage(null);
    try {
      const res = await integrationApi.update(integrationId, {
        config: { apiKey: editKey },
        enabled: true,
      });
      setMessage({ type: 'success', text: res.message });
      setEditingId(null);
      setEditKey('');
      await loadIntegrations();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(null);
    }
  }

  async function handleToggle(integrationId: string, currentEnabled: boolean) {
    setSaving(integrationId);
    try {
      await integrationApi.update(integrationId, { enabled: !currentEnabled });
      await loadIntegrations();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(null);
    }
  }

  async function handleTest(integrationId: string) {
    setTesting(integrationId);
    setMessage(null);
    try {
      const res = await integrationApi.test(integrationId);
      setMessage({
        type: res.data.success ? 'success' : 'error',
        text: res.data.message,
      });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setTesting(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--accent)]" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Info banner */}
      <div className="p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800/40 rounded-xl text-sm text-blue-700 dark:text-blue-400 flex items-start gap-3">
        <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-medium">Platform API Integrations</p>
          <p className="mt-1 text-xs opacity-80">
            API keys configured here are shared across all installed packages that require them.
            Keys are stored securely and masked in the UI.
          </p>
        </div>
      </div>

      {message && (
        <div
          className={`p-3.5 rounded-xl text-sm flex items-center gap-2.5 animate-fade-in ${
            message.type === 'success'
              ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/50 text-green-700 dark:text-green-400'
              : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-400'
          }`}
        >
          {message.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {message.text}
        </div>
      )}

      {/* Integration cards */}
      <div className="space-y-3">
        {integrations.map((integration) => {
          const IconComponent = integrationIcons[integration.integrationId] || Key;
          const isConfigured = integration.config?.configured;

          return (
            <div
              key={integration.integrationId}
              className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    isConfigured && integration.enabled
                      ? 'bg-gradient-to-br from-green-500 to-emerald-600'
                      : 'bg-gradient-to-br from-slate-300 to-slate-400 dark:from-slate-600 dark:to-slate-700'
                  }`}>
                    <IconComponent className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-medium text-[var(--text-primary)]">{integration.name}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-[var(--text-secondary)]">
                        {integration.provider} &middot; {integration.category}
                      </span>
                      {isConfigured ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                          Configured
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                          Not configured
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isConfigured && (
                    <>
                      <button
                        onClick={() => handleTest(integration.integrationId)}
                        disabled={testing === integration.integrationId}
                        className="px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] rounded-lg transition-all flex items-center gap-1.5"
                      >
                        {testing === integration.integrationId ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <TestTube className="w-3.5 h-3.5" />
                        )}
                        Test
                      </button>
                      <button
                        onClick={() => handleToggle(integration.integrationId, integration.enabled)}
                        disabled={saving === integration.integrationId}
                        className={`relative w-11 h-6 rounded-full transition-colors ${
                          integration.enabled
                            ? 'bg-green-500'
                            : 'bg-slate-300 dark:bg-slate-600'
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                            integration.enabled ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => {
                      if (editingId === integration.integrationId) {
                        setEditingId(null);
                        setEditKey('');
                      } else {
                        setEditingId(integration.integrationId);
                        setEditKey('');
                      }
                    }}
                    className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] rounded-lg transition-all"
                    title="Set API Key"
                  >
                    <Key className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Description */}
              <p className="text-xs text-[var(--text-secondary)] mt-2">{integration.description}</p>

              {/* Current masked key */}
              {isConfigured && integration.config?.apiKey && (
                <div className="mt-3 text-xs text-[var(--text-secondary)] font-mono bg-[var(--bg-tertiary)] px-3 py-1.5 rounded-lg inline-block">
                  {integration.config.apiKey}
                </div>
              )}

              {/* Used by packages */}
              {integration.usedByPackages && integration.usedByPackages.length > 0 && (
                <div className="mt-2 text-xs text-[var(--text-secondary)] flex items-center gap-1.5">
                  <Package className="w-3 h-3" />
                  Used by: {integration.usedByPackages.join(', ')}
                </div>
              )}

              {/* API Key editor */}
              {editingId === integration.integrationId && (
                <div className="mt-4 p-4 bg-[var(--bg-tertiary)] rounded-xl space-y-3 animate-fade-in">
                  <label className="block text-sm font-medium text-[var(--text-primary)]">
                    {isConfigured ? 'Update' : 'Set'} API Key
                  </label>
                  <input
                    type="password"
                    value={editKey}
                    onChange={(e) => setEditKey(e.target.value)}
                    placeholder={`Enter ${integration.name} API key...`}
                    className="w-full px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] font-mono focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSaveKey(integration.integrationId)}
                      disabled={!editKey || saving === integration.integrationId}
                      className="px-4 py-2 text-sm bg-gradient-to-r from-slate-800 to-blue-900 hover:from-slate-900 hover:to-blue-950 text-white rounded-lg transition-all disabled:opacity-50 flex items-center gap-2 shadow-md shadow-slate-900/25"
                    >
                      {saving === integration.integrationId ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                      Save Key
                    </button>
                    <button
                      onClick={() => {
                        setEditingId(null);
                        setEditKey('');
                      }}
                      className="px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] rounded-lg transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
