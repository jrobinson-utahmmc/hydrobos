/**
 * Mongoose model for applet permission overrides.
 *
 * Referenced by the permissions middleware to allow admins to customise
 * role→permission mappings at runtime without redeploying.
 */

import mongoose, { Schema, Document } from 'mongoose';

export interface IAppletPermissionOverride extends Document {
  appletId: string;
  role: string;
  permissions: string[];
  updatedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<IAppletPermissionOverride>(
  {
    appletId: { type: String, required: true, index: true },
    role: { type: String, required: true },
    permissions: { type: [String], default: [] },
    updatedBy: { type: String, required: true },
  },
  { timestamps: true }
);

// Compound unique: one override per applet+role
schema.index({ appletId: 1, role: 1 }, { unique: true });

export const AppletPermissionOverride = mongoose.model<IAppletPermissionOverride>(
  'AppletPermissionOverride',
  schema
);
