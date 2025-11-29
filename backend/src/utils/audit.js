import prisma from '../db/client.js';
import logger from '../utils/logger.js';

/**
 * Create audit log entry
 */
export async function createAuditLog(
  request,
  action,
  resource = null,
  resourceId = null,
  details = null
) {
  try {
    const userId = request.user?.id || null;
    const username = request.user?.username || null;
    const ipAddress = request.ip || request.headers['x-forwarded-for'] || null;
    const userAgent = request.headers['user-agent'] || null;

    await prisma.auditLog.create({
      data: {
        userId,
        username,
        action,
        resource,
        resourceId,
        details: details ? JSON.parse(JSON.stringify(details)) : null,
        ipAddress,
        userAgent,
      },
    });
  } catch (error) {
    logger.error({ error }, 'Error creating audit log');
    // Don't throw - audit logging should not break the request
  }
}

