import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Search,
  LogOut,
  ChevronDown,
} from 'lucide-react';
import { ThemeToggle } from '../ui/ThemeToggle';
import { useAuth } from '../../contexts/AuthContext';

export function TopBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  const userInitial =
    user?.displayName?.charAt(0)?.toUpperCase() || 'A';

  return (
    <header className="h-16 bg-[var(--bg-secondary)] border-b border-[var(--border)] flex items-center justify-between px-6">
      {/* Search bar */}
      <div className="flex-1 max-w-md ml-10 lg:ml-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
          <input
            type="text"
            placeholder="Search... (⌘K)"
            className="w-full pl-9 pr-4 py-2 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-xl text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50 focus:border-transparent transition-all"
          />
        </div>
      </div>

      {/* Right side actions */}
      <div className="flex items-center gap-2">
        {/* Theme toggle */}
        <ThemeToggle />

        {/* Notifications */}
        <button className="relative p-2 rounded-xl hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-500 rounded-full ring-2 ring-[var(--bg-secondary)]" />
        </button>

        {/* User menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl hover:bg-[var(--bg-tertiary)] transition-colors"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg flex items-center justify-center shadow-sm">
              <span className="text-white text-sm font-semibold">
                {userInitial}
              </span>
            </div>
            <span className="hidden md:block text-sm font-medium text-[var(--text-primary)]">
              {user?.displayName || 'Admin'}
            </span>
            <ChevronDown
              className={`w-4 h-4 text-[var(--text-secondary)] transition-transform duration-200 ${
                showUserMenu ? 'rotate-180' : ''
              }`}
            />
          </button>

          {/* Dropdown */}
          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-64 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl shadow-xl py-1 z-50 animate-fade-in">
              {/* User info */}
              <div className="px-4 py-3 border-b border-[var(--border)]">
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  {user?.displayName}
                </p>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  {user?.email}
                </p>
                <span className="inline-flex items-center mt-1.5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-md">
                  {user?.role}
                </span>
              </div>

              {/* Actions */}
              <div className="py-1">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-[var(--text-secondary)] hover:bg-red-50 dark:hover:bg-red-900/10 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
