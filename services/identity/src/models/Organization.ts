import mongoose, { Schema, Document } from 'mongoose';

export interface IOrganization extends Document {
  name: string;
  slug: string;
  domain?: string;
  logoUrl?: string;
  primaryColor?: string;
  timezone: string;
  locale: string;
  features: {
    ssoEnabled: boolean;
    multiTenancy: boolean;
    auditLogging: boolean;
    apiAccess: boolean;
    localLoginDisabled: boolean;
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
  createdAt: Date;
  updatedAt: Date;
}

const organizationSchema = new Schema<IOrganization>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    domain: {
      type: String,
      trim: true,
    },
    logoUrl: String,
    primaryColor: {
      type: String,
      default: '#2563eb',
    },
    timezone: {
      type: String,
      default: 'America/Chicago',
    },
    locale: {
      type: String,
      default: 'en-US',
    },
    features: {
      ssoEnabled: { type: Boolean, default: false },
      multiTenancy: { type: Boolean, default: true },
      auditLogging: { type: Boolean, default: true },
      apiAccess: { type: Boolean, default: true },
      localLoginDisabled: { type: Boolean, default: false },
    },
    contact: {
      email: String,
      phone: String,
      website: String,
      address: String,
    },
    subscription: {
      plan: {
        type: String,
        enum: ['free', 'starter', 'professional', 'enterprise'],
        default: 'professional',
      },
      maxUsers: { type: Number, default: 50 },
      maxTenants: { type: Number, default: 10 },
    },
    createdBy: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

export const Organization = mongoose.model<IOrganization>(
  'Organization',
  organizationSchema
);
