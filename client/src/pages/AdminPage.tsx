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
  Search,
  Edit3,
  Mail,
  Send,
  Filter,
  FileText,
  Clock,
  UserPlus,
  ChevronDown,
} from 'lucide-react';
import { organizationApi, tenantApi, ssoConfigApi, authApi, userApi, apiRequest } from '../services/api';
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
    localLoginDisabled: false,
    ssoEnabled: false,
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
          localLoginDisabled: d.features?.localLoginDisabled || false,
          ssoEnabled: d.features?.ssoEnabled || false,
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
        features: {
          localLoginDisabled: form.localLoginDisabled,
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

      {/* Security — Local Login Toggle */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-6 space-y-4">
        <h3 className="font-medium text-[var(--text-primary)] flex items-center gap-2">
          <Shield className="w-5 h-5 text-[var(--accent)]" />
          Authentication Security
        </h3>

        <div className="flex items-center justify-between p-4 bg-[var(--bg-tertiary)] rounded-xl">
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)]">Disable Local Login</p>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              When enabled, users must sign in via SSO. Local email/password login will be blocked.
              {!form.ssoEnabled && (
                <span className="text-amber-600 dark:text-amber-400 ml-1">
                  SSO must be configured before this takes effect.
                </span>
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setForm({ ...form, localLoginDisabled: !form.localLoginDisabled })}
            className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
              form.localLoginDisabled
                ? 'bg-red-500'
                : 'bg-slate-300 dark:bg-slate-600'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                form.localLoginDisabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {form.localLoginDisabled && (
          <div className="p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/40 rounded-xl text-xs text-amber-700 dark:text-amber-400 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Warning</p>
              <p className="mt-0.5">
                Local login will be disabled for all users. Make sure SSO is properly configured and at least one admin can log in via SSO before enabling this.
              </p>
            </div>
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={saving || !form.name}
        className="px-6 py-2.5 bg-gradient-to-r from-slate-800 to-blue-900 hover:from-slate-900 hover:to-blue-950 text-white font-medium rounded-xl transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-slate-900/30 text-sm"
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
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-slate-800 to-blue-900 text-white rounded-xl text-sm font-medium shadow-md shadow-slate-900/20 hover:from-slate-900 hover:to-blue-950 transition-all"
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
              className="px-4 py-2 bg-gradient-to-r from-slate-800 to-blue-900 text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center gap-2 transition-all"
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

          <div className="flex items-start gap-2 p-3 bg-slate-50 dark:bg-slate-800/20 border border-slate-200 dark:border-slate-700/50 rounded-lg">
            <Info className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-slate-600 dark:text-slate-400">
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
      <div className="bg-slate-50 dark:bg-slate-800/20 border border-slate-200 dark:border-slate-700/50 rounded-xl p-5">
        <h4 className="font-medium text-slate-800 dark:text-slate-300 flex items-center gap-2 mb-3">
          <Shield className="w-5 h-5" />
          Microsoft Entra ID Setup Guide
        </h4>
        <ol className="space-y-2 text-sm text-slate-700 dark:text-slate-400">
          <li className="flex items-start gap-2">
            <span className="w-5 h-5 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">1</span>
            <span>Go to <strong>Azure Portal</strong> → <strong>Microsoft Entra ID</strong> → <strong>App registrations</strong> → <strong>New registration</strong></span>
          </li>
          <li className="flex items-start gap-2">
            <span className="w-5 h-5 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">2</span>
            <span>Set the <strong>Redirect URI</strong> to: <code className="font-mono bg-slate-100 dark:bg-slate-700/50 px-1 rounded">{form.redirectUri}</code></span>
          </li>
          <li className="flex items-start gap-2">
            <span className="w-5 h-5 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">3</span>
            <span>Under <strong>Certificates & secrets</strong>, create a new <strong>Client secret</strong></span>
          </li>
          <li className="flex items-start gap-2">
            <span className="w-5 h-5 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">4</span>
            <span>Under <strong>API Permissions</strong>, add <code className="font-mono bg-slate-100 dark:bg-slate-700/50 px-1 rounded">User.Read</code> and <code className="font-mono bg-slate-100 dark:bg-slate-700/50 px-1 rounded">GroupMember.Read.All</code> (delegated)</span>
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
          className="px-6 py-2.5 bg-gradient-to-r from-slate-800 to-blue-900 hover:from-slate-900 hover:to-blue-950 text-white font-medium rounded-xl transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-slate-900/30 text-sm"
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

      {/* User Sync Section */}
      {configured && <SsoSyncSection />}
    </form>
  );
}

/* ═══════════════════════════════════════════════
   SSO User Sync Section
   ═══════════════════════════════════════════════ */

function SsoSyncSection() {
  const [syncStatus, setSyncStatus] = useState<any>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSyncStatus();
  }, []);

  async function loadSyncStatus() {
    try {
      const res = await ssoConfigApi.syncStatus();
      setSyncStatus(res);
    } catch {
      // Not available
    } finally {
      setLoading(false);
    }
  }

  async function handleSync() {
    setSyncing(true);
    setError('');
    setSyncResult(null);
    try {
      const res = await ssoConfigApi.triggerSync();
      setSyncResult(res.result);
      await loadSyncStatus();
    } catch (err: any) {
      setError(err.message || 'Sync failed');
    } finally {
      setSyncing(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="w-5 h-5 animate-spin text-[var(--accent)]" />
      </div>
    );
  }

  return (
    <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-6 space-y-5 mt-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium text-[var(--text-primary)] flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-[var(--accent)]" />
            Microsoft Graph User Sync
          </h3>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Sync users from Azure AD into HydroBOS. Disabled accounts in Entra ID are automatically deactivated.
          </p>
        </div>
        <button
          type="button"
          onClick={handleSync}
          disabled={syncing}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
        >
          {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          {syncing ? 'Syncing...' : 'Sync Now'}
        </button>
      </div>

      {/* Sync Status Cards */}
      {syncStatus && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-[var(--bg-tertiary)] rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-[var(--text-primary)]">{syncStatus.users?.total || 0}</div>
            <div className="text-xs text-[var(--text-secondary)]">Total SSO Users</div>
          </div>
          <div className="bg-[var(--bg-tertiary)] rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{syncStatus.users?.active || 0}</div>
            <div className="text-xs text-[var(--text-secondary)]">Active</div>
          </div>
          <div className="bg-[var(--bg-tertiary)] rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-red-500 dark:text-red-400">{syncStatus.users?.disabled || 0}</div>
            <div className="text-xs text-[var(--text-secondary)]">Disabled</div>
          </div>
        </div>
      )}

      {/* Last Sync Info */}
      {syncStatus?.lastSync && (
        <div className="text-xs text-[var(--text-secondary)] flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" />
          Last synced: {new Date(syncStatus.lastSync.timestamp).toLocaleString()}
          {syncStatus.lastSync.totalGraphUsers !== undefined && (
            <span className="ml-2">
              ({syncStatus.lastSync.created || 0} created, {syncStatus.lastSync.updated || 0} updated, {syncStatus.lastSync.deactivated || 0} deactivated)
            </span>
          )}
        </div>
      )}

      {/* Sync Result */}
      {syncResult && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/50 rounded-lg p-4 text-sm space-y-2 animate-fade-in">
          <div className="font-medium text-green-800 dark:text-green-300 flex items-center gap-2">
            <Check className="w-4 h-4" />
            Sync completed — {syncResult.total} Azure AD users processed
          </div>
          <div className="grid grid-cols-4 gap-3 text-xs">
            <div><span className="font-medium text-green-700 dark:text-green-400">{syncResult.created}</span> created</div>
            <div><span className="font-medium text-blue-700 dark:text-blue-400">{syncResult.updated}</span> updated</div>
            <div><span className="font-medium text-red-700 dark:text-red-400">{syncResult.deactivated}</span> deactivated</div>
            <div><span className="font-medium text-slate-700 dark:text-slate-400">{syncResult.skipped}</span> skipped</div>
          </div>
          {syncResult.errors?.length > 0 && (
            <div className="mt-2 text-xs text-red-600 dark:text-red-400">
              <p className="font-medium">{syncResult.errors.length} error(s):</p>
              <ul className="list-disc list-inside mt-1">
                {syncResult.errors.slice(0, 5).map((e: string, i: number) => (
                  <li key={i}>{e}</li>
                ))}
                {syncResult.errors.length > 5 && <li>...and {syncResult.errors.length - 5} more</li>}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-lg p-3 text-sm text-red-700 dark:text-red-400 flex items-center gap-2 animate-fade-in">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Permissions Note */}
      <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800/30 rounded-lg p-3 text-xs text-blue-700 dark:text-blue-400">
        <p className="font-medium flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5" />
          Required Azure AD Permissions
        </p>
        <p className="mt-1">
          Bulk sync requires <code className="bg-blue-100 dark:bg-blue-800/30 px-1 rounded">User.Read.All</code> and <code className="bg-blue-100 dark:bg-blue-800/30 px-1 rounded">GroupMember.Read.All</code> as <strong>Application</strong> permissions (not delegated) with admin consent granted.
        </p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   Users Tab (basic — list & create)
   ═══════════════════════════════════════════════ */

function UsersTab() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Create / Invite
  const [showCreate, setShowCreate] = useState(false);
  const [createMode, setCreateMode] = useState<'create' | 'invite'>('invite');
  const [creating, setCreating] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);

  // Edit
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({
    displayName: '',
    role: '',
    jobTitle: '',
    department: '',
    phone: '',
  });
  const [saving, setSaving] = useState(false);

  // Audit Logs
  const [showAudit, setShowAudit] = useState(false);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);

  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    displayName: '',
    role: 'user',
    jobTitle: '',
    department: '',
  });

  useEffect(() => {
    loadUsers();
  }, [page, roleFilter, statusFilter]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      loadUsers();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  async function loadUsers() {
    try {
      setLoading(true);
      const res = await userApi.list({
        page,
        pageSize: 25,
        search: search || undefined,
        role: roleFilter !== 'all' ? roleFilter : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      });
      setUsers(res.data);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch {
      // Service unavailable
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setCreating(true);
    setMessage(null);
    setInviteUrl(null);
    try {
      if (createMode === 'invite') {
        const res = await userApi.invite({
          email: newUser.email,
          displayName: newUser.displayName,
          role: newUser.role,
          jobTitle: newUser.jobTitle || undefined,
          department: newUser.department || undefined,
        });
        setMessage({ type: 'success', text: `Invitation sent to ${newUser.email}` });
        setInviteUrl(res.inviteUrl);
      } else {
        await userApi.create({
          email: newUser.email,
          password: newUser.password,
          displayName: newUser.displayName,
          role: newUser.role,
          jobTitle: newUser.jobTitle || undefined,
          department: newUser.department || undefined,
        });
        setMessage({ type: 'success', text: `User "${newUser.displayName}" created` });
        setShowCreate(false);
      }
      setNewUser({ email: '', password: '', displayName: '', role: 'user', jobTitle: '', department: '' });
      await loadUsers();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to create user' });
    } finally {
      setCreating(false);
    }
  }

  async function handleResendInvite(userId: string) {
    try {
      const res = await userApi.resendInvite(userId);
      setMessage({ type: 'success', text: res.message });
      setInviteUrl(res.inviteUrl);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    }
  }

  async function toggleActive(userId: string, isActive: boolean) {
    try {
      await userApi.update(userId, { isActive: !isActive });
      setMessage({ type: 'success', text: isActive ? 'User disabled' : 'User enabled' });
      await loadUsers();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    }
  }

  function openEdit(user: any) {
    setEditingUser(user);
    setEditForm({
      displayName: user.displayName || '',
      role: user.role || 'user',
      jobTitle: user.jobTitle || '',
      department: user.department || '',
      phone: user.phone || '',
    });
  }

  async function handleSaveEdit(e: FormEvent) {
    e.preventDefault();
    if (!editingUser) return;
    setSaving(true);
    try {
      await userApi.update(editingUser._id, editForm);
      setMessage({ type: 'success', text: `User "${editForm.displayName}" updated` });
      setEditingUser(null);
      await loadUsers();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  }

  async function loadAuditLogs() {
    setAuditLoading(true);
    try {
      const res = await userApi.auditLogs({ pageSize: 50, category: 'user' });
      setAuditLogs(res.data);
    } catch {
      // Not available
    } finally {
      setAuditLoading(false);
    }
  }

  function toggleAuditPanel() {
    setShowAudit(!showAudit);
    if (!showAudit) loadAuditLogs();
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

  const allRoles = [
    { value: 'user', label: 'User' },
    { value: 'viewer', label: 'Viewer' },
    { value: 'admin', label: 'Admin' },
    { value: 'it_operations', label: 'IT Operations' },
    { value: 'security_analyst', label: 'Security Analyst' },
    { value: 'executive_viewer', label: 'Executive Viewer' },
    { value: 'platform_admin', label: 'Platform Admin' },
  ];

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
          <span className="flex-1">{message.text}</span>
          <button onClick={() => setMessage(null)} className="opacity-60 hover:opacity-100"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {/* Invite URL display */}
      {inviteUrl && (
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 animate-fade-in">
          <p className="text-sm font-medium text-[var(--text-primary)] mb-2 flex items-center gap-2"><Mail className="w-4 h-4" /> Invitation Link</p>
          <p className="text-xs text-[var(--text-secondary)] mb-2">Share this link with the user. Expires in 7 days.</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs bg-[var(--bg-tertiary)] px-3 py-2 rounded-lg text-[var(--text-primary)] overflow-x-auto">{inviteUrl}</code>
            <button
              onClick={() => { navigator.clipboard.writeText(inviteUrl); setMessage({ type: 'success', text: 'Link copied to clipboard' }); }}
              className="px-3 py-2 bg-[var(--bg-tertiary)] hover:bg-[var(--border)] rounded-lg transition-colors"
            >
              <Copy className="w-4 h-4 text-[var(--text-secondary)]" />
            </button>
          </div>
        </div>
      )}

      {/* Header + Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h3 className="font-medium text-[var(--text-primary)]">User Directory ({total})</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleAuditPanel}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
              showAudit
                ? 'bg-slate-200 dark:bg-slate-700 text-[var(--text-primary)]'
                : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Audit Log
          </button>
          <button
            onClick={() => { setShowCreate(!showCreate); setInviteUrl(null); }}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-slate-800 to-blue-900 text-white rounded-xl text-sm font-medium shadow-md shadow-slate-900/20 hover:from-slate-900 hover:to-blue-950 transition-all"
          >
            <UserPlus className="w-4 h-4" />
            Add User
          </button>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
          <input
            type="text"
            placeholder="Search users by name, email, title, department..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)]"
        >
          <option value="all">All Roles</option>
          {allRoles.map((r) => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)]"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="disabled">Disabled</option>
          <option value="invited">Pending Invite</option>
        </select>
      </div>

      {/* Create / Invite User Form */}
      {showCreate && (
        <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-6 space-y-4 animate-fade-in">
          {/* Mode Toggle */}
          <div className="flex gap-1 p-1 bg-[var(--bg-tertiary)] rounded-lg w-fit">
            <button
              type="button"
              onClick={() => setCreateMode('invite')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                createMode === 'invite'
                  ? 'bg-gradient-to-r from-slate-800 to-blue-900 text-white shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Send className="w-3 h-3" />
              Invite
            </button>
            <button
              type="button"
              onClick={() => setCreateMode('create')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                createMode === 'create'
                  ? 'bg-gradient-to-r from-slate-800 to-blue-900 text-white shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Plus className="w-3 h-3" />
              Direct Create
            </button>
          </div>
          <p className="text-xs text-[var(--text-secondary)]">
            {createMode === 'invite'
              ? 'Send an invitation link. The user will set their own password.'
              : 'Create an account with a password set by you.'}
          </p>
          <form onSubmit={handleCreate} className="space-y-4">
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
              {createMode === 'create' && (
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
              )}
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Role</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)]"
                >
                  {allRoles.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Job Title</label>
                <input
                  type="text"
                  value={newUser.jobTitle}
                  onChange={(e) => setNewUser({ ...newUser, jobTitle: e.target.value })}
                  className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Department</label>
                <input
                  type="text"
                  value={newUser.department}
                  onChange={(e) => setNewUser({ ...newUser, department: e.target.value })}
                  className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={creating}
                className="px-4 py-2 bg-gradient-to-r from-slate-800 to-blue-900 text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center gap-2"
              >
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : createMode === 'invite' ? <Send className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                {createMode === 'invite' ? 'Send Invitation' : 'Create User'}
              </button>
              <button
                type="button"
                onClick={() => { setShowCreate(false); setInviteUrl(null); }}
                className="px-4 py-2 bg-[var(--bg-tertiary)] text-[var(--text-secondary)] rounded-lg text-sm font-medium"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in" onClick={() => setEditingUser(null)}>
          <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-2xl p-6 w-full max-w-lg shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">Edit User</h3>
              <button onClick={() => setEditingUser(null)} className="p-1 hover:bg-[var(--bg-tertiary)] rounded-lg"><X className="w-5 h-5 text-[var(--text-secondary)]" /></button>
            </div>
            <p className="text-sm text-[var(--text-secondary)] mb-4">{editingUser.email}</p>
            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Display Name</label>
                <input
                  type="text"
                  value={editForm.displayName}
                  onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })}
                  className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Role</label>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                  className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)]"
                >
                  {allRoles.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Job Title</label>
                  <input
                    type="text"
                    value={editForm.jobTitle}
                    onChange={(e) => setEditForm({ ...editForm, jobTitle: e.target.value })}
                    className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Department</label>
                  <input
                    type="text"
                    value={editForm.department}
                    onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                    className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Phone</label>
                <input
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-gradient-to-r from-slate-800 to-blue-900 text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center gap-2"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Save Changes
                </button>
                <button type="button" onClick={() => setEditingUser(null)} className="px-4 py-2 bg-[var(--bg-tertiary)] text-[var(--text-secondary)] rounded-lg text-sm font-medium">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Audit Log Panel */}
      {showAudit && (
        <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl overflow-hidden animate-fade-in">
          <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
            <h4 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <FileText className="w-4 h-4" /> User Audit Trail
            </h4>
            <button onClick={() => loadAuditLogs()} className="p-1.5 hover:bg-[var(--bg-tertiary)] rounded-lg"><RefreshCw className="w-3.5 h-3.5 text-[var(--text-secondary)]" /></button>
          </div>
          {auditLoading ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-[var(--accent)]" /></div>
          ) : auditLogs.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-[var(--text-secondary)]">No audit logs yet.</div>
          ) : (
            <div className="max-h-64 overflow-y-auto divide-y divide-[var(--border)]">
              {auditLogs.map((log) => (
                <div key={log._id} className="px-4 py-2.5 flex items-start gap-3 text-xs">
                  <Clock className="w-3.5 h-3.5 text-[var(--text-secondary)] mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-[var(--text-primary)]">{log.performedBy?.email || 'System'}</span>
                    <span className="text-[var(--text-secondary)]"> {formatAuditAction(log.action)}</span>
                    {log.target?.label && <span className="text-[var(--text-secondary)]"> — {log.target.label}</span>}
                    {log.details?.role && <span className="text-[var(--text-secondary)]"> (role: {log.details.role})</span>}
                  </div>
                  <span className="text-[var(--text-secondary)] whitespace-nowrap">{new Date(log.createdAt).toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Users Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-[var(--accent)]" />
        </div>
      ) : (
        <>
          <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">User</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Role</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider hidden md:table-cell">Title / Dept</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider hidden lg:table-cell">Last Login</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-[var(--text-secondary)]">
                      No users found matching your filters.
                    </td>
                  </tr>
                ) : users.map((u) => (
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
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="text-xs text-[var(--text-secondary)]">
                        {u.jobTitle && <p>{u.jobTitle}</p>}
                        {u.department && <p className="opacity-70">{u.department}</p>}
                        {!u.jobTitle && !u.department && <span className="opacity-40">—</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {u.inviteAccepted === false ? (
                        <span className="flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400">
                          <Mail className="w-3 h-3" /> Pending Invite
                        </span>
                      ) : (
                        <span className={`flex items-center gap-1.5 text-xs font-medium ${u.isActive ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${u.isActive ? 'bg-green-500' : 'bg-red-500'}`} />
                          {u.isActive ? 'Active' : 'Disabled'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--text-secondary)] hidden lg:table-cell">
                      {u.lastLogin ? new Date(u.lastLogin).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(u)}
                          className="text-xs px-2 py-1 rounded-lg font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors"
                          title="Edit user"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        {u.inviteAccepted === false && (
                          <button
                            onClick={() => handleResendInvite(u._id)}
                            className="text-xs px-2 py-1 rounded-lg font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                            title="Resend invite"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>
                        )}
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
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between text-sm">
              <p className="text-[var(--text-secondary)]">
                Page {page} of {totalPages} ({total} users)
              </p>
              <div className="flex gap-1">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg text-xs disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg text-xs disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function formatAuditAction(action: string): string {
  const map: Record<string, string> = {
    'user.created': 'created user',
    'user.invited': 'invited user',
    'user.invite_resent': 'resent invite to',
    'user.updated': 'updated user',
    'user.deactivated': 'deactivated user',
    'user.reactivated': 'reactivated user',
    'user.profile_updated': 'updated their profile',
    'auth.password_changed': 'changed their password',
    'auth.password_reset_requested': 'requested a password reset',
    'auth.password_reset_completed': 'completed password reset',
    'auth.invite_accepted': 'accepted their invitation',
  };
  return map[action] || action;
}
