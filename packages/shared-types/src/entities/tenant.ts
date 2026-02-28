// ──────────────────────────────────────
// HydroBOS Tenant Entity
// ──────────────────────────────────────

export type TenantStatus = 'active' | 'suspended' | 'provisioning' | 'decommissioned';

export interface Tenant {
  _id: string;
  tenantId: string;               // Unique ID like "tnt_k7x9m2p4"
  name: string;
  slug: string;
  description?: string;
  organizationId: string;
  status: TenantStatus;
  database: {
    name: string;
    host: string;
    port: number;
    provisioned: boolean;
    provisionedAt?: string;
  };
  settings: {
    maxUsers: number;
    storageQuotaMb: number;
    features: string[];
    customDomain?: string;
  };
  metadata: {
    industry?: string;
    region?: string;
    notes?: string;
  };
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTenantDto {
  name: string;
  description?: string;
  settings?: {
    maxUsers?: number;
    storageQuotaMb?: number;
    features?: string[];
  };
  metadata?: {
    industry?: string;
    region?: string;
    notes?: string;
  };
}

export interface UpdateTenantDto {
  name?: string;
  description?: string;
  status?: TenantStatus;
  settings?: Partial<Tenant['settings']>;
  metadata?: Partial<Tenant['metadata']>;
}
