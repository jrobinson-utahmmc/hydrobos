import { useState, useEffect } from 'react';
import {
  LayoutGrid, Plus, Trash2, Pencil, Star, Loader2, X,
  MoreVertical, Settings, Share2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../services/api';

interface Dashboard {
  _id: string;
  name: string;
  description?: string;
  icon?: string;
  isDefault: boolean;
  isTemplate: boolean;
  columns: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export function DashboardsPage() {
  const navigate = useNavigate();
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboards();
  }, []);

  async function loadDashboards() {
    try {
      const res = await apiRequest<{ data: Dashboard[] }>('/dashboards');
      setDashboards(res.data || []);
    } catch {
      setError('Unable to load dashboards');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!newName.trim()) return;
    try {
      setCreating(true);
      await apiRequest('/dashboards', {
        method: 'POST',
        body: JSON.stringify({ name: newName, description: newDesc }),
      });
      setNewName('');
      setNewDesc('');
      setShowCreate(false);
      await loadDashboards();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this dashboard and all its widgets?')) return;
    try {
      await apiRequest(`/dashboards/${id}`, { method: 'DELETE' });
      await loadDashboards();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleSetDefault(id: string) {
    try {
      await apiRequest(`/dashboards/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isDefault: true }),
      });
      await loadDashboards();
    } catch (err: any) {
      setError(err.message);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-slate-800 to-cyan-900 rounded-xl flex items-center justify-center shadow-lg shadow-slate-900/20">
            <LayoutGrid className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-[var(--text-primary)]">Dashboards</h1>
            <p className="text-xs text-[var(--text-secondary)]">{dashboards.length} dashboard{dashboards.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl bg-[var(--accent)] text-white hover:opacity-90 transition-all"
        >
          <Plus className="w-4 h-4" />
          New Dashboard
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center justify-between bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/50 rounded-xl p-4">
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          <button onClick={() => setError(null)}><X className="w-4 h-4 text-red-500" /></button>
        </div>
      )}

      {/* Create form */}
      {showCreate && (
        <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-6 space-y-4">
          <h3 className="font-medium text-[var(--text-primary)]">Create Dashboard</h3>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Dashboard name"
            className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)]"
            autoFocus
          />
          <input
            type="text"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            placeholder="Description (optional)"
            className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)]"
          />
          <div className="flex justify-end gap-3">
            <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm rounded-xl border border-[var(--border)] text-[var(--text-secondary)]">
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={creating || !newName.trim()}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl bg-[var(--accent)] text-white hover:opacity-90 disabled:opacity-50"
            >
              {creating && <Loader2 className="w-4 h-4 animate-spin" />}
              Create
            </button>
          </div>
        </div>
      )}

      {/* Dashboard list */}
      {dashboards.length === 0 ? (
        <div className="text-center py-16">
          <LayoutGrid className="w-12 h-12 mx-auto text-[var(--text-secondary)] mb-4 opacity-40" />
          <h3 className="font-medium text-[var(--text-primary)]">No dashboards yet</h3>
          <p className="text-sm text-[var(--text-secondary)] mt-1">Create your first dashboard and start adding widgets.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {dashboards.map((d) => (
            <div
              key={d._id}
              className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-5 hover:shadow-md hover:border-[var(--accent)]/20 transition-all group relative"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-[var(--text-primary)]">{d.name}</h4>
                  {d.isDefault && (
                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                  )}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {!d.isDefault && (
                    <button
                      onClick={() => handleSetDefault(d._id)}
                      title="Set as default"
                      className="p-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)]"
                    >
                      <Star className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(d._id)}
                    className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-[var(--text-secondary)] hover:text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              {d.description && (
                <p className="text-xs text-[var(--text-secondary)] mb-3 line-clamp-2">{d.description}</p>
              )}
              <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
                <span>{d.columns}-col grid</span>
                <span>{new Date(d.updatedAt).toLocaleDateString()}</span>
              </div>
              {d.tags && d.tags.length > 0 && (
                <div className="flex gap-1 mt-3 flex-wrap">
                  {d.tags.map((tag) => (
                    <span key={tag} className="px-2 py-0.5 bg-[var(--bg-tertiary)] rounded-md text-[10px] text-[var(--text-secondary)]">{tag}</span>
                  ))}
                </div>
              )}
              <button
                onClick={() => navigate(`/widget-builder`)}
                className="mt-4 w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium rounded-lg border border-dashed border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all"
              >
                <Plus className="w-3.5 h-3.5" /> Add Widget
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
