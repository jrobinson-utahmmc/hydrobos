import mongoose, { Schema, Document } from 'mongoose';

export interface IAuditLog extends Document {
  action: string;
  category: 'user' | 'auth' | 'organization' | 'tenant' | 'sso' | 'system';
  performedBy: {
    userId: string;
    email: string;
    displayName?: string;
  };
  target?: {
    type: string;
    id: string;
    label?: string;
  };
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    action: {
      type: String,
      required: true,
      index: true,
    },
    category: {
      type: String,
      enum: ['user', 'auth', 'organization', 'tenant', 'sso', 'system'],
      required: true,
      index: true,
    },
    performedBy: {
      userId: { type: String, required: true },
      email: { type: String, required: true },
      displayName: String,
    },
    target: {
      type: { type: String },
      id: String,
      label: String,
    },
    details: Schema.Types.Mixed,
    ipAddress: String,
    userAgent: String,
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// TTL index — auto-delete logs older than 1 year
auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });

// Compound index for common queries
auditLogSchema.index({ category: 1, createdAt: -1 });
auditLogSchema.index({ 'performedBy.userId': 1, createdAt: -1 });
auditLogSchema.index({ 'target.id': 1, createdAt: -1 });

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', auditLogSchema);
