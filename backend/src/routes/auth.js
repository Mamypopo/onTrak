import { config } from '../config/index.js';
import logger from '../utils/logger.js';
import prisma from '../db/client.js';
import { verifyPassword } from '../utils/password.js';
import { createAuditLog } from '../utils/audit.js';

async function authRoutes(fastify, options) {
  // Login endpoint
  fastify.post('/login', async (request, reply) => {
    try {
      const { username, password } = request.body;

      if (!username || !password) {
        return reply.code(400).send({
          error: 'Username and password are required',
        });
      }

      // Find user
      const user = await prisma.user.findUnique({
        where: { username },
      });

      if (!user) {
        await createAuditLog(request, 'LOGIN_FAILED', 'AUTH', null, { username, reason: 'User not found' });
        return reply.code(401).send({
          error: 'Invalid credentials',
        });
      }

      // Check if user is active
      if (!user.isActive) {
        await createAuditLog(request, 'LOGIN_FAILED', 'AUTH', user.id, { username, reason: 'User inactive' });
        return reply.code(403).send({
          error: 'Account is disabled',
        });
      }

      // Verify password
      if (!verifyPassword(password, user.password)) {
        await createAuditLog(request, 'LOGIN_FAILED', 'AUTH', user.id, { username, reason: 'Invalid password' });
        return reply.code(401).send({
          error: 'Invalid credentials',
        });
      }

      // Update last login
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLogin: new Date() },
      });

      // Generate JWT token
      const token = fastify.jwt.sign({
        id: user.id,
        username: user.username,
        role: user.role,
      });

      // Create audit log
      await createAuditLog(request, 'LOGIN_SUCCESS', 'AUTH', user.id, { username: user.username });

      logger.info({ userId: user.id, username: user.username, role: user.role }, 'User logged in');

      return {
        success: true,
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
        },
      };
    } catch (error) {
      logger.error({ error }, 'Login error');
      return reply.code(500).send({
        error: 'Internal server error',
      });
    }
  });

  // Verify token endpoint
  fastify.get('/verify', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      // Get fresh user data from database
      const user = await prisma.user.findUnique({
        where: { id: request.user.id },
        select: {
          id: true,
          username: true,
          email: true,
          fullName: true,
          role: true,
          isActive: true,
        },
      });

      if (!user || !user.isActive) {
        return reply.code(401).send({
          error: 'User not found or inactive',
        });
      }

      return {
        success: true,
        user,
      };
    } catch (error) {
      logger.error({ error }, 'Error verifying token');
      return reply.code(500).send({
        error: 'Internal server error',
      });
    }
  });

  // Get current user profile
  fastify.get('/me', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: request.user.id },
        select: {
          id: true,
          username: true,
          email: true,
          fullName: true,
          role: true,
          isActive: true,
          lastLogin: true,
          createdAt: true,
        },
      });

      if (!user) {
        return reply.code(404).send({
          error: 'User not found',
        });
      }

      return {
        success: true,
        data: user,
      };
    } catch (error) {
      logger.error({ error }, 'Error fetching user profile');
      return reply.code(500).send({
        error: 'Internal server error',
      });
    }
  });
}

export default authRoutes;

