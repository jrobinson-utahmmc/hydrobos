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
 * Obtain an app-level access token using client_credentials grant.
 * Used for bulk user sync (no user login required).
 */
export async function getClientCredentialsToken(
  ssoConfig: ISsoConfig
): Promise<string> {
  const tokenEndpoint = `https://login.microsoftonline.com/${ssoConfig.tenantId}/oauth2/v2.0/token`;

  const body = new URLSearchParams({
    client_id: ssoConfig.clientId,
    client_secret: ssoConfig.clientSecret,
    grant_type: 'client_credentials',
    scope: 'https://graph.microsoft.com/.default',
  });

  const response = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!response.ok) {
    const errorData: any = await response.json().catch(() => ({}));
    throw new Error(
      `Client credentials token failed: ${errorData.error_description || response.statusText}`
    );
  }

  const data: any = await response.json();
  return data.access_token;
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
 * Fetch all users from the Azure AD tenant via Microsoft Graph (application-level).
 * Requires `User.Read.All` application permission.
 */
export async function fetchAllGraphUsers(accessToken: string): Promise<Array<{
  id: string;
  displayName: string;
  mail: string;
  userPrincipalName: string;
  jobTitle?: string;
  department?: string;
  accountEnabled: boolean;
}>> {
  const graphBase = 'https://graph.microsoft.com/v1.0';
  const allUsers: any[] = [];
  let nextLink: string | null =
    `${graphBase}/users?$select=id,displayName,mail,userPrincipalName,jobTitle,department,accountEnabled&$top=100`;

  while (nextLink) {
    const res = await fetch(nextLink, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      throw new Error(`Graph users fetch failed: ${res.statusText}`);
    }

    const data: any = await res.json();
    allUsers.push(...(data.value || []));
    nextLink = data['@odata.nextLink'] || null;
  }

  return allUsers.map((u: any) => ({
    id: u.id,
    displayName: u.displayName || u.userPrincipalName,
    mail: u.mail || u.userPrincipalName,
    userPrincipalName: u.userPrincipalName,
    jobTitle: u.jobTitle,
    department: u.department,
    accountEnabled: u.accountEnabled ?? true,
  }));
}

/**
 * Fetch group memberships for a specific user (application-level).
 * Requires `GroupMember.Read.All` application permission.
 */
export async function fetchUserGroups(accessToken: string, userId: string): Promise<string[]> {
  const graphBase = 'https://graph.microsoft.com/v1.0';
  try {
    const res = await fetch(
      `${graphBase}/users/${userId}/memberOf?$select=displayName`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!res.ok) return [];
    const data: any = await res.json();
    return (data.value || [])
      .filter((g: any) => g['@odata.type'] === '#microsoft.graph.group')
      .map((g: any) => g.displayName);
  } catch {
    return [];
  }
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

/**
 * Perform a bulk sync of all users from Microsoft Graph into HydroBOS.
 * - Creates new SSO users if autoProvision is enabled
 * - Updates existing SSO users (role, profile, groups)
 * - Deactivates users disabled in Entra ID
 * - Returns sync summary
 */
export async function bulkSyncUsers(
  ssoConfig: ISsoConfig
): Promise<{
  created: number;
  updated: number;
  deactivated: number;
  skipped: number;
  errors: string[];
  total: number;
}> {
  const result = { created: 0, updated: 0, deactivated: 0, skipped: 0, errors: [] as string[], total: 0 };

  // Get app-level token
  const accessToken = await getClientCredentialsToken(ssoConfig);

  // Fetch all users from Graph
  const graphUsers = await fetchAllGraphUsers(accessToken);
  result.total = graphUsers.length;

  const groupRoleMap = ssoConfig.groupRoleMap as Map<string, string>;

  for (const graphUser of graphUsers) {
    try {
      // Skip service accounts and users without email
      const email = graphUser.mail || graphUser.userPrincipalName;
      if (!email || email.startsWith('#') || email.includes('#EXT#')) {
        result.skipped++;
        continue;
      }

      // Fetch group memberships for role mapping
      let groups: string[] = [];
      try {
        groups = await fetchUserGroups(accessToken, graphUser.id);
      } catch {
        // Continue without groups
      }

      const role = mapGroupsToRole(groups, groupRoleMap, ssoConfig.defaultRole);
      const existingUser = await User.findOne({ entraId: graphUser.id });

      if (existingUser) {
        // Update existing user
        const wasActive = existingUser.isActive;
        existingUser.email = email.toLowerCase();
        existingUser.displayName = graphUser.displayName;
        existingUser.jobTitle = graphUser.jobTitle;
        existingUser.department = graphUser.department;
        existingUser.groups = groups;
        existingUser.role = role;
        existingUser.isActive = graphUser.accountEnabled;
        await existingUser.save();

        if (wasActive && !graphUser.accountEnabled) {
          result.deactivated++;
        } else {
          result.updated++;
        }
      } else if (ssoConfig.autoProvision) {
        // Create new user
        await User.create({
          email: email.toLowerCase(),
          displayName: graphUser.displayName,
          authProvider: 'entra_id',
          entraId: graphUser.id,
          role,
          isActive: graphUser.accountEnabled,
          jobTitle: graphUser.jobTitle,
          department: graphUser.department,
          groups,
          emailVerified: true,
          inviteAccepted: true,
        });
        result.created++;
      } else {
        result.skipped++;
      }
    } catch (err: any) {
      result.errors.push(`${graphUser.userPrincipalName}: ${err.message}`);
    }
  }

  // Deactivate SSO users that no longer exist in Entra ID
  const graphIds = graphUsers.map((u) => u.id);
  const orphanedUsers = await User.find({
    authProvider: 'entra_id',
    entraId: { $nin: graphIds, $exists: true, $ne: null },
    isActive: true,
  });

  for (const orphan of orphanedUsers) {
    try {
      orphan.isActive = false;
      await orphan.save();
      result.deactivated++;
    } catch (err: any) {
      result.errors.push(`Deactivate ${orphan.email}: ${err.message}`);
    }
  }

  return result;
}
