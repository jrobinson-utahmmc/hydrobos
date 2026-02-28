import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <Sidebar />
      <div className="lg:pl-64 transition-all duration-300">
        <TopBar />
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
