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
        // Circular Buffer: เก็บแค่จำนวนจำกัด (เช่น 100 records) แล้วลบอันเก่าสุด
        const MAX_LOCATION_HISTORY_PER_DEVICE = parseInt(process.env.MAX_LOCATION_HISTORY_PER_DEVICE || '100');
        
        // ตรวจสอบจำนวน records ปัจจุบัน
        const currentCount = await prisma.deviceLocationHistory.count({
          where: { deviceId: device.id },
        });
        
        // ถ้าเกิน limit ให้ลบอันเก่าสุดออกก่อน (ลบให้เหลือ limit - 1)
        if (currentCount >= MAX_LOCATION_HISTORY_PER_DEVICE) {
          // คำนวณจำนวนที่ต้องลบ (ถ้ามี 101 records, limit = 100, ต้องลบ 2 อัน)
          const recordsToDelete = currentCount - MAX_LOCATION_HISTORY_PER_DEVICE + 1;
          
          // หา records เก่าสุดที่ต้องลบ
          const oldestRecords = await prisma.deviceLocationHistory.findMany({
            where: { deviceId: device.id },
            orderBy: { createdAt: 'asc' },
            take: recordsToDelete,
            select: { id: true },
          });
          
          if (oldestRecords.length > 0) {
            // ลบ records เก่าสุดทั้งหมดที่เกิน limit
            await prisma.deviceLocationHistory.deleteMany({
              where: {
                deviceId: device.id,
                id: { in: oldestRecords.map(r => r.id) },
              },
            });
            logger.debug({ 
              deviceCode, 
              deletedCount: oldestRecords.length,
              beforeCount: currentCount,
              afterCount: currentCount - oldestRecords.length
            }, 'Deleted oldest location history (circular buffer)');
          }
        }
        
        // บันทึก location history ใหม่
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
        logger.info({ deviceCode, deviceId: device.id, currentCount }, 'Location history saved');
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

    // Calculate connection status on-the-fly (computed, no DB update)
    const computedStatus = calculateConnectionStatus(device.lastSeen);

    // Serialize BigInt fields to strings for JSON
    // Note: DateTime fields (like lastSeen) are automatically serialized to ISO strings by Prisma
    return {
      ...device,
      bootTime: device.bootTime ? device.bootTime.toString() : null,
      // Override stored status with computed status (more accurate)
      status: computedStatus,
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
 * Create a new device
 */
export async function createDevice(deviceData) {
  try {
    // Check if deviceCode already exists
    const existingDevice = await prisma.device.findUnique({
      where: { deviceCode: deviceData.deviceCode },
    });

    if (existingDevice) {
      throw new Error('Device code already exists');
    }

    const device = await prisma.device.create({
      data: {
        deviceCode: deviceData.deviceCode,
        name: deviceData.name || null,
        serialNumber: deviceData.serialNumber || null,
        model: deviceData.model || null,
        osVersion: deviceData.osVersion || null,
        status: 'OFFLINE',
        lastSeen: new Date(), // Ensure lastSeen is set explicitly
      },
    });

    logger.info({ deviceId: device.id, deviceCode: device.deviceCode }, 'Device created');
    return device;
  } catch (error) {
    logger.error({ error, deviceData }, 'Error creating device');
    throw error;
  }
}

/**
 * Calculate connection status from lastSeen (computed, no DB update needed)
 * @param {Date} lastSeen - Last seen timestamp
 * @returns {'ONLINE' | 'OFFLINE'}
 */
function calculateConnectionStatus(lastSeen) {
  const OFFLINE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes
  const now = new Date();
  const timeSinceLastSeen = now.getTime() - new Date(lastSeen).getTime();
  
  return timeSinceLastSeen > OFFLINE_THRESHOLD_MS ? 'OFFLINE' : 'ONLINE';
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

    // Serialize BigInt fields to strings for JSON
    // DateTime fields (like lastSeen) are automatically serialized to ISO strings by Prisma
    // Calculate connection status on-the-fly (computed, no DB update)
    return devices.map(device => {
      const computedStatus = calculateConnectionStatus(device.lastSeen);
      return {
        ...device,
        bootTime: device.bootTime ? device.bootTime.toString() : null,
        // Override stored status with computed status (more accurate)
        status: computedStatus,
      };
    });
  } catch (error) {
    logger.error({ error }, 'Error fetching devices');
    throw error;
  }
}

