package com.ontrak.mdm.mqtt

import android.annotation.SuppressLint
import android.content.Context
import android.os.Build
import android.util.Log
import com.google.gson.Gson
import com.ontrak.mdm.command.CommandHandler
import com.ontrak.mdm.config.MQTTConfig
import com.ontrak.mdm.model.*
import com.ontrak.mdm.util.DeviceInfo
import org.eclipse.paho.android.service.MqttAndroidClient
import org.eclipse.paho.client.mqttv3.*

class MQTTManager private constructor(private val context: Context) {

    private var mqttClient: MqttAndroidClient? = null
    private val gson = Gson()
    private val deviceId = DeviceInfo.getDeviceId(context)
    private var isConnected = false

    private val connectionCallback: IMqttActionListener = object : IMqttActionListener {
        override fun onSuccess(asyncActionToken: IMqttToken?) {
            Log.d(TAG, "MQTT Connected successfully")
            isConnected = true
            subscribeToCommandTopic()
        }

        override fun onFailure(asyncActionToken: IMqttToken?, exception: Throwable?) {
            Log.e(TAG, "MQTT Connection failed: ${exception?.message}")
            isConnected = false
            // Auto-reconnect will be handled by reconnect mechanism
        }
    }

    private val messageCallback = object : MqttCallback {
        override fun connectionLost(cause: Throwable?) {
            Log.w(TAG, "MQTT Connection lost: ${cause?.message}")
            isConnected = false
            reconnect()
        }

        override fun messageArrived(topic: String?, message: MqttMessage?) {
            try {
                val payload = String(message?.payload ?: ByteArray(0))
                Log.d(TAG, "Message arrived on topic: $topic, payload: $payload")

                if (topic == MQTTConfig.getCommandTopic(deviceId)) {
                    handleCommand(payload)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error processing MQTT message", e)
            }
        }

        override fun deliveryComplete(token: IMqttDeliveryToken?) {
            Log.d(TAG, "Message delivery complete")
        }
    }

    @SuppressLint("MissingPermission")
    fun connect() {
        try {
            Log.d(TAG, "Attempting to connect to MQTT broker: ${MQTTConfig.BROKER_URL}")
            val clientId = "${MQTTConfig.CLIENT_ID_PREFIX}$deviceId"
            Log.d(TAG, "Client ID: $clientId")

            mqttClient = MqttAndroidClient(context, MQTTConfig.BROKER_URL, clientId)
            mqttClient?.setCallback(messageCallback)

            val options = MqttConnectOptions().apply {
                isCleanSession = false
                isAutomaticReconnect = true
                connectionTimeout = 30
                keepAliveInterval = 60

                if (MQTTConfig.USERNAME.isNotEmpty()) {
                    userName = MQTTConfig.USERNAME
                    password = MQTTConfig.PASSWORD.toCharArray()
                }

                // Last Will and Testament
                val willTopic = MQTTConfig.getStatusTopic(deviceId)
                val serialNumber = try {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        Build.getSerial()
                    } else {
                        @Suppress("DEPRECATION")
                        Build.SERIAL
                    }
                } catch (e: SecurityException) {
                    Log.w(TAG, "Failed to get serial number for LWT. App is likely not a device owner.", e)
                    "unknown"
                }
                val osVersion = Build.VERSION.RELEASE
                val buildNumber = Build.DISPLAY
                val deviceModel = Build.MODEL
                val brand = Build.BRAND
                val isRooted = DeviceInfo.isDeviceRooted()
                val securityPatch = DeviceInfo.getSecurityPatch()
                val encryptionStatus = DeviceInfo.getEncryptionStatus(context)
                val simOperator = DeviceInfo.getSimOperator(context)
                val ipAddress = DeviceInfo.getIpAddress(context)
                val macAddress = DeviceInfo.getMacAddress(context)
                val timezone = DeviceInfo.getTimezone()
                val locale = DeviceInfo.getLocale()
                val nfcEnabled = DeviceInfo.isNfcEnabled(context)
                val isAdbEnabled = DeviceInfo.isAdbEnabled(context)
                val isScreenLockEnabled = DeviceInfo.isScreenLockEnabled(context)
                val isDeveloperModeEnabled = DeviceInfo.isDeveloperModeEnabled(context)
                val isVpnActive = DeviceInfo.isVpnActive(context)
                val isGpsEnabled = DeviceInfo.isGpsEnabled(context)
                val ssid = DeviceInfo.getSsid(context)
                val cellularSignalStrength = DeviceInfo.getCellularSignalStrength(context)
                val wifiSignalStrength = DeviceInfo.getWifiSignalStrength(context)
                val isAirplaneModeEnabled = DeviceInfo.isAirplaneModeEnabled(context)
                val isPowerSaveModeEnabled = DeviceInfo.isPowerSaveModeEnabled(context)
                val screenBrightness = DeviceInfo.getScreenBrightness(context)
                val isAutoScreenBrightnessEnabled = DeviceInfo.isAutoScreenBrightnessEnabled(context)
                val ringerMode = DeviceInfo.getRingerMode(context)
                val batteryTemperature = DeviceInfo.getBatteryTemperature(context)
                val batteryCycleCount = DeviceInfo.getBatteryCycleCount(context)
                val dndMode = DeviceInfo.getDndMode(context)
                val volumeLevels = DeviceInfo.getVolumeLevels(context)
                val screenWidth = DeviceInfo.getScreenWidth(context)
                val screenHeight = DeviceInfo.getScreenHeight(context)
                val screenDpi = DeviceInfo.getScreenDpi(context)
                val thermalStatus = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    DeviceInfo.getThermalStatus(context)
                } else {
                    null
                }
                val cpuUsage = DeviceInfo.getCpuUsage()
                val cpuTemperature = DeviceInfo.getCpuTemperature()
                val simSerialNumber = DeviceInfo.getSimSerialNumber(context)
                val phoneNumber = try {
                    DeviceInfo.getPhoneNumber(context)
                } catch (e: SecurityException) {
                    Log.w(TAG, "Failed to get phone number. App might not be a device owner or lacks permissions.", e)
                    "unknown"
                }

                val willMessage = gson.toJson(DeviceStatus(
                    deviceId = deviceId,
                    serialNumber = serialNumber,
                    osVersion = osVersion,
                    buildNumber = buildNumber,
                    deviceModel = deviceModel,
                    brand = brand,
                    isRooted = isRooted,
                    securityPatch = securityPatch,
                    encryptionStatus = encryptionStatus,
                    simOperator = simOperator,
                    simSerialNumber = simSerialNumber,
                    phoneNumber = phoneNumber,
                    ipAddress = ipAddress,
                    macAddress = macAddress,
                    timezone = timezone,
                    locale = locale,
                    nfcEnabled = nfcEnabled,
                    isAdbEnabled = isAdbEnabled,
                    isScreenLockEnabled = isScreenLockEnabled,
                    isDeveloperModeEnabled = isDeveloperModeEnabled,
                    isVpnActive = isVpnActive,
                    isGpsEnabled = isGpsEnabled,
                    installedAppDetails = emptyList(),
                    ssid = ssid,
                    cellularSignalStrength = cellularSignalStrength,
                    wifiSignalStrength = wifiSignalStrength,
                    isAirplaneModeEnabled = isAirplaneModeEnabled,
                    isPowerSaveModeEnabled = isPowerSaveModeEnabled,
                    screenBrightness = screenBrightness,
                    isAutoScreenBrightnessEnabled = isAutoScreenBrightnessEnabled,
                    ringerMode = ringerMode,
                    dndMode = dndMode,
                    battery = 0,
                    wifiStatus = false,
                    uptime = 0,
                    isCharging = false,
                    batteryHealth = null,
                    chargingMethod = null,
                    batteryTemperature = batteryTemperature,
                    batteryCycleCount = batteryCycleCount,
                    screenWidth = screenWidth,
                    screenHeight = screenHeight,
                    screenDpi = screenDpi,
                    mobileDataEnabled = false,
                    networkConnected = false,
                    screenOn = false,
                    volumeLevels = volumeLevels,
                    bluetoothEnabled = false,
                    installedAppsCount = 0,
                    bootTime = 0,
                    totalStorage = null,
                    freeStorage = null,
                    totalExternalStorage = null,
                    freeExternalStorage = null,
                    totalRam = null,
                    availableRam = null,
                    networkType = null,
                    cameraFeatures = emptyList(),
                    connectedBluetoothDevices = emptyList(),
                    thermalStatus = thermalStatus,
                    cpuUsage = cpuUsage,
                    cpuTemperature = cpuTemperature,
                    cpuAbi = null,
                ))
                setWill(willTopic, willMessage.toByteArray(), 1, false)
            }

            Log.d(TAG, "Calling mqttClient.connect()...")
            mqttClient?.connect(options, null, connectionCallback)
            Log.d(TAG, "mqttClient.connect() called, waiting for callback...")
        } catch (e: Exception) {
            Log.e(TAG, "Error connecting to MQTT", e)
            e.printStackTrace()
        }
    }

    private fun subscribeToCommandTopic() {
        try {
            val topic = MQTTConfig.getCommandTopic(deviceId)
            mqttClient?.subscribe(topic, 1, null, object : IMqttActionListener {
                override fun onSuccess(asyncActionToken: IMqttToken?) {
                    Log.d(TAG, "Subscribed to command topic: $topic")
                }

                override fun onFailure(asyncActionToken: IMqttToken?, exception: Throwable?) {
                    Log.e(TAG, "Failed to subscribe to command topic", exception)
                }
            })
        } catch (e: Exception) {
            Log.e(TAG, "Error subscribing to command topic", e)
        }
    }

    fun publishStatus(status: DeviceStatus) {
        publish(MQTTConfig.getStatusTopic(deviceId), status)
    }

    fun publishLocation(location: DeviceLocation) {
        publish(MQTTConfig.getLocationTopic(deviceId), location)
    }

    fun publishMetrics(metrics: DeviceMetrics) {
        publish(MQTTConfig.getMetricsTopic(deviceId), metrics)
    }

    fun publishEvent(event: DeviceEvent) {
        publish(MQTTConfig.getEventTopic(deviceId), event)
    }

    private fun <T> publish(topic: String, data: T) {
        if (!isConnected) {
            Log.w(TAG, "MQTT not connected, cannot publish to $topic")
            return
        }

        try {
            val json = gson.toJson(data)
            Log.d(TAG, "Publishing to $topic: $json")
            val message = MqttMessage(json.toByteArray())
            message.qos = 1
            message.isRetained = false

            mqttClient?.publish(topic, message, null, object : IMqttActionListener {
                override fun onSuccess(asyncActionToken: IMqttToken?) {
                    Log.d(TAG, "Successfully published to $topic")
                }

                override fun onFailure(asyncActionToken: IMqttToken?, exception: Throwable?) {
                    Log.e(TAG, "Failed to publish to $topic", exception)
                }
            })
        } catch (e: Exception) {
            Log.e(TAG, "Error publishing to $topic", e)
        }
    }

    private fun handleCommand(payload: String) {
        try {
            val command = gson.fromJson(payload, MQTTCommand::class.java)
            Log.d(TAG, "Received command: ${command.action}")

            // Notify command handler
            CommandHandler.handleCommand(context, command)
        } catch (e: Exception) {
            Log.e(TAG, "Error handling command", e)
        }
    }

    private fun reconnect() {
        // Auto-reconnect is handled by MqttConnectOptions.isAutomaticReconnect
        // But we can add additional logic here if needed
        Log.d(TAG, "Attempting to reconnect...")
    }

    fun disconnect() {
        try {
            mqttClient?.disconnect()
            isConnected = false
            Log.d(TAG, "MQTT Disconnected")
        } catch (e: Exception) {
            Log.e(TAG, "Error disconnecting from MQTT", e)
        }
    }

    fun isConnected(): Boolean = isConnected

    companion object {
        private const val TAG = "MQTTManager"

        @Volatile
        private var instance: MQTTManager? = null

        fun getInstance(context: Context): MQTTManager {
            return instance ?: synchronized(this) {
                instance ?: MQTTManager(context.applicationContext).also { instance = it }
            }
        }
    }
}
