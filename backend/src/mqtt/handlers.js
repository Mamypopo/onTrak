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

    const updateData = {
      battery: data.battery || 0,
      wifiStatus: data.wifiStatus || false,
      wifiSignalStrength: data.wifiSignalStrength,
      ssid: data.ssid || null,
      isCharging: data.isCharging || false,
      batteryHealth: data.batteryHealth || null,
      batteryTemperature: data.batteryTemperature,
      chargingMethod: data.chargingMethod || null,
      thermalStatus: data.thermalStatus || null,
      batteryCycleCount: data.batteryCycleCount,
      mobileDataEnabled: data.mobileDataEnabled || false,
      cellularSignalStrength: data.cellularSignalStrength,
      networkConnected: data.networkConnected || false,
      airplaneModeEnabled: data.isAirplaneModeEnabled || false,
      powerSaveModeEnabled: data.isPowerSaveModeEnabled || false,
      screenBrightness: data.screenBrightness,
      autoScreenBrightnessEnabled: data.isAutoScreenBrightnessEnabled || false,
      screenWidth: data.screenWidth,
      screenHeight: data.screenHeight,
      screenDpi: data.screenDpi,
      ringerMode: data.ringerMode || null,
      storageTotal: data.totalStorage ? BigInt(data.totalStorage) : null,
      storageFree: data.freeStorage ? BigInt(data.freeStorage) : null,
      storageExternalTotal: data.totalExternalStorage ? BigInt(data.totalExternalStorage) : null,
      storageExternalFree: data.freeExternalStorage ? BigInt(data.freeExternalStorage) : null,
      ramTotal: data.totalRam ? BigInt(data.totalRam) : null,
      ramAvailable: data.availableRam ? BigInt(data.availableRam) : null,
      networkType: data.networkType || null,
      dndMode: data.dndMode || null,
      volumeRing: data.volumeLevels?.ring,
      volumeMedia: data.volumeLevels?.media,
      volumeNotification: data.volumeLevels?.notification,
      volumeAlarm: data.volumeLevels?.alarm,
      screenOn: data.screenOn || false,
      bluetoothEnabled: data.bluetoothEnabled || false,
      cameraFeatures: data.cameraFeatures || [],
      connectedBluetoothDevices: data.connectedBluetoothDevices || [],
      nfcEnabled: data.nfcEnabled || false,
      locationEnabled: data.isGpsEnabled || false,
      screenLockEnabled: data.isScreenLockEnabled || false,
      developerModeEnabled: data.isDeveloperModeEnabled || false,
      adbEnabled: data.isAdbEnabled || false,
      vpnActive: data.isVpnActive || false,
      installedAppDetails: data.installedAppDetails || [],
      installedAppsCount: data.installedAppDetails?.length ?? data.installedAppsCount ?? 0,
      bootTime: data.bootTime ? BigInt(data.bootTime) : null,
      foregroundApp: data.foregroundApp || null,
      lastSeen: new Date(),
      status: 'ONLINE',
    };

    if (data.serialNumber) updateData.serialNumber = data.serialNumber;
    if (data.osVersion) updateData.osVersion = data.osVersion;
    if (data.buildNumber) {
      const buildNumberParts = data.buildNumber.split(' ');
      if (buildNumberParts.length > 2) {
        // From "sdk_gphone64_x86_64-userdebug 16 BE2A.250530.026.F3 ..."
        // we only want "BE2A.250530.026.F3"
        updateData.buildNumber = buildNumberParts[2];
      } else {
        updateData.buildNumber = data.buildNumber;
      }
    }
    if (data.deviceModel) updateData.model = data.deviceModel;
    if (data.brand) updateData.brandName = data.brand;
    if (data.isRooted !== undefined) {
      updateData.rootState = data.isRooted ? 'ROOTED' : 'NOT_ROOTED';
    }
    if (data.phoneNumber) updateData.phoneNumber = data.phoneNumber;
    if (data.simSerialNumber) updateData.simSerialNumber = data.simSerialNumber;
    if (data.securityPatch) updateData.securityPatch = data.securityPatch;
    if (data.encryptionStatus) updateData.encryptionStatus = data.encryptionStatus;
    if (data.simOperator) updateData.simOperator = data.simOperator;
    if (data.ipAddress) updateData.ipAddress = data.ipAddress;
    if (data.macAddress) updateData.macAddress = data.macAddress;
    if (data.timezone) updateData.timezone = data.timezone;
    if (data.locale) updateData.locale = data.locale;
    if (data.cpuAbi) updateData.cpuAbi = data.cpuAbi;
    if (data.isSafeBoot !== undefined) updateData.isSafeBoot = data.isSafeBoot;
    if (data.wifiStandard) updateData.wifiStandard = data.wifiStandard;
    if (data.cellularGeneration) updateData.cellularGeneration = data.cellularGeneration;
    if (data.pendingSystemUpdateInfo) updateData.pendingSystemUpdateInfo = data.pendingSystemUpdateInfo;
    if (data.lastRebootReason) updateData.lastRebootReason = data.lastRebootReason;
    if (data.cpuUsage !== undefined) updateData.cpuUsage = data.cpuUsage;
    if (data.cpuTemperature !== undefined) updateData.cpuTemperature = data.cpuTemperature;
    if (data.rootState && !data.isRooted) updateData.rootState = data.rootState;
    if (data.brandName && !data.brand) updateData.brandName = data.brandName;
    const updatedDevice = await prisma.device.update({
      where: { deviceCode: deviceId },
      data: updateData,
    });

    // Broadcast to dashboard
    broadcastToDashboard({
      type: 'device_status',
      deviceId: updatedDevice.id,
      deviceCode: deviceId,
      data: {
        serialNumber: updatedDevice.serialNumber,
        osVersion: updatedDevice.osVersion,
        buildNumber: updatedDevice.buildNumber,
        model: updatedDevice.model,
        battery: updatedDevice.battery,
        wifiStatus: updatedDevice.wifiStatus,
        wifiSignalStrength: updatedDevice.wifiSignalStrength,
        ssid: updatedDevice.ssid,
        isCharging: updatedDevice.isCharging,
        batteryHealth: updatedDevice.batteryHealth,
        batteryTemperature: updatedDevice.batteryTemperature,
        chargingMethod: updatedDevice.chargingMethod,
        thermalStatus: updatedDevice.thermalStatus,
        batteryCycleCount: updatedDevice.batteryCycleCount,
        mobileDataEnabled: updatedDevice.mobileDataEnabled,
        cellularSignalStrength: updatedDevice.cellularSignalStrength,
        networkConnected: updatedDevice.networkConnected,
        airplaneModeEnabled: updatedDevice.airplaneModeEnabled,
        powerSaveModeEnabled: updatedDevice.powerSaveModeEnabled,
        screenBrightness: updatedDevice.screenBrightness,
        autoScreenBrightnessEnabled: updatedDevice.autoScreenBrightnessEnabled,
        screenWidth: updatedDevice.screenWidth,
        screenHeight: updatedDevice.screenHeight,
        screenDpi: updatedDevice.screenDpi,
        ringerMode: updatedDevice.ringerMode,
        storageTotal: updatedDevice.storageTotal ? updatedDevice.storageTotal.toString() : null,
        storageFree: updatedDevice.storageFree ? updatedDevice.storageFree.toString() : null,
        storageExternalTotal: updatedDevice.storageExternalTotal ? updatedDevice.storageExternalTotal.toString() : null,
        storageExternalFree: updatedDevice.storageExternalFree ? updatedDevice.storageExternalFree.toString() : null,
        ramTotal: updatedDevice.ramTotal ? updatedDevice.ramTotal.toString() : null,
        ramAvailable: updatedDevice.ramAvailable ? updatedDevice.ramAvailable.toString() : null,
        networkType: updatedDevice.networkType,
        dndMode: updatedDevice.dndMode,
        screenOn: updatedDevice.screenOn,
        volumeLevels: {
          ring: updatedDevice.volumeRing,
          media: updatedDevice.volumeMedia,
          notification: updatedDevice.volumeNotification,
          alarm: updatedDevice.volumeAlarm,
        },
        bluetoothEnabled: updatedDevice.bluetoothEnabled,
        cameraFeatures: updatedDevice.cameraFeatures,
        connectedBluetoothDevices: updatedDevice.connectedBluetoothDevices,
        nfcEnabled: updatedDevice.nfcEnabled,
        locationEnabled: updatedDevice.locationEnabled,
        screenLockEnabled: updatedDevice.screenLockEnabled,
        developerModeEnabled: updatedDevice.developerModeEnabled,
        adbEnabled: updatedDevice.adbEnabled,
        vpnActive: updatedDevice.vpnActive,
        installedAppsCount: updatedDevice.installedAppsCount,
        installedAppDetails: updatedDevice.installedAppDetails,
        bootTime: updatedDevice.bootTime ? updatedDevice.bootTime.toString() : null,
        lastSeen: updatedDevice.lastSeen,
        status: updatedDevice.status,
        ipAddress: updatedDevice.ipAddress,
        macAddress: updatedDevice.macAddress,
        timezone: updatedDevice.timezone,
        locale: updatedDevice.locale,
        cpuUsage: updatedDevice.cpuUsage,
        cpuTemperature: updatedDevice.cpuTemperature,
        cpuAbi: updatedDevice.cpuAbi,
        phoneNumber: updatedDevice.phoneNumber,
        isSafeBoot: updatedDevice.isSafeBoot,
        wifiStandard: updatedDevice.wifiStandard,
        cellularGeneration: updatedDevice.cellularGeneration,
        pendingSystemUpdateInfo: updatedDevice.pendingSystemUpdateInfo,
        lastRebootReason: updatedDevice.lastRebootReason,
        simSerialNumber: updatedDevice.simSerialNumber,
        foregroundApp: updatedDevice.foregroundApp,
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
