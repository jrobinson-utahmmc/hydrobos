/**
 * SeoAnalysis — persisted run of a PageSpeed / SEO analysis.
 */

import mongoose, { Schema, Document } from 'mongoose';

export interface ISeoAnalysis extends Document {
  url: string;
  projectId?: string;
  scores: {
    performance: number;
    accessibility: number;
    bestPractices: number;
    seo: number;
  };
  overallScore: number;
  strategy: 'mobile' | 'desktop';
  auditCount: number;
  recommendationCount: number;
  /** Snapshot of full result (lighthouse audits, CrUX, etc.) */
  snapshot: Record<string, unknown>;
  createdBy: string;
  createdAt: Date;
}

const schema = new Schema<ISeoAnalysis>(
  {
    url: { type: String, required: true, index: true },
    projectId: { type: String, index: true },
    scores: {
      performance: Number,
      accessibility: Number,
      bestPractices: Number,
      seo: Number,
    },
    overallScore: { type: Number, default: 0 },
    strategy: { type: String, enum: ['mobile', 'desktop'], default: 'mobile' },
    auditCount: { type: Number, default: 0 },
    recommendationCount: { type: Number, default: 0 },
    snapshot: { type: Schema.Types.Mixed, default: {} },
    createdBy: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

schema.index({ createdBy: 1, createdAt: -1 });
// Auto-expire old analyses after 90 days
schema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

export const SeoAnalysis = mongoose.model<ISeoAnalysis>('SeoAnalysis', schema);
