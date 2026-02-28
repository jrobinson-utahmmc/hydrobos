import mongoose, { Schema, Document } from 'mongoose';

export interface ISsoConfig extends Document {
  provider: 'entra_id';
  enabled: boolean;
  tenantId: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
  groupRoleMap: Map<string, string>;
  autoProvision: boolean;
  defaultRole: string;
  createdAt: Date;
  updatedAt: Date;
}

const ssoConfigSchema = new Schema<ISsoConfig>(
  {
    provider: {
      type: String,
      enum: ['entra_id'],
      required: true,
      unique: true,
    },
    enabled: {
      type: Boolean,
      default: false,
    },
    tenantId: {
      type: String,
      required: true,
    },
    clientId: {
      type: String,
      required: true,
    },
    clientSecret: {
      type: String,
      required: true,
    },
    redirectUri: {
      type: String,
      required: true,
    },
    scopes: {
      type: [String],
      default: ['openid', 'profile', 'email'],
    },
    groupRoleMap: {
      type: Map,
      of: String,
      default: {},
    },
    autoProvision: {
      type: Boolean,
      default: true,
    },
    defaultRole: {
      type: String,
      default: 'user',
    },
  },
  { timestamps: true }
);

export const SsoConfig = mongoose.model<ISsoConfig>(
  'SsoConfig',
  ssoConfigSchema
);
