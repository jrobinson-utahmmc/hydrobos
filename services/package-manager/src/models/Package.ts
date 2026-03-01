/**
 * Package — A registered package in the HydroBOS ecosystem.
 *
 * Built-in packages are seeded on startup. Marketplace / custom packages
 * can be registered via the admin API.
 */

import mongoose, { Schema, Document } from 'mongoose';

export interface IPackage extends Document {
  packageId: string;
  name: string;
  description: string;
  version: string;
  icon: string;
  category: string;
  type: 'builtin' | 'marketplace' | 'custom';
  serviceUrl: string;
  port: number;
  basePath: string;
  healthEndpoint: string;
  manifestEndpoint: string;
  requiredIntegrations: string[];
  permissions: Array<{
    key: string;
    label: string;
    description: string;
    category: string;
  }>;
  features: string[];
  screenshots: string[];
  author: string;
  documentation: string;
  status: 'available' | 'deprecated';
  createdAt: Date;
  updatedAt: Date;
}

const packageSchema = new Schema<IPackage>(
  {
    packageId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: '',
    },
    version: {
      type: String,
      required: true,
    },
    icon: {
      type: String,
      default: 'package',
    },
    category: {
      type: String,
      default: 'general',
    },
    type: {
      type: String,
      enum: ['builtin', 'marketplace', 'custom'],
      default: 'marketplace',
    },
    serviceUrl: {
      type: String,
      required: true,
    },
    port: {
      type: Number,
      required: true,
    },
    basePath: {
      type: String,
      required: true,
    },
    healthEndpoint: {
      type: String,
      default: '/health',
    },
    manifestEndpoint: {
      type: String,
      default: '/manifest',
    },
    requiredIntegrations: {
      type: [String],
      default: [],
    },
    permissions: {
      type: [
        {
          key: String,
          label: String,
          description: String,
          category: String,
        },
      ],
      default: [],
    },
    features: {
      type: [String],
      default: [],
    },
    screenshots: {
      type: [String],
      default: [],
    },
    author: {
      type: String,
      default: 'HydroBOS',
    },
    documentation: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['available', 'deprecated'],
      default: 'available',
    },
  },
  { timestamps: true }
);

export const Package = mongoose.model<IPackage>('Package', packageSchema);
