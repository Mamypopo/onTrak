import prisma from '../db/client.js';
import logger from '../utils/logger.js';

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in meters
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Update device location and save history if significant change
 */
export async function updateDeviceLocation(deviceCode, locationData) {
  try {
    // Find device first
    const device = await prisma.device.findUnique({
      where: { deviceCode },
    });

    if (!device) {
      logger.warn({ deviceCode }, 'Device not found for location update');
      return null;
    }

    // Update device location
    const updatedDevice = await prisma.device.update({
      where: { id: device.id },
      data: {
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        lastSeen: new Date(),
        status: 'ONLINE',
      },
    });

    // Smart Sampling: เก็บ location history เฉพาะเมื่อเปลี่ยนตำแหน่ง > 50m
    const MIN_DISTANCE_METERS = 50;

    let shouldSaveHistory = true;

    // ตรวจสอบว่าตำแหน่งเปลี่ยนมากพอหรือไม่
    if (device.latitude && device.longitude) {
      const distance = calculateDistance(
        device.latitude,
        device.longitude,
        locationData.latitude,
        locationData.longitude
      );

      if (distance < MIN_DISTANCE_METERS) {
        shouldSaveHistory = false;
        logger.debug({ deviceCode, distance }, 'Location change too small, skipping history');
      } else {
        logger.debug({ deviceCode, distance }, 'Location change significant, saving history');
      }
    } else {
      // ถ้าไม่มีตำแหน่งเก่า ให้บันทึกเป็นจุดแรก
      logger.debug({ deviceCode }, 'First location, saving history');
    }

    // Save location history if position changed significantly
    if (shouldSaveHistory) {
      try {
        await prisma.deviceLocationHistory.create({
          data: {
            deviceId: device.id,
            latitude: locationData.latitude,
            longitude: locationData.longitude,
            accuracy: locationData.accuracy || null,
            speed: locationData.speed || null,
            heading: locationData.heading || null,
          },
        });
        logger.info({ deviceCode, deviceId: device.id }, 'Location history saved');
      } catch (error) {
        logger.error({ error, deviceCode }, 'Error saving location history');
        // ไม่ throw error เพื่อไม่ให้กระทบการอัพเดท location หลัก
      }
    }

    return updatedDevice;
  } catch (error) {
    logger.error({ error, deviceCode }, 'Error updating device location');
    throw error;
  }
}

/**
 * Get device location history
 */
export async function getDeviceLocationHistory(deviceId, options = {}) {
  try {
    const {
      limit = 1000,
      offset = 0,
      hours,
      days,
      startDate,
      endDate,
    } = options;

    // Build date filter
    let dateFilter = {};
    if (hours) {
      const hoursAgo = new Date();
      hoursAgo.setHours(hoursAgo.getHours() - parseInt(hours));
      dateFilter = { createdAt: { gte: hoursAgo } };
    } else if (days) {
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - parseInt(days));
      dateFilter = { createdAt: { gte: daysAgo } };
    } else if (startDate || endDate) {
      dateFilter = {};
      if (startDate) {
        dateFilter.gte = new Date(startDate);
      }
      if (endDate) {
        dateFilter.lte = new Date(endDate);
      }
      dateFilter = { createdAt: dateFilter };
    }

    const locationHistory = await prisma.deviceLocationHistory.findMany({
      where: {
        deviceId,
        ...dateFilter,
      },
      orderBy: { createdAt: 'asc' },
      take: parseInt(limit),
      skip: parseInt(offset),
      select: {
        id: true,
        latitude: true,
        longitude: true,
        accuracy: true,
        speed: true,
        heading: true,
        createdAt: true,
      },
    });

    return locationHistory;
  } catch (error) {
    logger.error({ error, deviceId }, 'Error fetching location history');
    throw error;
  }
}

/**
 * Get device by ID
 */
export async function getDeviceById(id) {
  try {
    const device = await prisma.device.findUnique({
      where: { id },
      include: {
        metrics: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
        actionLogs: {
          take: 20,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!device) {
      return null;
    }

    // Convert BigInt to String for JSON serialization
    return {
      ...device,
      metrics: device.metrics.map(metric => ({
        ...metric,
        memoryTotal: metric.memoryTotal.toString(),
        memoryUsed: metric.memoryUsed.toString(),
        memoryAvailable: metric.memoryAvailable.toString(),
        storageTotal: metric.storageTotal.toString(),
        storageUsed: metric.storageUsed.toString(),
        storageAvailable: metric.storageAvailable.toString(),
      })),
    };
  } catch (error) {
    logger.error({ error, deviceId: id }, 'Error fetching device');
    throw error;
  }
}

/**
 * Get all devices
 */
export async function getAllDevices() {
  try {
    const devices = await prisma.device.findMany({
      orderBy: { lastSeen: 'desc' },
      include: {
        _count: {
          select: {
            metrics: true,
            actionLogs: true,
          },
        },
      },
    });

    return devices;
  } catch (error) {
    logger.error({ error }, 'Error fetching devices');
    throw error;
  }
}

