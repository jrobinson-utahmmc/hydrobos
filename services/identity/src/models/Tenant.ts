import mongoose, { Schema, Document } from 'mongoose';
import crypto from 'crypto';

export interface ITenant extends Document {
  tenantId: string;             // Unique tenant identifier (e.g., "tnt_abc123")
  name: string;
  slug: string;
  description?: string;
  organizationId: mongoose.Types.ObjectId;
  status: 'active' | 'suspended' | 'provisioning' | 'decommissioned';
  database: {
    name: string;               // MongoDB database name for this tenant
    host: string;               // Connection host (same or separate)
    port: number;
    provisioned: boolean;
    provisionedAt?: Date;
  };
  settings: {
    maxUsers: number;
    storageQuotaMb: number;
    features: string[];         // Feature flags for this tenant
    customDomain?: string;
  };
  metadata: {
    industry?: string;
    region?: string;
    notes?: string;
  };
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Generate a unique tenant ID like "tnt_k7x9m2p4"
 */
function generateTenantId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const randomPart = Array.from(crypto.randomBytes(8))
    .map((b) => chars[b % chars.length])
    .join('');
  return `tnt_${randomPart}`;
}

const tenantSchema = new Schema<ITenant>(
  {
    tenantId: {
      type: String,
      required: true,
      unique: true,
      default: generateTenantId,
    },
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
    description: String,
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['active', 'suspended', 'provisioning', 'decommissioned'],
      default: 'provisioning',
    },
    database: {
      name: {
        type: String,
        required: true,
      },
      host: {
        type: String,
        default: 'localhost',
      },
      port: {
        type: Number,
        default: 27017,
      },
      provisioned: {
        type: Boolean,
        default: false,
      },
      provisionedAt: Date,
    },
    settings: {
      maxUsers: { type: Number, default: 25 },
      storageQuotaMb: { type: Number, default: 1024 },
      features: {
        type: [String],
        default: ['dashboards', 'widgets', 'reports'],
      },
      customDomain: String,
    },
    metadata: {
      industry: String,
      region: String,
      notes: String,
    },
    createdBy: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

// Index for lookup performance
tenantSchema.index({ organizationId: 1, status: 1 });
tenantSchema.index({ tenantId: 1 });

export const Tenant = mongoose.model<ITenant>('Tenant', tenantSchema);
export { generateTenantId };
