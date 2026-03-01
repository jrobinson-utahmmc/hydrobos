/**
 * PlatformIntegration — Stores platform-level API keys for external services.
 *
 * These keys are shared across all packages that require a given integration.
 * Packages request API keys from the platform rather than managing their own.
 */

import mongoose, { Schema, Document } from 'mongoose';

export interface IIntegrationConfig {
  apiKey?: string;
  projectId?: string;
  region?: string;
  endpoint?: string;
  [key: string]: unknown;
}

export interface IPlatformIntegration extends Document {
  integrationId: string;
  name: string;
  provider: string;
  description: string;
  icon: string;
  category: 'ai' | 'analytics' | 'search' | 'cloud' | 'other';
  config: IIntegrationConfig;
  enabled: boolean;
  usedByPackages: string[];
  updatedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const integrationSchema = new Schema<IPlatformIntegration>(
  {
    integrationId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
    provider: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: '',
    },
    icon: {
      type: String,
      default: 'plug',
    },
    category: {
      type: String,
      enum: ['ai', 'analytics', 'search', 'cloud', 'other'],
      default: 'other',
    },
    config: {
      type: Schema.Types.Mixed,
      default: {},
    },
    enabled: {
      type: Boolean,
      default: false,
    },
    usedByPackages: {
      type: [String],
      default: [],
    },
    updatedBy: {
      type: String,
      default: 'system',
    },
  },
  { timestamps: true }
);

export const PlatformIntegration = mongoose.model<IPlatformIntegration>(
  'PlatformIntegration',
  integrationSchema
);
