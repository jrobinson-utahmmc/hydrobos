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
