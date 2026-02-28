import { useState, useEffect, type FormEvent } from 'react';
import {
  Settings,
  Building2,
  Users,
  Shield,
  Database,
  Plus,
  Trash2,
  RefreshCw,
  Check,
  X,
  AlertCircle,
  Loader2,
  Copy,
  ExternalLink,
  Globe,
  Key,
  Server,
  ChevronRight,
  Info,
} from 'lucide-react';
import { organizationApi, tenantApi, ssoConfigApi, authApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

type AdminTab = 'organization' | 'tenants' | 'sso' | 'users';

export function AdminPage() {
  const [activeTab, setActiveTab] = useState<AdminTab>('organization');
  const { user } = useAuth();

  const tabs = [
    { id: 'organization' as AdminTab, label: 'Organization', icon: Building2 },
    { id: 'tenants' as AdminTab, label: 'Tenants', icon: Database },
    { id: 'sso' as AdminTab, label: 'Entra ID SSO', icon: Shield },
    { id: 'users' as AdminTab, label: 'Users', icon: Users },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
          Admin Settings
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Manage your organization, tenants, SSO, and user accounts.
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
                ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md shadow-blue-500/20'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'organization' && <OrganizationTab />}
      {activeTab === 'tenants' && <TenantsTab />}
      {activeTab === 'sso' && <SsoTab />}
      {activeTab === 'users' && <UsersTab />}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   Organization Settings Tab
   ═══════════════════════════════════════════════ */

function OrganizationTab() {
  const [form, setForm] = useState({
    name: '',
    domain: '',
    primaryColor: '#2563eb',
    timezone: 'America/Chicago',
    locale: 'en-US',
    contactEmail: '',
    contactPhone: '',
    website: '',
    address: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadOrg();
  }, []);

  async function loadOrg() {
    try {
      const res = await organizationApi.get();
      if (res.configured && res.data) {
        const d = res.data;
        setForm({
          name: d.name || '',
          domain: d.domain || '',
          primaryColor: d.primaryColor || '#2563eb',
          timezone: d.timezone || 'America/Chicago',
          locale: d.locale || 'en-US',
          contactEmail: d.contact?.email || '',
          contactPhone: d.contact?.phone || '',
          website: d.contact?.website || '',
          address: d.contact?.address || '',
        });
      }
    } catch {
      // Not configured yet
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await organizationApi.save({
        name: form.name,
        domain: form.domain || undefined,
        primaryColor: form.primaryColor,
        timezone: form.timezone,
        locale: form.locale,
        contact: {
          email: form.contactEmail,
          phone: form.contactPhone,
          website: form.website,
          address: form.address,
        },
      });
      setMessage({ type: 'success', text: 'Organization settings saved' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to save' });
    } finally {
      setSaving(false);
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
    <form onSubmit={handleSave} className="max-w-2xl space-y-6">
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

      {/* Organization Name */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-6 space-y-4">
        <h3 className="font-medium text-[var(--text-primary)] flex items-center gap-2">
          <Building2 className="w-5 h-5 text-[var(--accent)]" />
          General Information
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
              Organization Name *
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50"
              placeholder="Acme Corporation"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
              Domain
            </label>
            <input
              type="text"
              value={form.domain}
              onChange={(e) => setForm({ ...form, domain: e.target.value })}
              className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50"
              placeholder="acme.com"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
              Brand Color
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={form.primaryColor}
                onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
                className="w-10 h-10 rounded-lg border border-[var(--border)] cursor-pointer"
              />
              <input
                type="text"
                value={form.primaryColor}
                onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
                className="flex-1 px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] font-mono"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
              Timezone
            </label>
            <select
              value={form.timezone}
              onChange={(e) => setForm({ ...form, timezone: e.target.value })}
              className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50"
            >
              <option value="America/New_York">Eastern (ET)</option>
              <option value="America/Chicago">Central (CT)</option>
              <option value="America/Denver">Mountain (MT)</option>
              <option value="America/Los_Angeles">Pacific (PT)</option>
              <option value="UTC">UTC</option>
              <option value="Europe/London">London (GMT/BST)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
              Locale
            </label>
            <select
              value={form.locale}
              onChange={(e) => setForm({ ...form, locale: e.target.value })}
              className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50"
            >
              <option value="en-US">English (US)</option>
              <option value="en-GB">English (UK)</option>
              <option value="es-ES">Spanish</option>
              <option value="fr-FR">French</option>
              <option value="de-DE">German</option>
            </select>
          </div>
        </div>
      </div>

      {/* Contact Info */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-6 space-y-4">
        <h3 className="font-medium text-[var(--text-primary)] flex items-center gap-2">
          <Globe className="w-5 h-5 text-[var(--accent)]" />
          Contact Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Email</label>
            <input
              type="email"
              value={form.contactEmail}
              onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
              className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50"
              placeholder="admin@acme.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Phone</label>
            <input
              type="tel"
              value={form.contactPhone}
              onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
              className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50"
              placeholder="+1 (555) 123-4567"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Website</label>
            <input
              type="url"
              value={form.website}
              onChange={(e) => setForm({ ...form, website: e.target.value })}
              className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50"
              placeholder="https://acme.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Address</label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50"
              placeholder="123 Main St, City, ST"
            />
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={saving || !form.name}
        className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium rounded-xl transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-blue-500/25 text-sm"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
        Save Organization Settings
      </button>
    </form>
  );
}

/* ═══════════════════════════════════════════════
   Tenants Tab
   ═══════════════════════════════════════════════ */

function TenantsTab() {
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [newTenant, setNewTenant] = useState({
    name: '',
    description: '',
    maxUsers: 25,
    storageQuotaMb: 1024,
    industry: '',
    region: '',
  });

  useEffect(() => {
    loadTenants();
  }, []);

  async function loadTenants() {
    try {
      const res = await tenantApi.list();
      setTenants(res.data);
    } catch {
      // No tenants yet
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setCreating(true);
    setMessage(null);
    try {
      await tenantApi.create({
        name: newTenant.name,
        description: newTenant.description || undefined,
        settings: {
          maxUsers: newTenant.maxUsers,
          storageQuotaMb: newTenant.storageQuotaMb,
        },
        metadata: {
          industry: newTenant.industry || undefined,
          region: newTenant.region || undefined,
        },
      });
      setMessage({ type: 'success', text: `Tenant "${newTenant.name}" created & database provisioned!` });
      setShowCreate(false);
      setNewTenant({ name: '', description: '', maxUsers: 25, storageQuotaMb: 1024, industry: '', region: '' });
      await loadTenants();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to create tenant' });
    } finally {
      setCreating(false);
    }
  }

  async function handleDecommission(id: string) {
    if (!confirm('Decommission this tenant? Their database will be preserved but the tenant will be disabled.')) return;
    try {
      await tenantApi.delete(id);
      setMessage({ type: 'success', text: 'Tenant decommissioned' });
      await loadTenants();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    }
  }

  async function handleProvision(id: string) {
    try {
      await tenantApi.provision(id);
      setMessage({ type: 'success', text: 'Database provisioned successfully' });
      await loadTenants();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
  }

  const statusColors: Record<string, string> = {
    active: 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400',
    provisioning: 'bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400',
    suspended: 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400',
    decommissioned: 'bg-slate-100 dark:bg-slate-700/30 text-slate-500 dark:text-slate-400',
  };

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

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium text-[var(--text-primary)]">Tenant Management</h3>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Each tenant gets a unique ID and isolated database.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl text-sm font-medium shadow-md shadow-blue-500/20 hover:from-blue-700 hover:to-blue-800 transition-all"
        >
          <Plus className="w-4 h-4" />
          New Tenant
        </button>
      </div>

      {/* Create Tenant Form */}
      {showCreate && (
        <form
          onSubmit={handleCreate}
          className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-6 space-y-4 animate-fade-in"
        >
          <h4 className="font-medium text-[var(--text-primary)] flex items-center gap-2">
            <Database className="w-4 h-4 text-[var(--accent)]" />
            Create New Tenant
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                Tenant Name *
              </label>
              <input
                type="text"
                value={newTenant.name}
                onChange={(e) => setNewTenant({ ...newTenant, name: e.target.value })}
                className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50"
                placeholder="Client ABC"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                Description
              </label>
              <input
                type="text"
                value={newTenant.description}
                onChange={(e) => setNewTenant({ ...newTenant, description: e.target.value })}
                className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50"
                placeholder="Production environment for Client ABC"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Max Users</label>
              <input
                type="number"
                value={newTenant.maxUsers}
                onChange={(e) => setNewTenant({ ...newTenant, maxUsers: parseInt(e.target.value) || 25 })}
                className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50"
                min={1}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Storage (MB)</label>
              <input
                type="number"
                value={newTenant.storageQuotaMb}
                onChange={(e) => setNewTenant({ ...newTenant, storageQuotaMb: parseInt(e.target.value) || 1024 })}
                className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50"
                min={256}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Industry</label>
              <input
                type="text"
                value={newTenant.industry}
                onChange={(e) => setNewTenant({ ...newTenant, industry: e.target.value })}
                className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50"
                placeholder="Technology"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Region</label>
              <input
                type="text"
                value={newTenant.region}
                onChange={(e) => setNewTenant({ ...newTenant, region: e.target.value })}
                className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50"
                placeholder="US-Central"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={creating || !newTenant.name}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center gap-2 transition-all"
            >
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
              Create & Provision Database
            </button>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="px-4 py-2 bg-[var(--bg-tertiary)] text-[var(--text-secondary)] rounded-lg text-sm font-medium hover:bg-[var(--bg-secondary)] transition-all"
            >
              Cancel
            </button>
          </div>

          <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800/50 rounded-lg">
            <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-blue-600 dark:text-blue-400">
              Creating a tenant provisions a new MongoDB database with isolated collections for users, dashboards,
              widgets, and audit logs. A unique tenant ID (e.g., <code className="font-mono">tnt_k7x9m2p4</code>) is auto-generated.
            </p>
          </div>
        </form>
      )}

      {/* Tenants List */}
      {tenants.length === 0 ? (
        <div className="bg-[var(--bg-secondary)] border border-[var(--border)] border-dashed rounded-xl p-12 text-center">
          <Database className="w-10 h-10 text-[var(--text-secondary)] mx-auto mb-3 opacity-40" />
          <h4 className="font-medium text-[var(--text-primary)] mb-1">No tenants yet</h4>
          <p className="text-sm text-[var(--text-secondary)]">
            Create your first tenant to start multi-tenant isolation.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {tenants.map((tenant) => (
            <div
              key={tenant._id}
              className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-5 hover:border-[var(--accent)]/20 transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h4 className="font-medium text-[var(--text-primary)]">{tenant.name}</h4>
                    <span
                      className={`px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide rounded-md ${
                        statusColors[tenant.status] || statusColors.active
                      }`}
                    >
                      {tenant.status}
                    </span>
                  </div>
                  {tenant.description && (
                    <p className="text-xs text-[var(--text-secondary)] mt-1">{tenant.description}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-3 mt-3">
                    <div className="flex items-center gap-1.5">
                      <Key className="w-3 h-3 text-[var(--text-secondary)]" />
                      <code className="text-xs font-mono text-[var(--text-primary)] bg-[var(--bg-tertiary)] px-1.5 py-0.5 rounded">
                        {tenant.tenantId}
                      </code>
                      <button
                        onClick={() => copyToClipboard(tenant.tenantId)}
                        className="p-0.5 text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors"
                        title="Copy tenant ID"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                      <Server className="w-3 h-3" />
                      <span className="font-mono">{tenant.database?.name}</span>
                    </div>
                    <div className="text-xs text-[var(--text-secondary)]">
                      {tenant.settings?.maxUsers} users max
                    </div>
                    <div className="text-xs text-[var(--text-secondary)]">
                      {tenant.settings?.storageQuotaMb} MB storage
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {!tenant.database?.provisioned && (
                    <button
                      onClick={() => handleProvision(tenant.tenantId)}
                      className="p-2 text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors"
                      title="Retry provisioning"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  )}
                  {tenant.status !== 'decommissioned' && (
                    <button
                      onClick={() => handleDecommission(tenant.tenantId)}
                      className="p-2 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      title="Decommission tenant"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   Entra ID SSO Tab
   ═══════════════════════════════════════════════ */

function SsoTab() {
  const [form, setForm] = useState({
    enabled: false,
    tenantId: '',
    clientId: '',
    clientSecret: '',
    redirectUri: 'http://localhost:5000/api/auth/sso/callback',
    scopes: 'openid,profile,email',
    autoProvision: true,
    defaultRole: 'user',
    groupRoleMap: [
      { adGroup: '', hydrobosRole: 'admin' },
    ],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadConfig();
  }, []);

  async function loadConfig() {
    try {
      const res = await ssoConfigApi.get();
      if (res.configured && res.config) {
        const c = res.config;
        setConfigured(true);
        setForm({
          enabled: c.enabled || false,
          tenantId: c.tenantId || '',
          clientId: c.clientId || '',
          clientSecret: '', // Never pre-fill
          redirectUri: c.redirectUri || 'http://localhost:5000/api/auth/sso/callback',
          scopes: (c.scopes || ['openid', 'profile', 'email']).join(','),
          autoProvision: c.autoProvision ?? true,
          defaultRole: c.defaultRole || 'user',
          groupRoleMap: c.groupRoleMap
            ? Object.entries(c.groupRoleMap).map(([adGroup, hydrobosRole]) => ({
                adGroup,
                hydrobosRole: hydrobosRole as string,
              }))
            : [{ adGroup: '', hydrobosRole: 'user' }],
        });
      }
    } catch {
      // Not configured
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const groupRoleMap: Record<string, string> = {};
      form.groupRoleMap.forEach((m) => {
        if (m.adGroup.trim()) {
          groupRoleMap[m.adGroup.trim()] = m.hydrobosRole;
        }
      });

      await ssoConfigApi.save({
        enabled: form.enabled,
        tenantId: form.tenantId,
        clientId: form.clientId,
        clientSecret: form.clientSecret,
        redirectUri: form.redirectUri,
        scopes: form.scopes.split(',').map((s) => s.trim()),
        groupRoleMap,
        autoProvision: form.autoProvision,
        defaultRole: form.defaultRole,
      });

      setMessage({ type: 'success', text: 'Entra ID SSO configuration saved' });
      setConfigured(true);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to save SSO config' });
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    setTesting(true);
    setMessage(null);
    try {
      const res = await ssoConfigApi.testConnection();
      if (res.enabled) {
        setMessage({ type: 'success', text: `SSO is active — Provider: ${res.provider}` });
      } else {
        setMessage({ type: 'error', text: 'SSO is not enabled or not properly configured' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Connection test failed' });
    } finally {
      setTesting(false);
    }
  }

  async function handleDelete() {
    if (!confirm('Remove all SSO configuration? Users who sign in via Entra ID will no longer be able to authenticate.')) return;
    try {
      await ssoConfigApi.delete();
      setMessage({ type: 'success', text: 'SSO configuration removed' });
      setConfigured(false);
      setForm({
        enabled: false,
        tenantId: '',
        clientId: '',
        clientSecret: '',
        redirectUri: 'http://localhost:5000/api/auth/sso/callback',
        scopes: 'openid,profile,email',
        autoProvision: true,
        defaultRole: 'user',
        groupRoleMap: [{ adGroup: '', hydrobosRole: 'user' }],
      });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    }
  }

  function addGroupMapping() {
    setForm({
      ...form,
      groupRoleMap: [...form.groupRoleMap, { adGroup: '', hydrobosRole: 'user' }],
    });
  }

  function removeGroupMapping(index: number) {
    setForm({
      ...form,
      groupRoleMap: form.groupRoleMap.filter((_, i) => i !== index),
    });
  }

  function updateGroupMapping(index: number, field: 'adGroup' | 'hydrobosRole', value: string) {
    const updated = [...form.groupRoleMap];
    updated[index] = { ...updated[index], [field]: value };
    setForm({ ...form, groupRoleMap: updated });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--accent)]" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="max-w-3xl space-y-6">
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

      {/* Setup Guide */}
      <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800/50 rounded-xl p-5">
        <h4 className="font-medium text-blue-800 dark:text-blue-300 flex items-center gap-2 mb-3">
          <Shield className="w-5 h-5" />
          Microsoft Entra ID Setup Guide
        </h4>
        <ol className="space-y-2 text-sm text-blue-700 dark:text-blue-400">
          <li className="flex items-start gap-2">
            <span className="w-5 h-5 bg-blue-200 dark:bg-blue-800 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">1</span>
            <span>Go to <strong>Azure Portal</strong> → <strong>Microsoft Entra ID</strong> → <strong>App registrations</strong> → <strong>New registration</strong></span>
          </li>
          <li className="flex items-start gap-2">
            <span className="w-5 h-5 bg-blue-200 dark:bg-blue-800 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">2</span>
            <span>Set the <strong>Redirect URI</strong> to: <code className="font-mono bg-blue-100 dark:bg-blue-800/50 px-1 rounded">{form.redirectUri}</code></span>
          </li>
          <li className="flex items-start gap-2">
            <span className="w-5 h-5 bg-blue-200 dark:bg-blue-800 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">3</span>
            <span>Under <strong>Certificates & secrets</strong>, create a new <strong>Client secret</strong></span>
          </li>
          <li className="flex items-start gap-2">
            <span className="w-5 h-5 bg-blue-200 dark:bg-blue-800 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">4</span>
            <span>Under <strong>API Permissions</strong>, add <code className="font-mono bg-blue-100 dark:bg-blue-800/50 px-1 rounded">User.Read</code> and <code className="font-mono bg-blue-100 dark:bg-blue-800/50 px-1 rounded">GroupMember.Read.All</code> (delegated)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="w-5 h-5 bg-blue-200 dark:bg-blue-800 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">5</span>
            <span>Under <strong>Token configuration</strong>, optionally add <code className="font-mono bg-blue-100 dark:bg-blue-800/50 px-1 rounded">groups</code> claim</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="w-5 h-5 bg-blue-200 dark:bg-blue-800 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">6</span>
            <span>Copy your <strong>Tenant ID</strong>, <strong>Client ID</strong>, and <strong>Client Secret</strong> below</span>
          </li>
        </ol>
      </div>

      {/* Enable toggle */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-[var(--text-primary)]">Enable Entra ID SSO</h3>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Allow users to sign in with their Microsoft account
            </p>
          </div>
          <button
            type="button"
            onClick={() => setForm({ ...form, enabled: !form.enabled })}
            className={`relative w-11 h-6 rounded-full transition-colors ${
              form.enabled ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-sm ${
                form.enabled ? 'translate-x-5' : ''
              }`}
            />
          </button>
        </div>

        {/* Azure AD Credentials */}
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
              Entra Tenant ID *
            </label>
            <input
              type="text"
              value={form.tenantId}
              onChange={(e) => setForm({ ...form, tenantId: e.target.value })}
              className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] font-mono focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50"
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
              Application (Client) ID *
            </label>
            <input
              type="text"
              value={form.clientId}
              onChange={(e) => setForm({ ...form, clientId: e.target.value })}
              className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] font-mono focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50"
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
              Client Secret *
              {configured && (
                <span className="ml-2 text-xs font-normal text-[var(--text-secondary)]">(leave blank to keep current)</span>
              )}
            </label>
            <input
              type="password"
              value={form.clientSecret}
              onChange={(e) => setForm({ ...form, clientSecret: e.target.value })}
              className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] font-mono focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50"
              placeholder={configured ? '••••••••' : 'Enter client secret'}
              required={!configured}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
              Redirect URI
            </label>
            <input
              type="url"
              value={form.redirectUri}
              onChange={(e) => setForm({ ...form, redirectUri: e.target.value })}
              className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] font-mono focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
              Scopes
            </label>
            <input
              type="text"
              value={form.scopes}
              onChange={(e) => setForm({ ...form, scopes: e.target.value })}
              className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50"
              placeholder="openid,profile,email"
            />
          </div>
        </div>
      </div>

      {/* User Provisioning */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-6 space-y-5">
        <h3 className="font-medium text-[var(--text-primary)] flex items-center gap-2">
          <Users className="w-5 h-5 text-[var(--accent)]" />
          User Provisioning
        </h3>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-[var(--text-primary)]">Auto-provision users on first SSO login</p>
            <p className="text-xs text-[var(--text-secondary)]">
              Automatically create HydroBOS accounts when users sign in via Entra ID
            </p>
          </div>
          <button
            type="button"
            onClick={() => setForm({ ...form, autoProvision: !form.autoProvision })}
            className={`relative w-11 h-6 rounded-full transition-colors ${
              form.autoProvision ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-sm ${
                form.autoProvision ? 'translate-x-5' : ''
              }`}
            />
          </button>
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
            Default Role for SSO Users
          </label>
          <select
            value={form.defaultRole}
            onChange={(e) => setForm({ ...form, defaultRole: e.target.value })}
            className="w-full max-w-xs px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50"
          >
            <option value="user">User</option>
            <option value="viewer">Viewer</option>
            <option value="admin">Admin</option>
            <option value="it_operations">IT Operations</option>
            <option value="security_analyst">Security Analyst</option>
            <option value="executive_viewer">Executive Viewer</option>
          </select>
        </div>
      </div>

      {/* Group → Role Mapping */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-[var(--text-primary)] flex items-center gap-2">
              <Key className="w-5 h-5 text-[var(--accent)]" />
              AD Group → Role Mapping
            </h3>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Map Azure AD group names to HydroBOS roles. Highest-priority role wins.
            </p>
          </div>
          <button
            type="button"
            onClick={addGroupMapping}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
          >
            <Plus className="w-3 h-3" />
            Add Mapping
          </button>
        </div>

        <div className="space-y-2">
          {form.groupRoleMap.map((mapping, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                type="text"
                value={mapping.adGroup}
                onChange={(e) => updateGroupMapping(index, 'adGroup', e.target.value)}
                className="flex-1 px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50"
                placeholder="AD Group name (e.g., HydroBOS-Admins)"
              />
              <ChevronRight className="w-4 h-4 text-[var(--text-secondary)]" />
              <select
                value={mapping.hydrobosRole}
                onChange={(e) => updateGroupMapping(index, 'hydrobosRole', e.target.value)}
                className="w-44 px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50"
              >
                <option value="platform_admin">Platform Admin</option>
                <option value="admin">Admin</option>
                <option value="it_operations">IT Operations</option>
                <option value="security_analyst">Security Analyst</option>
                <option value="executive_viewer">Executive Viewer</option>
                <option value="user">User</option>
                <option value="viewer">Viewer</option>
              </select>
              {form.groupRoleMap.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeGroupMapping(index)}
                  className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving || !form.tenantId || !form.clientId}
          className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium rounded-xl transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-blue-500/25 text-sm"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          Save SSO Configuration
        </button>

        <button
          type="button"
          onClick={handleTest}
          disabled={testing || !configured}
          className="px-4 py-2.5 bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border)] rounded-xl text-sm font-medium hover:bg-[var(--bg-secondary)] disabled:opacity-50 flex items-center gap-2 transition-all"
        >
          {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
          Test Connection
        </button>

        {configured && (
          <button
            type="button"
            onClick={handleDelete}
            className="px-4 py-2.5 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/50 rounded-xl text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/10 flex items-center gap-2 transition-all"
          >
            <Trash2 className="w-4 h-4" />
            Remove SSO
          </button>
        )}
      </div>
    </form>
  );
}

/* ═══════════════════════════════════════════════
   Users Tab (basic — list & create)
   ═══════════════════════════════════════════════ */

function UsersTab() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    displayName: '',
    role: 'user',
  });

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    try {
      const res = await apiRequest<{ data: any[] }>('/users');
      setUsers(res.data);
    } catch {
      // Not available
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setCreating(true);
    setMessage(null);
    try {
      await apiRequest('/users', {
        method: 'POST',
        body: JSON.stringify(newUser),
      });
      setMessage({ type: 'success', text: `User "${newUser.displayName}" created` });
      setShowCreate(false);
      setNewUser({ email: '', password: '', displayName: '', role: 'user' });
      await loadUsers();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to create user' });
    } finally {
      setCreating(false);
    }
  }

  async function toggleActive(userId: string, isActive: boolean) {
    try {
      await apiRequest(`/users/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !isActive }),
      });
      await loadUsers();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    }
  }

  const roleColors: Record<string, string> = {
    platform_admin: 'bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400',
    admin: 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400',
    user: 'bg-slate-100 dark:bg-slate-700/30 text-slate-600 dark:text-slate-400',
    viewer: 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400',
    it_operations: 'bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400',
    security_analyst: 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400',
    executive_viewer: 'bg-indigo-100 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400',
  };

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

      <div className="flex items-center justify-between">
        <h3 className="font-medium text-[var(--text-primary)]">User Accounts ({users.length})</h3>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl text-sm font-medium shadow-md shadow-blue-500/20 hover:from-blue-700 hover:to-blue-800 transition-all"
        >
          <Plus className="w-4 h-4" />
          New User
        </button>
      </div>

      {/* Create User Form */}
      {showCreate && (
        <form
          onSubmit={handleCreate}
          className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-6 space-y-4 animate-fade-in"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Display Name *</label>
              <input
                type="text"
                value={newUser.displayName}
                onChange={(e) => setNewUser({ ...newUser, displayName: e.target.value })}
                className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Email *</label>
              <input
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Password * (min 12 chars)</label>
              <input
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50"
                minLength={12}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Role</label>
              <select
                value={newUser.role}
                onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)]"
              >
                <option value="user">User</option>
                <option value="viewer">Viewer</option>
                <option value="admin">Admin</option>
                <option value="it_operations">IT Operations</option>
                <option value="security_analyst">Security Analyst</option>
                <option value="executive_viewer">Executive Viewer</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={creating}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center gap-2"
            >
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Create User
            </button>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="px-4 py-2 bg-[var(--bg-tertiary)] text-[var(--text-secondary)] rounded-lg text-sm font-medium"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Users Table */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)]">
              <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">User</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Role</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Provider</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Last Login</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u._id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--bg-tertiary)] transition-colors">
                <td className="px-4 py-3">
                  <div>
                    <p className="font-medium text-[var(--text-primary)]">{u.displayName}</p>
                    <p className="text-xs text-[var(--text-secondary)]">{u.email}</p>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide rounded-md ${roleColors[u.role] || roleColors.user}`}>
                    {u.role?.replace(/_/g, ' ')}
                  </span>
                </td>
                <td className="px-4 py-3 text-[var(--text-secondary)]">
                  {u.authProvider === 'entra_id' ? (
                    <span className="flex items-center gap-1">
                      <Shield className="w-3 h-3" /> Entra ID
                    </span>
                  ) : (
                    'Local'
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={`flex items-center gap-1.5 text-xs font-medium ${u.isActive ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${u.isActive ? 'bg-green-500' : 'bg-red-500'}`} />
                    {u.isActive ? 'Active' : 'Disabled'}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-[var(--text-secondary)]">
                  {u.lastLogin ? new Date(u.lastLogin).toLocaleDateString() : 'Never'}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => toggleActive(u._id, u.isActive)}
                    className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors ${
                      u.isActive
                        ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
                        : 'text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20'
                    }`}
                  >
                    {u.isActive ? 'Disable' : 'Enable'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Need apiRequest imported at top level for UsersTab
import { apiRequest } from '../services/api';
