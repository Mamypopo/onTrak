// Service สำหรับคำนวณสถานะของ Device
// สถานะ: AVAILABLE, IN_USE, IN_MAINTENANCE

import prisma from '../db/client.js';

/**
 * คำนวณสถานะของ device จาก CheckoutItem
 * @param {string} deviceId - Device ID
 * @returns {Promise<'AVAILABLE' | 'IN_USE' | 'IN_MAINTENANCE'>}
 */
export async function getDeviceBorrowStatus(deviceId) {
  // 1. ตรวจสอบสถานะ maintenance จาก Device table (current state)
  const device = await prisma.device.findUnique({
    where: { id: deviceId },
    select: { maintenanceStatus: true },
  });

  if (device && device.maintenanceStatus && device.maintenanceStatus !== 'NONE') {
    // ถ้ามีปัญหาแต่ยังไม่ได้ส่งซ่อม = HAS_PROBLEM หรือ NEEDS_REPAIR → IN_MAINTENANCE
    // ถ้ากำลังซ่อม = IN_MAINTENANCE → IN_MAINTENANCE
    if (['IN_MAINTENANCE', 'HAS_PROBLEM', 'NEEDS_REPAIR'].includes(device.maintenanceStatus)) {
      return 'IN_MAINTENANCE';
    }
  }

  // 2. ตรวจสอบว่ามี checkout ที่ active (ยังไม่คืน) หรือไม่
  const activeCheckout = await prisma.checkoutItem.findFirst({
    where: {
      deviceId,
      returnedAt: null, // ยังไม่คืน
      checkout: {
        deletedAt: null, // ไม่ได้ soft delete
      },
    },
    include: {
      checkout: {
        select: {
          deletedAt: true,
        },
      },
    },
  });

  if (activeCheckout && !activeCheckout.checkout.deletedAt) {
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

  // Query devices เพื่อดึง maintenanceStatus จาก Device table (current state)
  const devices = await prisma.device.findMany({
    where: {
      id: { in: deviceIds },
    },
    select: {
      id: true,
      maintenanceStatus: true,
    },
  });

  // Query checkout items ที่ยังไม่คืน (สำหรับตรวจสอบ IN_USE)
  const checkoutItems = await prisma.checkoutItem.findMany({
    where: {
      deviceId: { in: deviceIds },
      returnedAt: null, // ยังไม่คืน
    },
    select: {
      deviceId: true,
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

  // Update status based on device maintenanceStatus
  devices.forEach(device => {
    if (device.maintenanceStatus && device.maintenanceStatus !== 'NONE') {
      if (['IN_MAINTENANCE', 'HAS_PROBLEM', 'NEEDS_REPAIR'].includes(device.maintenanceStatus)) {
        statusMap[device.id] = 'IN_MAINTENANCE';
      }
    }
  });

  // Update status based on checkout items (IN_USE)
  checkoutItems.forEach(item => {
    if (item.checkout.deletedAt) return; // Skip deleted checkouts
    if (statusMap[item.deviceId] === 'AVAILABLE') {
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

  // Query latest problem for devices with maintenance status
  const devicesWithProblems = deviceIds.filter(id => 
    statusMap[id] === 'IN_MAINTENANCE'
  );

  const latestProblems = {};
  if (devicesWithProblems.length > 0) {
    const problemItems = await prisma.checkoutItem.findMany({
      where: {
        deviceId: { in: devicesWithProblems },
        problem: { not: null },
        returnedAt: { not: null },
      },
      select: {
        deviceId: true,
        problem: true,
        returnedAt: true,
      },
      orderBy: {
        returnedAt: 'desc',
      },
    });

    // Get latest problem for each device
    problemItems.forEach(item => {
      if (!latestProblems[item.deviceId]) {
        latestProblems[item.deviceId] = item.problem;
      }
    });
  }

  // Map devices with status (O(n) - efficient)
  return devices.map(device => ({
    ...device,
    borrowStatus: statusMap[device.id] || 'AVAILABLE',
    connectionStatus: device.status,
    latestProblem: latestProblems[device.id] || null,
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

