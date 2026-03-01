/**
 * SeoProject — tracks projects that have been loaded for SEO analysis.
 */

import mongoose, { Schema, Document } from 'mongoose';

export interface ISeoProject extends Document {
  name: string;
  path: string;
  framework: string;
  createdBy: string;
  lastAnalyzedAt?: Date;
  config: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<ISeoProject>(
  {
    name: { type: String, required: true, trim: true },
    path: { type: String, required: true },
    framework: { type: String, default: 'Unknown' },
    createdBy: { type: String, required: true },
    lastAnalyzedAt: Date,
    config: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

schema.index({ createdBy: 1 });
schema.index({ path: 1 }, { unique: true });

export const SeoProject = mongoose.model<ISeoProject>('SeoProject', schema);
