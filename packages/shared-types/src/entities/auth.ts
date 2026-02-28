// ──────────────────────────────────────
// HydroBOS Auth Types
// ──────────────────────────────────────

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
  authProvider: string;
  tenantId?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: import('./user').User;
  token?: string;
}

export interface SetupRequest {
  email: string;
  password: string;
  displayName: string;
  organizationName?: string;
}

export interface SystemStatus {
  initialized: boolean;
  version: string;
  name: string;
  ssoEnabled: boolean;
  ssoProvider?: string;
}

// ── Entra ID / SSO Types ──

export interface EntraIdConfig {
  enabled: boolean;
  tenantId: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
  groupRoleMap: Record<string, string>;
}

export interface OidcTokenResponse {
  access_token: string;
  id_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

export interface EntraIdClaims {
  sub: string;
  oid: string;
  preferred_username: string;
  name: string;
  email: string;
  groups?: string[];
}
