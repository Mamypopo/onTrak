// Service สำหรับคำนวณสถานะของ Device
// สถานะ: AVAILABLE, IN_USE, IN_MAINTENANCE

import prisma from '../db/client.js';

/**
 * คำนวณสถานะของ device จาก CheckoutItem
 * @param {string} deviceId - Device ID
 * @returns {Promise<'AVAILABLE' | 'IN_USE' | 'IN_MAINTENANCE'>}
 */
export async function getDeviceBorrowStatus(deviceId) {
  // 1. ตรวจสอบว่ามี maintenance status = IN_MAINTENANCE หรือไม่
  const inMaintenance = await prisma.checkoutItem.findFirst({
    where: {
      deviceId,
      maintenanceStatus: 'IN_MAINTENANCE',
      returnedAt: null, // ยังไม่คืน
    },
  });

  if (inMaintenance) {
    return 'IN_MAINTENANCE';
  }

  // 2. ตรวจสอบว่ามี checkout ที่ active (ยังไม่คืน) หรือไม่
  const activeCheckout = await prisma.checkoutItem.findFirst({
    where: {
      deviceId,
      returnedAt: null, // ยังไม่คืน
    },
    include: {
      checkout: {
        where: {
          deletedAt: null, // ไม่ได้ soft delete
        },
      },
    },
  });

  if (activeCheckout) {
    return 'IN_USE';
  }

  // 3. ถ้าไม่มี checkout active = ว่าง
  return 'AVAILABLE';
}

/**
 * คำนวณสถานะของหลาย devices พร้อมกัน (optimized)
 * @param {string[]} deviceIds - Array of Device IDs
 * @returns {Promise<Record<string, 'AVAILABLE' | 'IN_USE' | 'IN_MAINTENANCE'>>}
 */
export async function getMultipleDeviceBorrowStatus(deviceIds) {
  // ถ้าไม่มี deviceIds ให้ return empty object
  if (!deviceIds || deviceIds.length === 0) {
    return {};
  }

  // Query ทั้งหมดในครั้งเดียว (optimized - ใช้ index)
  // Index: deviceId, returnedAt, maintenanceStatus
  const checkoutItems = await prisma.checkoutItem.findMany({
    where: {
      deviceId: { in: deviceIds },
      returnedAt: null, // ยังไม่คืน
    },
    include: {
      checkout: {
        select: {
          deletedAt: true,
        },
      },
    },
    // ใช้ select เฉพาะ fields ที่ต้องการ (ลด data transfer)
    select: {
      deviceId: true,
      maintenanceStatus: true,
      checkout: {
        select: {
          deletedAt: true,
        },
      },
    },
  });

  const statusMap = {};

  // Initialize all devices as AVAILABLE
  deviceIds.forEach(id => {
    statusMap[id] = 'AVAILABLE';
  });

  // Update status based on checkout items
  checkoutItems.forEach(item => {
    if (item.checkout.deletedAt) return; // Skip deleted checkouts

    if (item.maintenanceStatus === 'IN_MAINTENANCE') {
      statusMap[item.deviceId] = 'IN_MAINTENANCE';
    } else if (statusMap[item.deviceId] === 'AVAILABLE') {
      statusMap[item.deviceId] = 'IN_USE';
    }
  });

  return statusMap;
}

/**
 * Get device with borrow status
 * @param {string} deviceId - Device ID
 * @returns {Promise<Object>}
 */
export async function getDeviceWithStatus(deviceId) {
  const device = await prisma.device.findUnique({
    where: { id: deviceId },
    include: {
      checkoutItems: {
        where: {
          returnedAt: null, // Active checkout only
        },
        include: {
          checkout: {
            select: {
              checkoutNumber: true,
              company: true,
              charger: true,
            },
          },
        },
        take: 1,
      },
    },
  });

  if (!device) return null;

  const borrowStatus = await getDeviceBorrowStatus(deviceId);

  return {
    ...device,
    borrowStatus, // AVAILABLE, IN_USE, IN_MAINTENANCE
    connectionStatus: device.status, // ONLINE, OFFLINE
  };
}

/**
 * Get all devices with borrow status
 * @param {Object} options - Query options
 * @returns {Promise<Array>}
 */
export async function getAllDevicesWithStatus(options = {}) {
  // Query devices (ใช้ index ที่มีอยู่แล้ว)
  const devices = await prisma.device.findMany({
    ...options,
  });

  // ถ้าไม่มี devices ให้ return empty array
  if (devices.length === 0) {
    return [];
  }

  // Query borrow status สำหรับทุก devices ในครั้งเดียว (optimized)
  const deviceIds = devices.map(d => d.id);
  const statusMap = await getMultipleDeviceBorrowStatus(deviceIds);

  // Map devices with status (O(n) - efficient)
  return devices.map(device => ({
    ...device,
    borrowStatus: statusMap[device.id] || 'AVAILABLE',
    connectionStatus: device.status,
  }));
}

/**
 * Filter devices by borrow status
 * @param {Object} options - Query options
 * @param {string} borrowStatus - 'AVAILABLE' | 'IN_USE' | 'IN_MAINTENANCE'
 * @returns {Promise<Array>}
 */
export async function getDevicesByBorrowStatus(borrowStatus, options = {}) {
  // Get all devices first
  const allDevices = await getAllDevicesWithStatus(options);
  
  // Filter by borrow status
  return allDevices.filter(device => device.borrowStatus === borrowStatus);
}

/**
 * Get devices with multiple filters
 * @param {Object} filters - Filter options
 * @param {string} filters.borrowStatus - 'AVAILABLE' | 'IN_USE' | 'IN_MAINTENANCE'
 * @param {string} filters.connectionStatus - 'ONLINE' | 'OFFLINE'
 * @param {Object} options - Prisma query options
 * @returns {Promise<Array>}
 */
export async function getDevicesWithFilters(filters = {}, options = {}) {
  // Build Prisma where clause
  const where = { ...options.where };
  
  // Filter by connection status (stored in DB)
  if (filters.connectionStatus) {
    where.status = filters.connectionStatus;
  }
  
  // Get devices with connection status filter
  const devices = await getAllDevicesWithStatus({ ...options, where });
  
  // Filter by borrow status (computed)
  if (filters.borrowStatus) {
    return devices.filter(device => device.borrowStatus === filters.borrowStatus);
  }
  
  return devices;
}

/**
 * Get device counts by status
 * @param {Object} options - Query options
 * @returns {Promise<Object>}
 */
export async function getDeviceStatusCounts(options = {}) {
  const devices = await getAllDevicesWithStatus(options);
  
  const counts = {
    total: devices.length,
    connection: {
      ONLINE: devices.filter(d => d.connectionStatus === 'ONLINE').length,
      OFFLINE: devices.filter(d => d.connectionStatus === 'OFFLINE').length,
    },
    borrow: {
      AVAILABLE: devices.filter(d => d.borrowStatus === 'AVAILABLE').length,
      IN_USE: devices.filter(d => d.borrowStatus === 'IN_USE').length,
      IN_MAINTENANCE: devices.filter(d => d.borrowStatus === 'IN_MAINTENANCE').length,
    },
  };
  
  return counts;
}

