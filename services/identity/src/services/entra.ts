import { config } from '../config';
import { User, IUser } from '../models/User';
import { SsoConfig, ISsoConfig } from '../models/SsoConfig';

// ──────────────────────────────────────
// Microsoft Entra ID (Azure AD) OIDC Service
// ──────────────────────────────────────

/**
 * Get the stored SSO config (from DB) or fall back to env vars.
 */
export async function getSsoConfig(): Promise<ISsoConfig | null> {
  // Try DB first
  const dbConfig = await SsoConfig.findOne({ provider: 'entra_id' });
  if (dbConfig) return dbConfig;

  // Fall back to env config
  if (config.entra.enabled) {
    return {
      provider: 'entra_id',
      enabled: true,
      tenantId: config.entra.tenantId,
      clientId: config.entra.clientId,
      clientSecret: config.entra.clientSecret,
      redirectUri: config.entra.redirectUri,
      scopes: config.entra.scopes,
      groupRoleMap: new Map(),
      autoProvision: true,
      defaultRole: 'user',
    } as any;
  }

  return null;
}

/**
 * Build the Entra ID authorization URL for OIDC redirect.
 */
export function buildAuthorizeUrl(ssoConfig: ISsoConfig, state: string): string {
  const params = new URLSearchParams({
    client_id: ssoConfig.clientId,
    response_type: 'code',
    redirect_uri: ssoConfig.redirectUri,
    response_mode: 'query',
    scope: ssoConfig.scopes.join(' '),
    state,
    prompt: 'select_account',
  });

  const authority = `https://login.microsoftonline.com/${ssoConfig.tenantId}/oauth2/v2.0`;
  return `${authority}/authorize?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens.
 */
export async function exchangeCodeForTokens(
  ssoConfig: ISsoConfig,
  code: string
): Promise<{
  access_token: string;
  id_token: string;
  refresh_token?: string;
  expires_in: number;
}> {
  const tokenEndpoint = `https://login.microsoftonline.com/${ssoConfig.tenantId}/oauth2/v2.0/token`;

  const body = new URLSearchParams({
    client_id: ssoConfig.clientId,
    client_secret: ssoConfig.clientSecret,
    code,
    redirect_uri: ssoConfig.redirectUri,
    grant_type: 'authorization_code',
    scope: ssoConfig.scopes.join(' '),
  });

  const response = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!response.ok) {
    const errorData: any = await response.json().catch(() => ({}));
    throw new Error(
      `Token exchange failed: ${errorData.error_description || response.statusText}`
    );
  }

  return response.json() as Promise<{ access_token: string; id_token: string; refresh_token?: string; expires_in: number }>;
}

/**
 * Decode and extract claims from the ID token (basic decode, not full verification).
 * In production, use a proper JWT library to verify the signature against
 * the OIDC discovery document's JWKS endpoint.
 */
export function decodeIdToken(idToken: string): {
  sub: string;
  oid: string;
  preferred_username: string;
  name: string;
  email?: string;
  groups?: string[];
} {
  const parts = idToken.split('.');
  if (parts.length !== 3) throw new Error('Invalid ID token format');

  const payload = JSON.parse(
    Buffer.from(parts[1], 'base64url').toString('utf-8')
  );

  return {
    sub: payload.sub,
    oid: payload.oid,
    preferred_username: payload.preferred_username || payload.upn,
    name: payload.name,
    email: payload.email || payload.preferred_username,
    groups: payload.groups,
  };
}

/**
 * Fetch user profile and group memberships from Microsoft Graph.
 */
export async function fetchGraphProfile(accessToken: string): Promise<{
  id: string;
  displayName: string;
  mail: string;
  jobTitle?: string;
  department?: string;
  groups: string[];
}> {
  const graphBase = 'https://graph.microsoft.com/v1.0';

  // Fetch profile
  const profileRes = await fetch(
    `${graphBase}/me?$select=id,displayName,mail,jobTitle,department`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!profileRes.ok) {
    throw new Error(`Graph profile fetch failed: ${profileRes.statusText}`);
  }

  const profile: any = await profileRes.json();

  // Fetch group memberships
  let groups: string[] = [];
  try {
    const groupsRes = await fetch(
      `${graphBase}/me/memberOf?$select=displayName`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (groupsRes.ok) {
      const groupsData: any = await groupsRes.json();
      groups = (groupsData.value || [])
        .filter((g: any) => g['@odata.type'] === '#microsoft.graph.group')
        .map((g: any) => g.displayName);
    }
  } catch {
    console.warn('Failed to fetch group memberships');
  }

  return {
    id: profile.id,
    displayName: profile.displayName,
    mail: profile.mail || profile.userPrincipalName,
    jobTitle: profile.jobTitle,
    department: profile.department,
    groups,
  };
}

/**
 * Map AD group names to HydroBOS roles using the configured mapping.
 */
export function mapGroupsToRole(
  groups: string[],
  groupRoleMap: Map<string, string>,
  defaultRole: string
): string {
  // Priority order for role resolution
  const rolePriority = [
    'platform_admin',
    'admin',
    'it_operations',
    'security_analyst',
    'executive_viewer',
    'user',
    'viewer',
  ];

  const mappedRoles = groups
    .map((g) => groupRoleMap.get(g))
    .filter(Boolean) as string[];

  if (mappedRoles.length === 0) return defaultRole;

  // Return highest-priority role
  for (const role of rolePriority) {
    if (mappedRoles.includes(role)) return role;
  }

  return defaultRole;
}

/**
 * Upsert a user from Entra ID claims and Graph data.
 */
export async function upsertSsoUser(
  claims: ReturnType<typeof decodeIdToken>,
  graphProfile: Awaited<ReturnType<typeof fetchGraphProfile>>,
  ssoConfig: ISsoConfig
): Promise<IUser> {
  const role = mapGroupsToRole(
    graphProfile.groups,
    ssoConfig.groupRoleMap as Map<string, string>,
    ssoConfig.defaultRole
  );

  const user = await User.findOneAndUpdate(
    { entraId: claims.oid },
    {
      $set: {
        email: graphProfile.mail.toLowerCase(),
        displayName: graphProfile.displayName,
        authProvider: 'entra_id',
        entraId: claims.oid,
        role,
        isActive: true,
        jobTitle: graphProfile.jobTitle,
        department: graphProfile.department,
        groups: graphProfile.groups,
        lastLogin: new Date(),
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return user;
}
