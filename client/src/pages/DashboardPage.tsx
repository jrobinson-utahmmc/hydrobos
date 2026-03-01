import { useAuth } from '../contexts/AuthContext';
import {
  Users,
  Activity,
  Clock,
  Globe,
  ArrowUpRight,
  Server,
  Database,
  Zap,
  Puzzle,
  LayoutGrid,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const colorMap: Record<string, { bg: string; icon: string }> = {
  blue: { bg: 'bg-slate-100 dark:bg-slate-800/30', icon: 'text-slate-700 dark:text-blue-400' },
  green: { bg: 'bg-green-100 dark:bg-green-900/20', icon: 'text-green-600 dark:text-green-400' },
  indigo: { bg: 'bg-indigo-100 dark:bg-indigo-900/20', icon: 'text-indigo-600 dark:text-indigo-400' },
  purple: { bg: 'bg-purple-100 dark:bg-purple-900/20', icon: 'text-purple-600 dark:text-purple-400' },
};

const kpiCards = [
  { title: 'Total Users', value: '1', change: 'New admin', icon: Users, color: 'blue' },
  { title: 'System Status', value: 'Online', change: null, icon: Activity, color: 'green' },
  { title: 'Uptime', value: '100%', change: null, icon: Clock, color: 'indigo' },
  { title: 'Active Sessions', value: '1', change: 'Current', icon: Globe, color: 'purple' },
];

const systemInfo = [
  { label: 'Version', value: '0.3.0 (Stage 3)' },
  { label: 'Architecture', value: 'Microservices' },
  { label: 'Database', value: 'MongoDB + Redis' },
  { label: 'Auth Method', value: 'Local + Entra ID SSO' },
  { label: 'API Gateway', value: 'Express Gateway :5000' },
  { label: 'Services', value: 'Identity · Widget · Gateway' },
];

const quickActions = [
  { label: 'Widget Builder', icon: Puzzle, description: 'Create custom widgets', path: '/widget-builder' },
  { label: 'My Dashboards', icon: LayoutGrid, description: 'Manage dashboards', path: '/dashboards' },
];

export function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome Section */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
            Welcome back, {user?.displayName || 'Admin'}
          </h1>
          <p className="text-[var(--text-secondary)] mt-1 text-sm">
            Here's an overview of your HydroBOS system.
          </p>
        </div>
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-green-100 dark:bg-green-900/20 border border-green-200 dark:border-green-800/50 rounded-full">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-xs font-medium text-green-700 dark:text-green-400">
            All Systems Operational
          </span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((card, index) => {
          const colors = colorMap[card.color] || colorMap.blue;
          return (
            <div
              key={card.title}
              className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-5 hover:shadow-md hover:border-[var(--accent)]/20 transition-all duration-200 group"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--text-secondary)]">{card.title}</span>
                <div className={`w-10 h-10 rounded-xl ${colors.bg} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                  <card.icon className={`w-5 h-5 ${colors.icon}`} />
                </div>
              </div>
              <p className="mt-3 text-2xl font-semibold text-[var(--text-primary)]">{card.value}</p>
              {card.change && (
                <p className="mt-1 text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                  <ArrowUpRight className="w-3 h-3" />
                  {card.change}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* System Information */}
        <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-6">
          <h3 className="font-medium text-[var(--text-primary)] mb-4 flex items-center gap-2">
            <Server className="w-5 h-5 text-[var(--accent)]" />
            System Information
          </h3>
          <div className="space-y-0">
            {systemInfo.map((item) => (
              <div key={item.label} className="flex items-center justify-between py-3 border-b border-[var(--border)] last:border-0">
                <span className="text-sm text-[var(--text-secondary)]">{item.label}</span>
                <span className="text-sm font-medium text-[var(--text-primary)]">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-6">
          <h3 className="font-medium text-[var(--text-primary)] mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-[var(--accent)]" />
            Quick Actions
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((action) => (
              <button
                key={action.label}
                onClick={() => navigate(action.path)}
                className="flex flex-col items-start gap-2 p-4 bg-[var(--bg-tertiary)] hover:bg-slate-100 dark:hover:bg-slate-800/30 rounded-xl text-left transition-all group border border-transparent hover:border-[var(--accent)]/20"
              >
                <div className="w-9 h-9 rounded-lg bg-[var(--bg-secondary)] group-hover:bg-slate-200 dark:group-hover:bg-slate-700/40 flex items-center justify-center transition-colors">
                  <action.icon className="w-4 h-4 text-[var(--text-secondary)] group-hover:text-slate-800 dark:group-hover:text-blue-400 transition-colors" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">{action.label}</p>
                  <p className="text-xs text-[var(--text-secondary)]">{action.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Stage 2 banner */}
        <div className="lg:col-span-2 bg-gradient-to-r from-slate-900 to-blue-950 rounded-xl p-6 text-white relative overflow-hidden">
          <div className="absolute -right-12 -top-12 w-40 h-40 bg-white/10 rounded-full" />
          <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-white/5 rounded-full" />
          <div className="relative">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Stage 3 — Admin Portal & Multi-Tenancy</h3>
                <p className="text-sm text-slate-400">Organization, Tenants, Entra ID SSO, Users</p>
              </div>
            </div>
            <p className="text-sm text-slate-400 max-w-2xl leading-relaxed">
              HydroBOS now runs on a microservices architecture with an API Gateway, Identity
              Service (local + Entra ID SSO), and Widget Service. Multi-tenant database isolation,
              admin portal, and organization management are live.
            </p>
            <div className="flex flex-wrap gap-2 mt-4">
              {[
                'Microservices ✓', 'API Gateway ✓', 'Entra ID SSO ✓',
                'Widget Engine ✓', 'Multi-Tenant ✓', 'Admin Portal ✓', 'Redis Cache ✓',
              ].map((tag) => (
                <span key={tag} className="px-2.5 py-1 bg-white/15 rounded-lg text-xs font-medium">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
