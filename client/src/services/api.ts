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
