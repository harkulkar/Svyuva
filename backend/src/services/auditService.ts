import type { Request } from 'express';
import { AuditLog } from '../models/AuditLog.js';
import { logger } from '../utils/logger.js';

type AuditInput = {
  userId?: string | null;
  action: string;
  entity?: string;
  entityId?: string | null;
  req?: Request;
  metadata?: Record<string, unknown>;
};

export async function writeAudit(input: AuditInput): Promise<void> {
  try {
    const metadata = { ...(input.metadata ?? {}) };
    if (input.req?.requestId && metadata.requestId == null) {
      metadata.requestId = input.req.requestId;
    }
    await AuditLog.create({
      userId: input.userId ?? null,
      action: input.action,
      entity: input.entity ?? 'User',
      entityId: input.entityId ?? null,
      ipAddress: input.req?.ip ?? null,
      userAgent: input.req?.get('user-agent') ?? null,
      metadata
    });
  } catch (error) {
    logger.error('Failed to write audit log', {
      action: input.action,
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
