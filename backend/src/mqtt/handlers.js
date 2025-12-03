import mqttClient from './client.js';
import prisma from '../db/client.js';
import logger from '../utils/logger.js';
import { broadcastToDashboard } from '../websocket/server.js';
import * as deviceService from '../services/device.service.js';
import { shouldLogEvent, shouldLogBootEvent } from '../config/event-filter.js';

// Topic patterns
const STATUS_TOPIC_PATTERN = /^tablet\/(.+)\/status$/;
const LOCATION_TOPIC_PATTERN = /^tablet\/(.+)\/location$/;
const METRICS_TOPIC_PATTERN = /^tablet\/(.+)\/metrics$/;
const EVENT_TOPIC_PATTERN = /^tablet\/(.+)\/event$/;

/**
 * Handle device status update
 */
async function handleDeviceStatus(topic, data) {
  try {
    const match = topic.match(STATUS_TOPIC_PATTERN);
    if (!match) return;

    const deviceId = match[1];
    logger.debug({ deviceId, data }, 'Received device status');

    // Find device first - only update if device exists
    const device = await prisma.device.findUnique({
      where: { deviceCode: deviceId },
    });

    if (!device) {
      logger.warn({ deviceId }, 'Device not found in database. Please create device first before it can send status updates.');
      return;
    }

    // Update existing device only
    const updatedDevice = await prisma.device.update({
      where: { deviceCode: deviceId },
      data: {
        battery: data.battery || 0,
        wifiStatus: data.wifiStatus || false,
        isCharging: data.isCharging || false,
        batteryHealth: data.batteryHealth || null,
        chargingMethod: data.chargingMethod || null,
        mobileDataEnabled: data.mobileDataEnabled || false,
        networkConnected: data.networkConnected || false,
        screenOn: data.screenOn || false,
        volumeLevel: data.volumeLevel || 0,
        bluetoothEnabled: data.bluetoothEnabled || false,
        installedAppsCount: data.installedAppsCount || 0,
        bootTime: data.bootTime ? BigInt(data.bootTime) : null,
        lastSeen: new Date(),
        status: 'ONLINE',
      },
    });

    // Broadcast to dashboard
    broadcastToDashboard({
      type: 'device_status',
      deviceId: updatedDevice.id,
      deviceCode: deviceId,
      data: {
        battery: updatedDevice.battery,
        wifiStatus: updatedDevice.wifiStatus,
        isCharging: updatedDevice.isCharging,
        batteryHealth: updatedDevice.batteryHealth,
        chargingMethod: updatedDevice.chargingMethod,
        mobileDataEnabled: updatedDevice.mobileDataEnabled,
        networkConnected: updatedDevice.networkConnected,
        screenOn: updatedDevice.screenOn,
        volumeLevel: updatedDevice.volumeLevel,
        bluetoothEnabled: updatedDevice.bluetoothEnabled,
        installedAppsCount: updatedDevice.installedAppsCount,
        bootTime: updatedDevice.bootTime ? updatedDevice.bootTime.toString() : null,
        lastSeen: updatedDevice.lastSeen,
        status: updatedDevice.status,
      },
    });

    logger.debug({ deviceId }, 'Device status updated');
  } catch (error) {
    logger.error({ error, topic, data }, 'Error handling device status');
  }
}

/**
 * Handle device location update
 */
async function handleDeviceLocation(topic, data) {
  try {
    const match = topic.match(LOCATION_TOPIC_PATTERN);
    if (!match) return;

    const deviceId = match[1];
    logger.debug({ deviceId, data }, 'Received device location');

    // Use service to update location and save history
    const updatedDevice = await deviceService.updateDeviceLocation(deviceId, {
      latitude: data.latitude,
      longitude: data.longitude,
      accuracy: data.accuracy,
      speed: data.speed,
      heading: data.heading,
    });

    if (!updatedDevice) {
      return; // Device not found, already logged in service
    }

    // Broadcast to dashboard
    broadcastToDashboard({
      type: 'device_location',
      deviceId: updatedDevice.id,
      deviceCode: deviceId,
      data: {
        latitude: updatedDevice.latitude,
        longitude: updatedDevice.longitude,
        lastSeen: updatedDevice.lastSeen,
      },
    });

    logger.debug({ deviceId }, 'Device location updated');
  } catch (error) {
    logger.error({ error, topic, data }, 'Error handling device location');
  }
}

/**
 * Handle device metrics update
 */
async function handleDeviceMetrics(topic, data) {
  try {
    const match = topic.match(METRICS_TOPIC_PATTERN);
    if (!match) return;

    const deviceId = match[1];
    logger.debug({ deviceId, data }, 'Received device metrics');

    // Find device
    const device = await prisma.device.findUnique({
      where: { deviceCode: deviceId },
    });

    if (!device) {
      logger.warn({ deviceId }, 'Device not found for metrics');
      return;
    }

    // Create metrics record
    const metrics = await prisma.deviceMetrics.create({
      data: {
        deviceId: device.id,
        cpu: data.cpu || 0,
        memoryTotal: BigInt(data.memory?.total || 0),
        memoryUsed: BigInt(data.memory?.used || 0),
        memoryAvailable: BigInt(data.memory?.available || 0),
        storageTotal: BigInt(data.storage?.total || 0),
        storageUsed: BigInt(data.storage?.used || 0),
        storageAvailable: BigInt(data.storage?.available || 0),
        networkType: data.networkType || null,
        foregroundApp: data.foregroundApp || null,
      },
    });

    // Broadcast to dashboard
    broadcastToDashboard({
      type: 'device_metrics',
      deviceId: device.id,
      deviceCode: deviceId,
      data: {
        cpu: metrics.cpu,
        memory: {
          total: metrics.memoryTotal.toString(),
          used: metrics.memoryUsed.toString(),
          available: metrics.memoryAvailable.toString(),
        },
        storage: {
          total: metrics.storageTotal.toString(),
          used: metrics.storageUsed.toString(),
          available: metrics.storageAvailable.toString(),
        },
        networkType: metrics.networkType,
        foregroundApp: metrics.foregroundApp,
      },
    });

    logger.debug({ deviceId }, 'Device metrics saved');
  } catch (error) {
    logger.error({ error, topic, data }, 'Error handling device metrics');
  }
}

/**
 * Handle device event
 */
async function handleDeviceEvent(topic, data) {
  try {
    const match = topic.match(EVENT_TOPIC_PATTERN);
    if (!match) return;

    const deviceId = match[1];
    logger.debug({ deviceId, data }, 'Received device event');

    // Find device
    const device = await prisma.device.findUnique({
      where: { deviceCode: deviceId },
    });

    if (!device) {
      logger.warn({ deviceId }, 'Device not found for event');
      return;
    }

    const eventType = data.eventType || 'UNKNOWN';
    
    // กรอง Event ที่ไม่สำคัญ
    if (!shouldLogEvent(eventType)) {
      logger.debug({ deviceId, eventType }, 'Event filtered out (not important)');
      return;
    }
    
    // สำหรับ BOOT event - เก็บแค่ครั้งแรกของวัน (กรอง Heartbeat)
    if (eventType === 'BOOT') {
      const shouldLog = await shouldLogBootEvent(device.id, new Date(), data);
      if (!shouldLog) {
        logger.debug({ deviceId, eventType, message: data.message }, 'BOOT event filtered (Heartbeat or already logged today)');
        return;
      }
    }
    
    // สร้าง action log สำหรับ event ที่สำคัญ
    await prisma.deviceActionLog.create({
      data: {
        deviceId: device.id,
        action: eventType,
        payload: data,
      },
    });
    
    logger.debug({ deviceId, eventType }, 'Important device event logged');

    // Broadcast to dashboard
    broadcastToDashboard({
      type: 'device_event',
      deviceId: device.id,
      deviceCode: deviceId,
      data: {
        eventType: data.eventType,
        message: data.message,
        timestamp: data.timestamp,
      },
    });

    logger.debug({ deviceId, eventType: data.eventType }, 'Device event logged');
  } catch (error) {
    logger.error({ error, topic, data }, 'Error handling device event');
  }
}

/**
 * Setup MQTT subscriptions
 */
export function setupMQTTHandlers() {
  // Subscribe to all device topics
  mqttClient.subscribe('tablet/+/status', handleDeviceStatus);
  mqttClient.subscribe('tablet/+/location', handleDeviceLocation);
  mqttClient.subscribe('tablet/+/metrics', handleDeviceMetrics);
  mqttClient.subscribe('tablet/+/event', handleDeviceEvent);

  logger.info('MQTT handlers setup completed');
}

/**
 * Publish command to device
 */
export function publishCommand(deviceId, command) {
  const topic = `tablet/${deviceId}/command`;
  return mqttClient.publish(topic, command, { qos: 1 });
}

