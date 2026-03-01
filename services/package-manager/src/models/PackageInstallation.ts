/**
 * PackageInstallation — Tracks which packages are installed (org-wide or per-tenant).
 */

import mongoose, { Schema, Document } from 'mongoose';

export interface IPackageInstallation extends Document {
  packageId: string;
  tenantId: string | null;
  status: 'active' | 'disabled' | 'installing' | 'error' | 'uninstalling';
  config: Record<string, unknown>;
  enabledFeatures: string[];
  installedBy: string;
  lastHealthCheck: Date | null;
  lastHealthStatus: 'healthy' | 'unhealthy' | 'unknown';
  errorMessage: string | null;
  installedAt: Date;
  updatedAt: Date;
}

const installationSchema = new Schema<IPackageInstallation>(
  {
    packageId: {
      type: String,
      required: true,
      index: true,
    },
    tenantId: {
      type: String,
      default: null,
      index: true,
    },
    status: {
      type: String,
      enum: ['active', 'disabled', 'installing', 'error', 'uninstalling'],
      default: 'installing',
    },
    config: {
      type: Schema.Types.Mixed,
      default: {},
    },
    enabledFeatures: {
      type: [String],
      default: [],
    },
    installedBy: {
      type: String,
      required: true,
    },
    lastHealthCheck: {
      type: Date,
      default: null,
    },
    lastHealthStatus: {
      type: String,
      enum: ['healthy', 'unhealthy', 'unknown'],
      default: 'unknown',
    },
    errorMessage: {
      type: String,
      default: null,
    },
  },
  { timestamps: { createdAt: 'installedAt', updatedAt: true } }
);

// One installation per package per tenant (null tenant = org-wide)
installationSchema.index({ packageId: 1, tenantId: 1 }, { unique: true });

export const PackageInstallation = mongoose.model<IPackageInstallation>(
  'PackageInstallation',
  installationSchema
);
