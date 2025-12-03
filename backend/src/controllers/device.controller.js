import logger from '../utils/logger.js';
import * as deviceService from '../services/device.service.js';
import * as routingService from '../services/routing.service.js';
import { publishCommand } from '../mqtt/handlers.js';
import { createAuditLog } from '../utils/audit.js';
import prisma from '../db/client.js';

/**
 * Create a new device
 */
export async function createDevice(request, reply) {
  try {
    const { deviceCode, name, serialNumber, model, osVersion } = request.body;

    if (!deviceCode) {
      return reply.code(400).send({
        error: 'Device code is required',
      });
    }

    const device = await deviceService.createDevice({
      deviceCode,
      name,
      serialNumber,
      model,
      osVersion,
    });

    // Create audit log
    await createAuditLog(request, 'CREATE_DEVICE', 'DEVICE', device.id, {
      deviceCode,
      name,
    });

    return {
      success: true,
      data: device,
      message: 'Device created successfully',
    };
  } catch (error) {
    logger.error({ error }, 'Error creating device');
    
    if (error.message === 'Device code already exists') {
      return reply.code(409).send({
        error: error.message,
      });
    }

    return reply.code(500).send({
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

/**
 * Get all devices
 */
export async function getAllDevices(request, reply) {
  try {
    const devices = await deviceService.getAllDevices();
    return {
      success: true,
      data: devices,
      count: devices.length,
    };
  } catch (error) {
    logger.error({ error }, 'Error fetching devices');
    return reply.code(500).send({
      error: 'Internal server error',
    });
  }
}

/**
 * Get device by ID
 */
export async function getDeviceById(request, reply) {
  try {
    const { id } = request.params;
    const device = await deviceService.getDeviceById(id);

    if (!device) {
      return reply.code(404).send({
        error: 'Device not found',
      });
    }

    return {
      success: true,
      data: device,
    };
  } catch (error) {
    logger.error({
      error: error.message,
      stack: error.stack,
      deviceId: request.params.id,
    }, 'Error fetching device');
    return reply.code(500).send({
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

/**
 * Get device location history
 */
export async function getDeviceLocationHistory(request, reply) {
  try {
    const { id } = request.params;
    const {
      limit = 1000,
      offset = 0,
      hours,
      days,
      startDate,
      endDate,
    } = request.query;

    // Verify device exists
    const device = await prisma.device.findUnique({
      where: { id },
    });

    if (!device) {
      return reply.code(404).send({
        error: 'Device not found',
      });
    }

    const locationHistory = await deviceService.getDeviceLocationHistory(id, {
      limit,
      offset,
      hours,
      days,
      startDate,
      endDate,
    });

    return {
      success: true,
      data: locationHistory,
      count: locationHistory.length,
    };
  } catch (error) {
    logger.error({ error }, 'Error fetching location history');
    return reply.code(500).send({
      error: 'Internal server error',
    });
  }
}

/**
 * Send command to device
 */
export async function sendCommand(request, reply) {
  try {
    const { id } = request.params;
    const { action, params } = request.body;

    if (!action) {
      return reply.code(400).send({
        error: 'Action is required',
      });
    }

    const device = await prisma.device.findUnique({
      where: { id },
    });

    if (!device) {
      return reply.code(404).send({
        error: 'Device not found',
      });
    }

    // Publish command via MQTT
    const command = {
      action,
      params: params || {},
    };

    const published = publishCommand(device.deviceCode, command);

    if (!published) {
      return reply.code(503).send({
        error: 'MQTT broker not available',
      });
    }

    // Log the action
    await prisma.deviceActionLog.create({
      data: {
        deviceId: device.id,
        userId: request.user?.id || null,
        user: request.user?.username || 'system',
        action: `COMMAND_${action}`,
        payload: command,
      },
    });

    // Create audit log
    await createAuditLog(request, `COMMAND_${action}`, 'DEVICE', device.id, command);

    logger.info({ deviceId: device.deviceCode, action }, 'Command sent to device');

    return {
      success: true,
      message: 'Command sent successfully',
      command,
    };
  } catch (error) {
    logger.error({ error }, 'Error sending command');
    return reply.code(500).send({
      error: 'Internal server error',
    });
  }
}

/**
 * Calculate route for device location history
 */
export async function calculateDeviceRoute(request, reply) {
  try {
    const { id } = request.params;
    const {
      days = 7,
      minDistance = 200,
      profile = 'driving-car',
    } = request.query;

    // Verify device exists
    const device = await prisma.device.findUnique({
      where: { id },
    });

    if (!device) {
      return reply.code(404).send({
        error: 'Device not found',
      });
    }

    // Get location history
    const locationHistory = await deviceService.getDeviceLocationHistory(id, {
      days: parseInt(days),
      limit: 1000,
    });

    if (locationHistory.length < 2) {
      return {
        success: true,
        data: locationHistory.map(loc => [loc.latitude, loc.longitude]),
        message: 'Not enough points for routing',
      };
    }

    // Convert to coordinates array
    const coordinates = locationHistory.map(loc => [loc.latitude, loc.longitude]);

    // Calculate route
    const route = await routingService.calculateSimplifiedRoute(
      coordinates,
      parseInt(minDistance),
      profile
    );

    return {
      success: true,
      data: route,
      originalPoints: locationHistory.length,
      routePoints: route.length,
    };
  } catch (error) {
    logger.error({ error }, 'Error calculating device route');
    return reply.code(500).send({
      error: 'Internal server error',
    });
  }
}

/**
 * Get device history
 */
export async function getDeviceHistory(request, reply) {
  try {
    const { id } = request.params;
    const { limit = 50, offset = 0 } = request.query;

    const device = await prisma.device.findUnique({
      where: { id },
    });

    if (!device) {
      return reply.code(404).send({
        error: 'Device not found',
      });
    }

    // Get action logs
    const logs = await prisma.deviceActionLog.findMany({
      where: { deviceId: id },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit),
      skip: parseInt(offset),
      include: {
        userRef: {
          select: {
            id: true,
            username: true,
            fullName: true,
          },
        },
      },
    });

    
    const checkoutItems = await prisma.checkoutItem.findMany({
      where: { deviceId: id },
      orderBy: { createdAt: 'desc' },
      include: {
        checkout: {
          select: {
            id: true,
            checkoutNumber: true,
            company: true,
            charger: true,
            createdAt: true,
            creator: {
              select: {
                id: true,
                username: true,
                fullName: true,
              },
            },
          },
        },
        returner: {
          select: {
            id: true,
            username: true,
            fullName: true,
          },
        },
      },
    });

    return {
      success: true,
      data: {
        logs,
        checkouts: checkoutItems, 
      },
    };
  } catch (error) {
    logger.error({ error, deviceId: id }, 'Error fetching device history');
    return reply.code(500).send({
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

