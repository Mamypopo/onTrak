import logger from '../utils/logger.js';
import prisma from '../db/client.js';

/**
 * JWT Authentication middleware
 */
export async function authenticate(request, reply) {
  try {
    await request.jwtVerify();
    
    // Verify user still exists and is active
    if (request.user?.id) {
      const user = await prisma.user.findUnique({
        where: { id: request.user.id },
        select: { id: true, isActive: true, role: true },
      });

      if (!user || !user.isActive) {
        return reply.code(401).send({
          error: 'User not found or inactive',
        });
      }

      // Update request.user with fresh data
      request.user = {
        ...request.user,
        role: user.role,
        isActive: user.isActive,
      };
    }
  } catch (error) {
    logger.warn({ error }, 'Authentication failed');
    reply.code(401).send({
      error: 'Unauthorized',
    });
  }
}

