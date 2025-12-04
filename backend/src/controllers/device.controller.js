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
 * Update maintenance status for multiple devices
 * PATCH /api/device/maintenance-status
 */
export async function updateMaintenanceStatus(request, reply) {
  try {
    const { deviceIds, maintenanceStatus, problem, solution } = request.body;

    if (!deviceIds || !Array.isArray(deviceIds) || deviceIds.length === 0) {
      return reply.code(400).send({
        error: 'deviceIds is required and must be a non-empty array',
      });
    }

    if (!maintenanceStatus) {
      return reply.code(400).send({
        error: 'maintenanceStatus is required',
      });
    }

    const validStatuses = ['NONE', 'HAS_PROBLEM', 'NEEDS_REPAIR', 'IN_MAINTENANCE', 'DAMAGED'];
    if (!validStatuses.includes(maintenanceStatus)) {
      return reply.code(400).send({
        error: `maintenanceStatus must be one of: ${validStatuses.join(', ')}`,
      });
    }

    const currentUser = request.user;

    // Verify all devices exist
    const devices = await prisma.device.findMany({
      where: { id: { in: deviceIds } },
      select: { id: true, deviceCode: true },
    });

    if (devices.length !== deviceIds.length) {
      return reply.code(400).send({
        error: 'Some devices not found',
      });
    }

    // Update devices
    const updated = await prisma.$transaction(async (tx) => {
      const updatedDevices = await tx.device.updateMany({
        where: { id: { in: deviceIds } },
        data: { maintenanceStatus },
      });

      // Create audit log for each device
      await Promise.all(
        devices.map((device) =>
          createAuditLog(request, 'UPDATE_MAINTENANCE_STATUS', 'DEVICE', device.id, {
            deviceCode: device.deviceCode,
            maintenanceStatus,
            problem: problem || null,
            solution: solution || null,
          })
        )
      );

      return updatedDevices;
    });

    // Broadcast status changes
    const { onMaintenanceStatusChanged } = await import('../services/device-status-realtime.service.js');
    await Promise.all(deviceIds.map((deviceId) => onMaintenanceStatusChanged(deviceId)));

    logger.info(
      { deviceIds, maintenanceStatus, updatedCount: updated.count },
      'Maintenance status updated'
    );

    return {
      success: true,
      data: {
        updatedCount: updated.count,
        maintenanceStatus,
      },
      message: `Updated maintenance status for ${updated.count} device(s)`,
    };
  } catch (error) {
    logger.error({ error }, 'Error updating maintenance status');
    return reply.code(500).send({
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
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

/**
 * Update device information
 * PUT /api/device/:id
 */
export async function updateDevice(request, reply) {
  try {
    const { id } = request.params;
    const { deviceCode, name, serialNumber, model, osVersion } = request.body;

    if (!deviceCode) {
      return reply.code(400).send({
        error: 'Device code is required',
      });
    }

    // Check if device exists
    const existingDevice = await prisma.device.findUnique({
      where: { id },
    });

    if (!existingDevice) {
      return reply.code(404).send({
        error: 'Device not found',
      });
    }

    // Check if deviceCode is already taken by another device
    if (deviceCode !== existingDevice.deviceCode) {
      const deviceWithSameCode = await prisma.device.findUnique({
        where: { deviceCode },
      });

      if (deviceWithSameCode) {
        return reply.code(409).send({
          error: 'Device code already exists',
        });
      }
    }

    // Update device
    const updated = await prisma.device.update({
      where: { id },
      data: {
        deviceCode,
        name: name || null,
        serialNumber: serialNumber || null,
        model: model || null,
        osVersion: osVersion || null,
      },
    });

    // Create audit log
    await createAuditLog(request, 'UPDATE_DEVICE', 'DEVICE', id, {
      deviceCode: updated.deviceCode,
      name: updated.name,
      changes: {
        deviceCode: deviceCode !== existingDevice.deviceCode ? { from: existingDevice.deviceCode, to: deviceCode } : undefined,
        name: name !== existingDevice.name ? { from: existingDevice.name, to: name } : undefined,
        serialNumber: serialNumber !== existingDevice.serialNumber ? { from: existingDevice.serialNumber, to: serialNumber } : undefined,
        model: model !== existingDevice.model ? { from: existingDevice.model, to: model } : undefined,
        osVersion: osVersion !== existingDevice.osVersion ? { from: existingDevice.osVersion, to: osVersion } : undefined,
      },
    });

    // Serialize BigInt fields to strings for JSON
    const serializedDevice = {
      ...updated,
      bootTime: updated.bootTime ? updated.bootTime.toString() : null,
    };

    return {
      success: true,
      data: serializedDevice,
      message: 'Device updated successfully',
    };
  } catch (error) {
    logger.error({ error }, 'Error updating device');
    return reply.code(500).send({
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

/**
 * Delete device (hard delete)
 * DELETE /api/device/:id
 */
export async function deleteDevice(request, reply) {
  try {
    const { id } = request.params;

    // Check if device exists
    const device = await prisma.device.findUnique({
      where: { id },
      include: {
        checkoutItems: {
          where: {
            returnedAt: null, // Check for active checkouts
          },
          select: {
            id: true,
          },
        },
      },
    });

    if (!device) {
      return reply.code(404).send({
        error: 'Device not found',
      });
    }

    // Check if device is currently in use
    if (device.checkoutItems.length > 0) {
      return reply.code(400).send({
        error: 'Cannot delete device that is currently checked out',
      });
    }

    // Hard delete (since there's no deletedAt field in Device model)
    await prisma.device.delete({
      where: { id },
    });

    // Create audit log
    await createAuditLog(request, 'DELETE_DEVICE', 'DEVICE', id, {
      deviceCode: device.deviceCode,
      name: device.name,
    });

    return {
      success: true,
      message: 'Device deleted successfully',
    };
  } catch (error) {
    logger.error({ error }, 'Error deleting device');
    return reply.code(500).send({
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

