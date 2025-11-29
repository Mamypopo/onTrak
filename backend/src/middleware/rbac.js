import logger from '../utils/logger.js';

/**
 * Require specific roles
 * Usage: preHandler: [fastify.authenticate, fastify.requireRole(['ADMIN', 'MANAGER'])]
 */
export function requireRole(allowedRoles) {
  return async (request, reply) => {
    try {
      const userRole = request.user?.role;

      if (!userRole) {
        return reply.code(401).send({
          error: 'Unauthorized',
        });
      }

      if (!allowedRoles.includes(userRole)) {
        logger.warn({ 
          userId: request.user.id, 
          userRole, 
          requiredRoles: allowedRoles 
        }, 'Access denied - insufficient permissions');
        
        return reply.code(403).send({
          error: 'Forbidden - insufficient permissions',
        });
      }
    } catch (error) {
      logger.error({ error }, 'Error in requireRole middleware');
      return reply.code(500).send({
        error: 'Internal server error',
      });
    }
  };
}
