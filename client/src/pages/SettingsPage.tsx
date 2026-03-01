import { useState, type FormEvent } from 'react';
import {
  User,
  Lock,
  Palette,
  Bell,
  Shield,
  Save,
  Loader2,
  Check,
  AlertCircle,
  Sun,
  Moon,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { authApi } from '../services/api';
import { useTheme } from '../contexts/ThemeContext';

type SettingsTab = 'profile' | 'appearance' | 'notifications' | 'security';

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');

  const tabs = [
    { id: 'profile' as SettingsTab, label: 'Profile', icon: User },
    { id: 'appearance' as SettingsTab, label: 'Appearance', icon: Palette },
    { id: 'notifications' as SettingsTab, label: 'Notifications', icon: Bell },
    { id: 'security' as SettingsTab, label: 'Security', icon: Shield },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
          Settings
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Manage your profile, preferences, and security settings.
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
      {activeTab === 'profile' && <ProfileTab />}
      {activeTab === 'appearance' && <AppearanceTab />}
      {activeTab === 'notifications' && <NotificationsTab />}
      {activeTab === 'security' && <SecurityTab />}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   Profile Tab
   ═══════════════════════════════════════════════ */

function ProfileTab() {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [form, setForm] = useState({
    displayName: user?.displayName || '',
    email: user?.email || '',
    jobTitle: '',
    department: '',
    phone: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await authApi.updateProfile({
        displayName: form.displayName,
        jobTitle: form.jobTitle,
        department: form.department,
        phone: form.phone,
      });
      setMessage({ type: 'success', text: 'Profile updated successfully.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to update profile.' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {message && (
        <div
          className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm ${
            message.type === 'success'
              ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800'
              : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
          }`}
        >
          {message.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {message.text}
        </div>
      )}

      <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-6 space-y-5">
        {/* Avatar section */}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-gradient-to-br from-slate-900 to-blue-900 rounded-full flex items-center justify-center text-white text-xl font-semibold shadow-lg shadow-slate-900/30">
            {form.displayName?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)]">{form.displayName}</p>
            <p className="text-xs text-[var(--text-secondary)]">{form.email}</p>
            <span className="inline-flex items-center mt-1 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide bg-slate-100 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 rounded-md">
              {user?.role?.replace(/_/g, ' ') || 'User'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FieldInput label="Display Name" value={form.displayName} onChange={(v) => setForm({ ...form, displayName: v })} />
          <FieldInput label="Email" value={form.email} disabled />
          <FieldInput label="Job Title" value={form.jobTitle} onChange={(v) => setForm({ ...form, jobTitle: v })} placeholder="e.g., IT Administrator" />
          <FieldInput label="Department" value={form.department} onChange={(v) => setForm({ ...form, department: v })} placeholder="e.g., Information Technology" />
          <FieldInput label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} placeholder="+1 (555) 000-0000" type="tel" />
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Timezone</label>
            <select
              value={form.timezone}
              onChange={(e) => setForm({ ...form, timezone: e.target.value })}
              className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50"
            >
              <option value="America/New_York">Eastern Time (ET)</option>
              <option value="America/Chicago">Central Time (CT)</option>
              <option value="America/Denver">Mountain Time (MT)</option>
              <option value="America/Los_Angeles">Pacific Time (PT)</option>
              <option value="America/Anchorage">Alaska Time (AKT)</option>
              <option value="Pacific/Honolulu">Hawaii Time (HT)</option>
              <option value="UTC">UTC</option>
              <option value="Europe/London">London (GMT/BST)</option>
              <option value="Europe/Berlin">Central European (CET)</option>
              <option value="Asia/Tokyo">Japan (JST)</option>
              <option value="Australia/Sydney">Sydney (AEST)</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-slate-800 to-blue-900 text-white rounded-xl text-sm font-medium shadow-md shadow-slate-900/25 hover:from-slate-900 hover:to-blue-950 transition-all disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Changes
        </button>
      </div>
    </form>
  );
}

/* ═══════════════════════════════════════════════
   Appearance Tab
   ═══════════════════════════════════════════════ */

function AppearanceTab() {
  const { theme, toggleTheme } = useTheme();
  const [density, setDensity] = useState<'comfortable' | 'compact'>('comfortable');

  const themes = [
    { id: 'light' as const, label: 'Light', icon: Sun, description: 'Clean light interface' },
    { id: 'dark' as const, label: 'Dark', icon: Moon, description: 'Easy on the eyes' },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-6 space-y-5">
        <h3 className="font-medium text-[var(--text-primary)] flex items-center gap-2">
          <Palette className="w-5 h-5 text-[var(--accent)]" />
          Theme
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {themes.map((t) => (
            <button
              key={t.id}
              onClick={() => { if (theme !== t.id) toggleTheme(); }}
              className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${
                theme === t.id
                  ? 'border-[var(--accent)] bg-[var(--accent)]/5'
                  : 'border-[var(--border)] hover:border-[var(--accent)]/50'
              }`}
            >
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  theme === t.id
                    ? 'bg-[var(--accent)] text-white'
                    : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'
                }`}
              >
                <t.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">{t.label}</p>
                <p className="text-xs text-[var(--text-secondary)]">{t.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-6 space-y-5">
        <h3 className="font-medium text-[var(--text-primary)]">Display Density</h3>
        <div className="flex gap-3">
          {(['comfortable', 'compact'] as const).map((d) => (
            <button
              key={d}
              onClick={() => setDensity(d)}
              className={`px-4 py-2.5 rounded-lg text-sm font-medium border-2 transition-all capitalize ${
                density === d
                  ? 'border-[var(--accent)] bg-[var(--accent)]/5 text-[var(--text-primary)]'
                  : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent)]/50'
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   Notifications Tab
   ═══════════════════════════════════════════════ */

function NotificationsTab() {
  const [prefs, setPrefs] = useState({
    emailAlerts: true,
    securityAlerts: true,
    systemUpdates: false,
    weeklyDigest: true,
  });

  function toggle(key: keyof typeof prefs) {
    setPrefs({ ...prefs, [key]: !prefs[key] });
  }

  const options = [
    { key: 'emailAlerts' as const, label: 'Email Alerts', description: 'Receive critical alerts via email' },
    { key: 'securityAlerts' as const, label: 'Security Alerts', description: 'Get notified of suspicious activity' },
    { key: 'systemUpdates' as const, label: 'System Updates', description: 'Notifications about platform updates' },
    { key: 'weeklyDigest' as const, label: 'Weekly Digest', description: 'Summary email every Monday' },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-6 space-y-4">
        <h3 className="font-medium text-[var(--text-primary)] flex items-center gap-2">
          <Bell className="w-5 h-5 text-[var(--accent)]" />
          Notification Preferences
        </h3>
        {options.map((opt) => (
          <div key={opt.key} className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm text-[var(--text-primary)]">{opt.label}</p>
              <p className="text-xs text-[var(--text-secondary)]">{opt.description}</p>
            </div>
            <button
              type="button"
              onClick={() => toggle(opt.key)}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                prefs[opt.key] ? 'bg-[var(--accent)]' : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  prefs[opt.key] ? 'translate-x-5' : ''
                }`}
              />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   Security Tab
   ═══════════════════════════════════════════════ */

function SecurityTab() {
  const { user } = useAuth();
  const [changingPassword, setChangingPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [passwords, setPasswords] = useState({
    current: '',
    newPassword: '',
    confirm: '',
  });

  async function handleChangePassword(e: FormEvent) {
    e.preventDefault();
    if (passwords.newPassword !== passwords.confirm) {
      setMessage({ type: 'error', text: 'Passwords do not match.' });
      return;
    }
    if (passwords.newPassword.length < 12) {
      setMessage({ type: 'error', text: 'Password must be at least 12 characters.' });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      await authApi.changePassword(passwords.current, passwords.newPassword);
      setMessage({ type: 'success', text: 'Password changed successfully.' });
      setPasswords({ current: '', newPassword: '', confirm: '' });
      setChangingPassword(false);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to change password.' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {message && (
        <div
          className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm ${
            message.type === 'success'
              ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800'
              : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
          }`}
        >
          {message.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {message.text}
        </div>
      )}

      {/* Auth Info */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-6 space-y-4">
        <h3 className="font-medium text-[var(--text-primary)] flex items-center gap-2">
          <Shield className="w-5 h-5 text-[var(--accent)]" />
          Authentication
        </h3>
        <div className="flex items-center gap-3 py-2">
          <div className="w-10 h-10 bg-[var(--bg-tertiary)] rounded-lg flex items-center justify-center">
            <Lock className="w-5 h-5 text-[var(--text-secondary)]" />
          </div>
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)]">Local Account</p>
            <p className="text-xs text-[var(--text-secondary)]">You sign in with a local email and password.</p>
          </div>
        </div>
      </div>

      {/* Change Password */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-[var(--text-primary)] flex items-center gap-2">
            <Lock className="w-5 h-5 text-[var(--accent)]" />
            Change Password
          </h3>
          {!changingPassword && (
            <button
              onClick={() => setChangingPassword(true)}
              className="px-4 py-2 bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded-lg text-sm font-medium hover:bg-[var(--border)] transition-colors"
            >
              Change Password
            </button>
          )}
        </div>

        {changingPassword && (
          <form onSubmit={handleChangePassword} className="space-y-4">
            <FieldInput
              label="Current Password"
              value={passwords.current}
              onChange={(v) => setPasswords({ ...passwords, current: v })}
              type="password"
              maxWidth
            />
            <div>
              <FieldInput
                label="New Password"
                value={passwords.newPassword}
                onChange={(v) => setPasswords({ ...passwords, newPassword: v })}
                type="password"
                maxWidth
              />
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                Minimum 12 characters with uppercase, lowercase, and a number.
              </p>
            </div>
            <FieldInput
              label="Confirm New Password"
              value={passwords.confirm}
              onChange={(v) => setPasswords({ ...passwords, confirm: v })}
              type="password"
              maxWidth
            />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-slate-800 to-blue-900 text-white rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Update Password
              </button>
              <button
                type="button"
                onClick={() => {
                  setChangingPassword(false);
                  setPasswords({ current: '', newPassword: '', confirm: '' });
                  setMessage(null);
                }}
                className="px-4 py-2 bg-[var(--bg-tertiary)] text-[var(--text-secondary)] rounded-lg text-sm font-medium hover:bg-[var(--border)] transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Active Sessions */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-6 space-y-4">
        <h3 className="font-medium text-[var(--text-primary)]">Active Sessions</h3>
        <div className="flex items-center gap-3 p-3 bg-[var(--bg-tertiary)] rounded-lg">
          <div className="w-2 h-2 bg-green-500 rounded-full" />
          <div className="flex-1">
            <p className="text-sm text-[var(--text-primary)]">Current Session</p>
            <p className="text-xs text-[var(--text-secondary)]">
              {navigator.userAgent.includes('Windows') ? 'Windows' : navigator.userAgent.includes('Mac') ? 'macOS' : 'Linux'}{' '}
              · {navigator.userAgent.includes('Chrome') ? 'Chrome' : navigator.userAgent.includes('Firefox') ? 'Firefox' : navigator.userAgent.includes('Edg') ? 'Edge' : 'Browser'}
            </p>
          </div>
          <span className="text-xs text-green-600 dark:text-green-400 font-medium">Active now</span>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   Shared Field Component
   ═══════════════════════════════════════════════ */

function FieldInput({
  label,
  value,
  onChange,
  disabled,
  placeholder,
  type = 'text',
  maxWidth,
}: {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  type?: string;
  maxWidth?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        disabled={disabled}
        placeholder={placeholder}
        required={type === 'password'}
        className={`w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50 transition-all ${
          disabled
            ? 'text-[var(--text-secondary)] opacity-60 cursor-not-allowed'
            : 'text-[var(--text-primary)]'
        } ${maxWidth ? 'max-w-md' : ''}`}
      />
    </div>
  );
}
