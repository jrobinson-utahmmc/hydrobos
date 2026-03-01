import { Request } from 'express';
import { AuditLog } from '../models/AuditLog';

interface AuditEntry {
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
  req?: Request;
}

/**
 * Write an audit log entry (fire-and-forget).
 */
export async function audit(entry: AuditEntry): Promise<void> {
  try {
    await AuditLog.create({
      action: entry.action,
      category: entry.category,
      performedBy: entry.performedBy,
      target: entry.target,
      details: entry.details,
      ipAddress: entry.req?.ip || entry.req?.headers['x-forwarded-for'] as string,
      userAgent: entry.req?.headers['user-agent'],
    });
  } catch (err) {
    // Audit logging should never break the main flow
    console.error('Audit log write failed:', err);
  }
}

/**
 * Helper to extract performer info from decoded JWT on req.
 */
export function performerFromReq(req: Request): AuditEntry['performedBy'] {
  const user = (req as any).user;
  return {
    userId: user?.userId || 'unknown',
    email: user?.email || 'unknown',
    displayName: user?.displayName,
  };
}
