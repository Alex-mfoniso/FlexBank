import { prisma } from "./prisma";
import { logger } from "./logger";

export interface LogAuditParams {
  userId?: string;
  action: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Persists an audit log event in the database and logs a corresponding structured record.
 * This runs with a fail-open design so that database audit logging errors do not interrupt
 * business-critical operational flows.
 * 
 * @param params Audit details containing action, metadata, and optional user/network tracing context
 */
export const logAuditEvent = async (params: LogAuditParams): Promise<void> => {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId || null,
        action: params.action,
        metadata: (params.metadata || undefined) as any,
        ipAddress: params.ipAddress || null,
        userAgent: params.userAgent || null,
      },
    });

    logger.info(
      {
        auditAction: params.action,
        userId: params.userId,
        metadata: params.metadata,
      },
      `Audit log created: ${params.action}`,
    );
  } catch (err) {
    // Fail open and log the failure
    logger.error(
      { err, action: params.action, userId: params.userId },
      "Operational error while writing database audit log",
    );
  }
};
export default logAuditEvent;
