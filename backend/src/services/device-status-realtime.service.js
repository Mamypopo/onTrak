// Service สำหรับจัดการ Borrow Status แบบ Real-time
// Broadcast status เมื่อมีการเปลี่ยนแปลง

import { broadcastToDashboard } from '../websocket/server.js';
import { getDeviceBorrowStatus, getMultipleDeviceBorrowStatus } from './device-status.service.js';

/**
 * Broadcast borrow status เมื่อมีการเปลี่ยนแปลง
 * เรียกใช้เมื่อ:
 * - สร้าง checkout (ยืม)
 * - คืน device
 * - เปลี่ยน maintenance status
 */
export async function broadcastBorrowStatusChange(deviceId) {
  try {
    const borrowStatus = await getDeviceBorrowStatus(deviceId);

    // Broadcast ไปยัง dashboard
    broadcastToDashboard({
      type: 'device_borrow_status',
      deviceId,
      data: {
        borrowStatus, // 'AVAILABLE' | 'IN_USE' | 'IN_MAINTENANCE'
        updatedAt: new Date(),
      },
    });

    return borrowStatus;
  } catch (error) {
    console.error('Error broadcasting borrow status:', error);
    throw error;
  }
}

/**
 * Broadcast borrow status สำหรับหลาย devices
 */
export async function broadcastMultipleBorrowStatus(deviceIds) {
  try {
    const statusMap = await getMultipleDeviceBorrowStatus(deviceIds);

    // Broadcast แต่ละ device
    Object.entries(statusMap).forEach(([deviceId, borrowStatus]) => {
      broadcastToDashboard({
        type: 'device_borrow_status',
        deviceId,
        data: {
          borrowStatus,
          updatedAt: new Date(),
        },
      });
    });

    return statusMap;
  } catch (error) {
    console.error('Error broadcasting multiple borrow status:', error);
    throw error;
  }
}

/**
 * Broadcast เมื่อสร้าง checkout (ยืม device)
 */
export async function onCheckoutCreated(checkoutId, deviceIds) {
  // Broadcast status ของทุก device ที่ถูกยืม
  await broadcastMultipleBorrowStatus(deviceIds);
}

/**
 * Broadcast เมื่อคืน device
 */
export async function onDeviceReturned(deviceId) {
  // Broadcast status ของ device ที่ถูกคืน
  await broadcastBorrowStatusChange(deviceId);
}

/**
 * Broadcast เมื่อเปลี่ยน maintenance status
 */
export async function onMaintenanceStatusChanged(deviceId) {
  // Broadcast status ของ device ที่เปลี่ยน maintenance status
  await broadcastBorrowStatusChange(deviceId);
}

