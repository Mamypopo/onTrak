import prisma from '../db/client.js';
import logger from '../utils/logger.js';
import { hashPassword } from '../utils/password.js';
import { createAuditLog } from '../utils/audit.js';

async function userRoutes(fastify, options) {
  // Get all users (Admin/Manager only)
  fastify.get('/', {
    preHandler: [fastify.authenticate, fastify.requireRole(['ADMIN', 'STAFF'])],
  }, async (request, reply) => {
    try {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          username: true,
          email: true,
          fullName: true,
          role: true,
          isActive: true,
          lastLogin: true,
          createdAt: true,
          updatedAt: true,
          // Exclude password
        },
        orderBy: { createdAt: 'desc' },
      });

      await createAuditLog(request, 'VIEW_USERS', 'USER', null, { count: users.length });

      return {
        success: true,
        data: users,
        count: users.length,
      };
    } catch (error) {
      logger.error({ error }, 'Error fetching users');
      return reply.code(500).send({
        error: 'Internal server error',
      });
    }
  });

  // Get user by ID
  fastify.get('/:id', {
    preHandler: [fastify.authenticate, fastify.requireRole(['ADMIN', 'STAFF'])],
  }, async (request, reply) => {
    try {
      const { id } = request.params;

      const user = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          username: true,
          email: true,
          fullName: true,
          role: true,
          isActive: true,
          lastLogin: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!user) {
        return reply.code(404).send({
          error: 'User not found',
        });
      }

      await createAuditLog(request, 'VIEW_USER', 'USER', id);

      return {
        success: true,
        data: user,
      };
    } catch (error) {
      logger.error({ error }, 'Error fetching user');
      return reply.code(500).send({
        error: 'Internal server error',
      });
    }
  });

  // Create user (Admin only)
  fastify.post('/', {
    preHandler: [fastify.authenticate, fastify.requireRole(['ADMIN'])],
  }, async (request, reply) => {
    try {
      const { username, email, password, fullName, role } = request.body;

      if (!username || !password) {
        return reply.code(400).send({
          error: 'Username and password are required',
        });
      }

      // Check if user exists
      const existing = await prisma.user.findFirst({
        where: {
          OR: [
            { username },
            ...(email ? [{ email }] : []),
          ],
        },
      });

      if (existing) {
        return reply.code(400).send({
          error: 'User already exists',
        });
      }

      // Create user
      const user = await prisma.user.create({
        data: {
          username,
          email: email || null,
          password: hashPassword(password),
          fullName: fullName || null,
          role: role || 'STAFF',
        },
        select: {
          id: true,
          username: true,
          email: true,
          fullName: true,
          role: true,
          isActive: true,
          createdAt: true,
        },
      });

      await createAuditLog(request, 'CREATE_USER', 'USER', user.id, { username: user.username });

      logger.info({ userId: user.id, username: user.username }, 'User created');

      return {
        success: true,
        data: user,
      };
    } catch (error) {
      logger.error({ error }, 'Error creating user');
      return reply.code(500).send({
        error: 'Internal server error',
      });
    }
  });

  // Update user (Admin/Manager or self)
  fastify.put('/:id', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { id } = request.params;
      const { email, fullName, role, isActive } = request.body;
      const currentUser = request.user;

      // Check permissions
      const isAdmin = currentUser.role === 'ADMIN';
      const isStaff = currentUser.role === 'STAFF';
      const isSelf = currentUser.id === id;

      if (!isAdmin && !isSelf) {
        return reply.code(403).send({
          error: 'Forbidden',
        });
      }

      // Only admin can change role and isActive
      const updateData = {
        ...(email !== undefined && { email }),
        ...(fullName !== undefined && { fullName }),
        ...(isAdmin && role !== undefined && { role }),
        ...(isAdmin && isActive !== undefined && { isActive }),
      };

      const user = await prisma.user.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          username: true,
          email: true,
          fullName: true,
          role: true,
          isActive: true,
          updatedAt: true,
        },
      });

      await createAuditLog(request, 'UPDATE_USER', 'USER', id, updateData);

      return {
        success: true,
        data: user,
      };
    } catch (error) {
      logger.error({ error }, 'Error updating user');
      return reply.code(500).send({
        error: 'Internal server error',
      });
    }
  });

  // Change password
  fastify.post('/:id/change-password', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { id } = request.params;
      const { oldPassword, newPassword } = request.body;
      const currentUser = request.user;

      // Check permissions
      const isAdmin = currentUser.role === 'ADMIN';
      const isSelf = currentUser.id === id;

      if (!isAdmin && !isSelf) {
        return reply.code(403).send({
          error: 'Forbidden',
        });
      }

      if (!newPassword || newPassword.length < 6) {
        return reply.code(400).send({
          error: 'New password must be at least 6 characters',
        });
      }

      // Verify old password (if not admin)
      if (!isAdmin) {
        const user = await prisma.user.findUnique({
          where: { id },
        });

        if (!user) {
          return reply.code(404).send({
            error: 'User not found',
          });
        }

        const { verifyPassword } = await import('../utils/password.js');
        if (!verifyPassword(oldPassword, user.password)) {
          return reply.code(400).send({
            error: 'Invalid old password',
          });
        }
      }

      // Update password
      await prisma.user.update({
        where: { id },
        data: {
          password: hashPassword(newPassword),
        },
      });

      await createAuditLog(request, 'CHANGE_PASSWORD', 'USER', id);

      return {
        success: true,
        message: 'Password changed successfully',
      };
    } catch (error) {
      logger.error({ error }, 'Error changing password');
      return reply.code(500).send({
        error: 'Internal server error',
      });
    }
  });

  // Delete user (Admin only)
  fastify.delete('/:id', {
    preHandler: [fastify.authenticate, fastify.requireRole(['ADMIN'])],
  }, async (request, reply) => {
    try {
      const { id } = request.params;

      // Prevent deleting self
      if (request.user.id === id) {
        return reply.code(400).send({
          error: 'Cannot delete yourself',
        });
      }

      await prisma.user.delete({
        where: { id },
      });

      await createAuditLog(request, 'DELETE_USER', 'USER', id);

      return {
        success: true,
        message: 'User deleted successfully',
      };
    } catch (error) {
      logger.error({ error }, 'Error deleting user');
      return reply.code(500).send({
        error: 'Internal server error',
      });
    }
  });

  // Get audit logs (Admin only)
  fastify.get('/audit-logs', {
    preHandler: [fastify.authenticate, fastify.requireRole(['ADMIN'])],
  }, async (request, reply) => {
    try {
      const { limit = 100, offset = 0, userId, action } = request.query;

      const where = {};
      if (userId) where.userId = userId;
      if (action) where.action = action;

      const logs = await prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              username: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit),
        skip: parseInt(offset),
      });

      return {
        success: true,
        data: logs,
        count: logs.length,
      };
    } catch (error) {
      logger.error({ error }, 'Error fetching audit logs');
      return reply.code(500).send({
        error: 'Internal server error',
      });
    }
  });
}

export default userRoutes;

