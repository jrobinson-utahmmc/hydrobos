/**
 * API Key Resolver — Fetches integration API keys from the Package Manager.
 *
 * On each request the SEO route layer calls `resolveApiKeys(token)` which:
 *   1.  Returns keys from a short-lived in-memory cache (TTL 60 s).
 *   2.  On cache miss, calls <package-manager>/api/packages/integrations/:id/key
 *       for every required integration, using the caller's JWT for auth.
 *   3.  Falls back to env-var defaults (`config.defaultApiKeys`) for any key
 *       that couldn't be fetched (integration not configured, network error, …).
 */

import { config } from '../config';

interface ResolvedKeys {
  anthropic: string;
  googlePageSpeed: string;
  googleVision: string;
  ahrefs: string;
}

const CACHE_TTL_MS = 60_000; // 1 minute

let cachedKeys: ResolvedKeys | null = null;
let cachedAt = 0;

/**
 * Fetch a single integration key from the package-manager.
 * Returns the raw apiKey string, or an empty string on failure.
 */
async function fetchKey(integrationId: string, token: string): Promise<string> {
  try {
    const url = `${config.packageManagerUrl}/api/packages/integrations/${integrationId}/key`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return '';
    const body = (await res.json()) as { data?: { apiKey?: string } };
    return body?.data?.apiKey || '';
  } catch {
    return '';
  }
}

/**
 * Resolve all 4 API keys, using a layered approach:
 *   per-request body  →  package-manager  →  env-var defaults
 *
 * @param token   The caller's JWT (forwarded from the incoming request).
 * @param overrides  Optional per-request key overrides from `req.body.apiKeys`.
 */
export async function resolveApiKeys(
  token: string,
  overrides?: Partial<ResolvedKeys>,
): Promise<ResolvedKeys> {
  // Check cache validity
  const now = Date.now();
  if (!cachedKeys || now - cachedAt > CACHE_TTL_MS) {
    // Fetch all four keys in parallel
    const [anthropic, googlePageSpeed, googleVision, ahrefs] = await Promise.all([
      fetchKey('anthropic', token),
      fetchKey('google-pagespeed', token),
      fetchKey('google-vision', token),
      fetchKey('ahrefs', token),
    ]);

    cachedKeys = { anthropic, googlePageSpeed, googleVision, ahrefs };
    cachedAt = now;
  }

  // Merge: per-request overrides  →  package-manager cache  →  env defaults
  return {
    anthropic:
      overrides?.anthropic || cachedKeys.anthropic || config.defaultApiKeys.anthropic,
    googlePageSpeed:
      overrides?.googlePageSpeed || cachedKeys.googlePageSpeed || config.defaultApiKeys.googlePageSpeed,
    googleVision:
      overrides?.googleVision || cachedKeys.googleVision || config.defaultApiKeys.googleVision,
    ahrefs:
      overrides?.ahrefs || cachedKeys.ahrefs || config.defaultApiKeys.ahrefs,
  };
}

/**
 * Extract the bearer token from an Express request (cookie or header).
 */
export function extractToken(req: { cookies?: Record<string, string>; headers: Record<string, string | string[] | undefined> }): string {
  return (
    req.cookies?.token ||
    (req.headers.authorization as string | undefined)?.replace('Bearer ', '') ||
    ''
  );
}

/**
 * Bust the cached keys (useful after a user updates integrations).
 */
export function invalidateKeyCache(): void {
  cachedKeys = null;
  cachedAt = 0;
}
