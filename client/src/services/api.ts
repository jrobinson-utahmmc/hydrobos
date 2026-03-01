const API_BASE = '/api';

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export async function apiRequest<T = any>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiError(
      data.error || `Request failed with status ${response.status}`,
      response.status
    );
  }

  return data as T;
}

// ── Auth API ──

export const authApi = {
  login: (email: string, password: string) =>
    apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  setup: (data: {
    email: string;
    password: string;
    displayName: string;
    organizationName?: string;
  }) =>
    apiRequest('/auth/setup', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  logout: () =>
    apiRequest('/auth/logout', { method: 'POST' }),

  me: () => apiRequest('/auth/me'),

  forgotPassword: (email: string) =>
    apiRequest('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  resetPassword: (token: string, password: string) =>
    apiRequest('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    }),

  changePassword: (currentPassword: string, newPassword: string) =>
    apiRequest('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    }),

  validateInvite: (token: string) =>
    apiRequest<{ valid: boolean; email: string; displayName: string }>(
      `/auth/invite/validate?token=${token}`
    ),

  acceptInvite: (token: string, password: string) =>
    apiRequest('/auth/invite/accept', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    }),

  updateProfile: (data: { displayName?: string; jobTitle?: string; department?: string; phone?: string }) =>
    apiRequest('/auth/profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
};

// ── System API ──

export const systemApi = {
  status: () =>
    apiRequest<{
      initialized: boolean;
      version: string;
      name: string;
    }>('/system/status'),
};

// ── User Management API (Admin) ──

export const userApi = {
  list: (params?: {
    page?: number;
    pageSize?: number;
    search?: string;
    role?: string;
    status?: string;
    sort?: string;
    order?: 'asc' | 'desc';
  }) => {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', params.page.toString());
    if (params?.pageSize) query.set('pageSize', params.pageSize.toString());
    if (params?.search) query.set('search', params.search);
    if (params?.role) query.set('role', params.role);
    if (params?.status) query.set('status', params.status);
    if (params?.sort) query.set('sort', params.sort);
    if (params?.order) query.set('order', params.order);
    const qs = query.toString();
    return apiRequest<{ data: any[]; total: number; page: number; pageSize: number; totalPages: number }>(
      `/users${qs ? `?${qs}` : ''}`
    );
  },

  get: (id: string) =>
    apiRequest<{ data: any }>(`/users/${id}`),

  create: (data: {
    email: string;
    password: string;
    displayName: string;
    role?: string;
    jobTitle?: string;
    department?: string;
  }) =>
    apiRequest('/users', { method: 'POST', body: JSON.stringify(data) }),

  update: (id: string, data: {
    displayName?: string;
    role?: string;
    isActive?: boolean;
    jobTitle?: string;
    department?: string;
    phone?: string;
  }) =>
    apiRequest(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  delete: (id: string) =>
    apiRequest(`/users/${id}`, { method: 'DELETE' }),

  invite: (data: {
    email: string;
    displayName: string;
    role?: string;
    jobTitle?: string;
    department?: string;
  }) =>
    apiRequest<{ message: string; inviteUrl: string; user: any }>(
      '/users/invite', { method: 'POST', body: JSON.stringify(data) }
    ),

  resendInvite: (userId: string) =>
    apiRequest<{ message: string; inviteUrl: string }>(
      '/users/invite/resend', { method: 'POST', body: JSON.stringify({ userId }) }
    ),

  auditLogs: (params?: { page?: number; pageSize?: number; category?: string }) => {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', params.page.toString());
    if (params?.pageSize) query.set('pageSize', params.pageSize.toString());
    if (params?.category) query.set('category', params.category);
    const qs = query.toString();
    return apiRequest<{ data: any[]; total: number; page: number; totalPages: number }>(
      `/users/audit/logs${qs ? `?${qs}` : ''}`
    );
  },
};

// ── Dashboard API ──

export const dashboardApi = {
  list: () => apiRequest<{ data: any[] }>('/dashboards'),

  get: (id: string) => apiRequest<{ data: any }>(`/dashboards/${id}`),

  create: (data: { name: string; description?: string; icon?: string }) =>
    apiRequest('/dashboards', { method: 'POST', body: JSON.stringify(data) }),

  update: (id: string, data: any) =>
    apiRequest(`/dashboards/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  delete: (id: string) =>
    apiRequest(`/dashboards/${id}`, { method: 'DELETE' }),
};

// ── Widget API ──

export const widgetApi = {
  templates: () => apiRequest<{ data: any[] }>('/widgets/templates'),

  create: (data: any) =>
    apiRequest('/widgets', { method: 'POST', body: JSON.stringify(data) }),

  update: (id: string, data: any) =>
    apiRequest(`/widgets/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  updatePosition: (id: string, position: { x: number; y: number; w: number; h: number }) =>
    apiRequest(`/widgets/${id}/position`, { method: 'PATCH', body: JSON.stringify(position) }),

  delete: (id: string) =>
    apiRequest(`/widgets/${id}`, { method: 'DELETE' }),

  dataProxy: (config: { url: string; method?: string; headers?: any; authentication?: any }) =>
    apiRequest('/widgets/data-proxy', { method: 'POST', body: JSON.stringify(config) }),
};

// ── Organization API ──

export const organizationApi = {
  get: () =>
    apiRequest<{ configured: boolean; data?: any }>('/organization'),

  save: (data: {
    name: string;
    domain?: string;
    logoUrl?: string;
    primaryColor?: string;
    timezone?: string;
    locale?: string;
    features?: Record<string, boolean>;
    contact?: Record<string, string>;
    subscription?: { plan: string; maxUsers: number; maxTenants: number };
  }) =>
    apiRequest('/organization', { method: 'PUT', body: JSON.stringify(data) }),
};

// ── Tenant API ──

export const tenantApi = {
  list: (params?: { status?: string; page?: number; pageSize?: number }) => {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.page) query.set('page', params.page.toString());
    if (params?.pageSize) query.set('pageSize', params.pageSize.toString());
    const qs = query.toString();
    return apiRequest<{ data: any[]; total: number; page: number; totalPages: number }>(
      `/tenants${qs ? `?${qs}` : ''}`
    );
  },

  get: (id: string) =>
    apiRequest<{ data: any }>(`/tenants/${id}`),

  create: (data: {
    name: string;
    description?: string;
    settings?: { maxUsers?: number; storageQuotaMb?: number; features?: string[] };
    metadata?: { industry?: string; region?: string; notes?: string };
  }) =>
    apiRequest('/tenants', { method: 'POST', body: JSON.stringify(data) }),

  update: (id: string, data: any) =>
    apiRequest(`/tenants/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  delete: (id: string) =>
    apiRequest(`/tenants/${id}`, { method: 'DELETE' }),

  provision: (id: string) =>
    apiRequest(`/tenants/${id}/provision`, { method: 'POST' }),
};

// ── SSO Config API ──

export const ssoConfigApi = {
  get: () =>
    apiRequest<{ configured: boolean; config?: any }>('/sso/config'),

  save: (data: {
    enabled: boolean;
    tenantId: string;
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    scopes?: string[];
    groupRoleMap?: Record<string, string>;
    autoProvision?: boolean;
    defaultRole?: string;
  }) =>
    apiRequest('/sso/config', { method: 'PUT', body: JSON.stringify(data) }),

  delete: () =>
    apiRequest('/sso/config', { method: 'DELETE' }),

  testConnection: () =>
    apiRequest<{ enabled: boolean; provider: string | null }>('/auth/sso/status'),

  triggerSync: () =>
    apiRequest<{
      message: string;
      result: {
        created: number;
        updated: number;
        deactivated: number;
        skipped: number;
        errors: string[];
        total: number;
      };
    }>('/sso/config/sync', { method: 'POST' }),

  syncStatus: () =>
    apiRequest<{
      configured: boolean;
      enabled: boolean;
      users: { total: number; active: number; disabled: number };
      lastSync: {
        timestamp: string;
        totalGraphUsers?: number;
        created?: number;
        updated?: number;
        deactivated?: number;
        skipped?: number;
        errors?: number;
      } | null;
    }>('/sso/config/sync/status'),
};

// ── Package Manager API ──

export const packageApi = {
  list: (params?: { category?: string; type?: string; search?: string }) => {
    const query = new URLSearchParams();
    if (params?.category) query.set('category', params.category);
    if (params?.type) query.set('type', params.type);
    if (params?.search) query.set('search', params.search);
    const qs = query.toString();
    return apiRequest<{ success: boolean; data: any[] }>(
      `/packages${qs ? `?${qs}` : ''}`
    );
  },

  get: (packageId: string) =>
    apiRequest<{ success: boolean; data: any }>(`/packages/${packageId}`),

  install: (packageId: string, config?: Record<string, any>) =>
    apiRequest<{ success: boolean; message: string; data: any }>(
      '/packages/installations/install',
      { method: 'POST', body: JSON.stringify({ packageId, config }) }
    ),

  uninstall: (packageId: string) =>
    apiRequest<{ success: boolean; message: string }>(
      '/packages/installations/uninstall',
      { method: 'POST', body: JSON.stringify({ packageId }) }
    ),

  setStatus: (packageId: string, status: 'active' | 'disabled') =>
    apiRequest<{ success: boolean; data: any }>(
      `/packages/installations/${packageId}/status`,
      { method: 'PATCH', body: JSON.stringify({ status }) }
    ),

  healthCheck: (packageId: string) =>
    apiRequest<{ success: boolean; data: any }>(
      `/packages/installations/${packageId}/health`,
      { method: 'POST' }
    ),

  installations: () =>
    apiRequest<{ success: boolean; data: any[] }>('/packages/installations'),
};

// ── Platform Integrations API ──

export const integrationApi = {
  list: () =>
    apiRequest<{ success: boolean; data: any[] }>('/packages/integrations'),

  get: (integrationId: string) =>
    apiRequest<{ success: boolean; data: any }>(`/packages/integrations/${integrationId}`),

  update: (integrationId: string, data: { config?: Record<string, any>; enabled?: boolean }) =>
    apiRequest<{ success: boolean; message: string; data: any }>(
      `/packages/integrations/${integrationId}`,
      { method: 'PUT', body: JSON.stringify(data) }
    ),

  test: (integrationId: string) =>
    apiRequest<{ success: boolean; data: { success: boolean; message: string } }>(
      `/packages/integrations/${integrationId}/test`,
      { method: 'POST' }
    ),
};

// ── SEO API ──

export const seoApi = {
  // Analysis
  analyze: (data: { url: string; strategy?: 'mobile' | 'desktop'; includeAiInsights?: boolean; includeAhrefs?: boolean; projectId?: string }) =>
    apiRequest<{ success: boolean; data: any }>('/seo/analysis/analyze', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  analysisHistory: (params?: { url?: string; projectId?: string; strategy?: string; limit?: number; skip?: number }) => {
    const query = new URLSearchParams();
    if (params?.url) query.set('url', params.url);
    if (params?.projectId) query.set('projectId', params.projectId);
    if (params?.strategy) query.set('strategy', params.strategy);
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.skip) query.set('skip', params.skip.toString());
    const qs = query.toString();
    return apiRequest<{ success: boolean; data: any }>(`/seo/analysis/history${qs ? `?${qs}` : ''}`);
  },

  lastAnalysis: () =>
    apiRequest<{ success: boolean; data: any }>('/seo/analysis/last'),

  // Content
  contentTemplates: () =>
    apiRequest<{ success: boolean; data: any[] }>('/seo/content/templates'),

  generateContent: (data: { templateId: string; items: any[]; options?: any }) =>
    apiRequest<{ success: boolean; data: any }>('/seo/content/generate', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  previewContent: (data: { templateId: string; variables?: Record<string, any> }) =>
    apiRequest<{ success: boolean; data: any }>('/seo/content/preview', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Images
  listImages: () =>
    apiRequest<{ success: boolean; data: any[] }>('/seo/images/list'),

  analyzeImage: (imageUrl: string) =>
    apiRequest<{ success: boolean; data: any }>('/seo/images/analyze', {
      method: 'POST',
      body: JSON.stringify({ imageUrl }),
    }),

  analyzeImagesBulk: (images: { path: string; base64: string }[]) =>
    apiRequest<{ success: boolean; data: any[] }>('/seo/images/analyze/bulk', {
      method: 'POST',
      body: JSON.stringify({ images }),
    }),

  exportImagesCsv: () => `/api/seo/images/export/csv`,

  // Projects
  loadProject: (projectPath: string) =>
    apiRequest<{ success: boolean; data: any }>('/seo/projects/load', {
      method: 'POST',
      body: JSON.stringify({ projectPath }),
    }),

  projectStructure: () =>
    apiRequest<{ success: boolean; data: any }>('/seo/projects/structure'),

  projectStatus: () =>
    apiRequest<{ success: boolean; data: any }>('/seo/projects/status'),

  // Files
  listFiles: (path?: string) => {
    const query = path ? `?path=${encodeURIComponent(path)}` : '';
    return apiRequest<{ success: boolean; data: any }>(`/seo/files/list${query}`);
  },

  readFile: (path: string) =>
    apiRequest<{ success: boolean; data: any }>(`/seo/files/read?path=${encodeURIComponent(path)}`),

  fileOperation: (data: { type: 'create' | 'modify' | 'delete' | 'rename'; path: string; content?: string; newPath?: string; overwrite?: boolean }) =>
    apiRequest<{ success: boolean; data: any }>('/seo/files/operation', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // AI
  aiChat: (message: string, context?: any) =>
    apiRequest<{ success: boolean; data: any }>('/seo/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ message, context }),
    }),

  aiAnalyze: (content: string, analysisType?: 'seo' | 'content' | 'structure' | 'general') =>
    apiRequest<{ success: boolean; data: any }>('/seo/ai/analyze', {
      method: 'POST',
      body: JSON.stringify({ content, analysisType }),
    }),

  aiModels: () =>
    apiRequest<{ success: boolean; data: any[] }>('/seo/ai/models'),

  // Ahrefs
  ahrefsDomainOverview: (domain: string) =>
    apiRequest<{ success: boolean; data: any }>(`/seo/integrations/ahrefs/overview/${encodeURIComponent(domain)}`),

  ahrefsBacklinks: (domain: string, limit?: number) => {
    const query = limit ? `?limit=${limit}` : '';
    return apiRequest<{ success: boolean; data: any }>(`/seo/integrations/ahrefs/backlinks/${encodeURIComponent(domain)}${query}`);
  },

  ahrefsKeywords: (domain: string, params?: { country?: string; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.country) query.set('country', params.country);
    if (params?.limit) query.set('limit', params.limit.toString());
    const qs = query.toString();
    return apiRequest<{ success: boolean; data: any }>(`/seo/integrations/ahrefs/keywords/${encodeURIComponent(domain)}${qs ? `?${qs}` : ''}`);
  },

  ahrefsKeywordIdeas: (keyword: string, params?: { country?: string; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.country) query.set('country', params.country);
    if (params?.limit) query.set('limit', params.limit.toString());
    const qs = query.toString();
    return apiRequest<{ success: boolean; data: any }>(`/seo/integrations/ahrefs/keyword-ideas/${encodeURIComponent(keyword)}${qs ? `?${qs}` : ''}`);
  },

  ahrefsCompetitors: (domain: string, limit?: number) => {
    const query = limit ? `?limit=${limit}` : '';
    return apiRequest<{ success: boolean; data: any }>(`/seo/integrations/ahrefs/competitors/${encodeURIComponent(domain)}${query}`);
  },

  ahrefsFullReport: (domain: string) =>
    apiRequest<{ success: boolean; data: any }>(`/seo/integrations/ahrefs/full-report/${encodeURIComponent(domain)}`),

  // Permissions
  permissions: () =>
    apiRequest<{ success: boolean; data: any }>('/seo/permissions'),

  overridePermissions: (role: string, permissions: string[]) =>
    apiRequest<{ success: boolean; message: string }>('/seo/permissions/override', {
      method: 'PUT',
      body: JSON.stringify({ role, permissions }),
    }),

  deletePermissionOverride: (role: string) =>
    apiRequest<{ success: boolean; message: string }>(`/seo/permissions/override/${role}`, {
      method: 'DELETE',
    }),

  // SSE Events
  eventsUrl: () => `/api/seo/events/stream`,
};
