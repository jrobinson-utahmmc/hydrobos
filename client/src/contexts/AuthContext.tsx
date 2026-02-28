import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { authApi, systemApi } from '../services/api';

// ── Types ──

export interface User {
  _id: string;
  email: string;
  displayName: string;
  role: string;
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  systemInitialized: boolean | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setup: (data: {
    email: string;
    password: string;
    displayName: string;
    organizationName?: string;
  }) => Promise<void>;
}

// ── Context ──

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ── Provider ──

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [systemInitialized, setSystemInitialized] = useState<boolean | null>(
    null
  );

  // Check system status & auth on mount
  const checkStatus = useCallback(async () => {
    try {
      // 1. Check if system is initialized
      const status = await systemApi.status();
      setSystemInitialized(status.initialized);

      // 2. If initialized, try to get current user
      if (status.initialized) {
        try {
          const { user: currentUser } = await authApi.me();
          setUser(currentUser);
        } catch {
          // Not authenticated — that's fine
          setUser(null);
        }
      }
    } catch {
      // Server not reachable
      console.error('Unable to reach HydroBOS server');
      setSystemInitialized(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  // Login
  const login = async (email: string, password: string) => {
    const { user: loggedInUser } = await authApi.login(email, password);
    setUser(loggedInUser);
  };

  // Logout
  const logout = async () => {
    await authApi.logout();
    setUser(null);
  };

  // First-run setup
  const setup = async (data: {
    email: string;
    password: string;
    displayName: string;
    organizationName?: string;
  }) => {
    const { user: newAdmin } = await authApi.setup(data);
    setUser(newAdmin);
    setSystemInitialized(true);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        systemInitialized,
        login,
        logout,
        setup,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook ──

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
