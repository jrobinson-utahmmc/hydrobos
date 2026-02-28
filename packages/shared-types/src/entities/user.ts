// ──────────────────────────────────────
// HydroBOS User Entity
// ──────────────────────────────────────

export type UserRole = 'platform_admin' | 'admin' | 'it_operations' | 'security_analyst' | 'executive_viewer' | 'user' | 'viewer';

export type AuthProvider = 'local' | 'entra_id';

export interface User {
  _id: string;
  email: string;
  displayName: string;
  role: UserRole;
  authProvider: AuthProvider;
  isActive: boolean;
  avatarUrl?: string;
  jobTitle?: string;
  department?: string;
  entraId?: string;           // Azure AD object ID (if SSO user)
  groups?: string[];           // AD group memberships
  lastLogin?: string;
  mfaEnabled?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserDto {
  email: string;
  password: string;
  displayName: string;
  role?: UserRole;
}

export interface UpdateUserDto {
  displayName?: string;
  role?: UserRole;
  isActive?: boolean;
  jobTitle?: string;
  department?: string;
}
