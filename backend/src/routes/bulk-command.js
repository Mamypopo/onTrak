import * as deviceService from "../services/device.service.js";
import prisma from "../db/client.js";
import logger from "../utils/logger.js";

async function bulkCommandRoutes(fastify, options) {
  fastify.post(
    "/command",
    {
      preHandler: [fastify.authenticate, fastify.requireRole(['ADMIN', 'STAFF'])],
    },
    async (request, reply) => {
       try {
        const { deviceIds, action, params } = request.body;

        if (!action) {
          return reply.code(400).send({
            error: 'Action is required',
          });
        }
        
        if (!deviceIds || !Array.isArray(deviceIds) || deviceIds.length === 0) {
          return reply.code(400).send({
            error: 'deviceIds is required and must be a non-empty array',
          });
        }

        // Fetch only the selected devices
        const devices = await prisma.device.findMany({
          where: { id: { in: deviceIds } },
          select: { id: true, deviceCode: true },
        });

        if (!devices || devices.length === 0) {
          return reply.code(404).send({
            error: 'No devices found',
          });
        }

        const command = { action, params: params || {} };

        // Send command to all devices
        const results = await Promise.all(
          devices.map(device =>
            deviceService.sendCommandToDevice(device.id, command, request.user)
          )
        );

        // Check for errors
        const successfulCommands = results.filter(r => r.success);
        const failedCommands = results.filter(r => !r.success);

        if (failedCommands.length > 0) {
          logger.warn({
            action,
            failedCount: failedCommands.length,
            successCount: successfulCommands.length,
          }, 'Some bulk commands failed to send');
        }

        return {
          success: true,
          message: `Command "${action}" sent to all devices`,
          data: {
            totalDevices: devices.length,
            successCount: successfulCommands.length,
            failureCount: failedCommands.length,
          },
        };
      } catch (error) {
        console.error({ error }, 'Error sending bulk command');
        return reply.code(500).send({
          error: 'Internal server error',
        });
      }
    }
  );
}

export default bulkCommandRoutes;
