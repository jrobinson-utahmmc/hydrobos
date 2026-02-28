// ──────────────────────────────────────
// HydroBOS API Shared Types
// ──────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ApiError {
  error: string;
  code?: string;
  details?: any;
  timestamp?: string;
}

export interface ApiSuccess<T = any> {
  data: T;
  message?: string;
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  search?: string;
}
