// ──────────────────────────────────────
// HydroBOS Organization Entity
// ──────────────────────────────────────

export interface Organization {
  _id: string;
  name: string;
  slug: string;
  domain?: string;
  logoUrl?: string;
  primaryColor: string;
  timezone: string;
  locale: string;
  features: {
    ssoEnabled: boolean;
    multiTenancy: boolean;
    auditLogging: boolean;
    apiAccess: boolean;
  };
  contact: {
    email?: string;
    phone?: string;
    website?: string;
    address?: string;
  };
  subscription: {
    plan: 'free' | 'starter' | 'professional' | 'enterprise';
    maxUsers: number;
    maxTenants: number;
  };
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateOrganizationDto {
  name: string;
  domain?: string;
  logoUrl?: string;
  primaryColor?: string;
  timezone?: string;
  locale?: string;
  features?: Partial<Organization['features']>;
  contact?: Partial<Organization['contact']>;
  subscription?: Partial<Organization['subscription']>;
}
