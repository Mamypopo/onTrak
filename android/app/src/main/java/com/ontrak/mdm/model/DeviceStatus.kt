package com.ontrak.mdm.model

import com.google.gson.annotations.SerializedName

data class DeviceStatus(
    @SerializedName("deviceId")
    val deviceId: String,

    @SerializedName("serialNumber")
    val serialNumber: String,

    @SerializedName("osVersion")
    val osVersion: String,

    @SerializedName("buildNumber")
    val buildNumber: String?,

    @SerializedName("deviceModel")
    val deviceModel: String,

    @SerializedName("brand")
    val brand: String,

    @SerializedName("isRooted")
    val isRooted: Boolean,

    @SerializedName("securityPatch")
    val securityPatch: String?,

    @SerializedName("encryptionStatus")
    val encryptionStatus: String,

    @SerializedName("simOperator")
    val simOperator: String?,

    @SerializedName("simSerialNumber")
    val simSerialNumber: String?,

    @SerializedName("phoneNumber")
    val phoneNumber: String?,

    @SerializedName("ipAddress")
    val ipAddress: String?,

    @SerializedName("macAddress")
    val macAddress: String?,

    @SerializedName("timezone")
    val timezone: String?,

    @SerializedName("locale")
    val locale: String?,

    @SerializedName("nfcEnabled")
    val nfcEnabled: Boolean = false,

    @SerializedName("isAdbEnabled")
    val isAdbEnabled: Boolean = false,

    @SerializedName("isScreenLockEnabled")
    val isScreenLockEnabled: Boolean = false,

    @SerializedName("isDeveloperModeEnabled")
    val isDeveloperModeEnabled: Boolean = false,

    @SerializedName("isVpnActive")
    val isVpnActive: Boolean = false,

    @SerializedName("isGpsEnabled")
    val isGpsEnabled: Boolean = false,

    @SerializedName("installedAppDetails")
    val installedAppDetails: List<AppDetail> = emptyList(),

    @SerializedName("foregroundApp")
    val foregroundApp: String? = null,

    @SerializedName("ssid")
    val ssid: String?,

    @SerializedName("cellularSignalStrength")
    val cellularSignalStrength: Int?,

    @SerializedName("wifiSignalStrength")
    val wifiSignalStrength: Int?,

    @SerializedName("isAirplaneModeEnabled")
    val isAirplaneModeEnabled: Boolean = false,

    @SerializedName("isPowerSaveModeEnabled")
    val isPowerSaveModeEnabled: Boolean = false,

    @SerializedName("screenBrightness")
    val screenBrightness: Int?,

    @SerializedName("isAutoScreenBrightnessEnabled")
    val isAutoScreenBrightnessEnabled: Boolean = false,

    @SerializedName("ringerMode")
    val ringerMode: String?,

    @SerializedName("dndMode")
    val dndMode: String?,

    @SerializedName("battery")
    val battery: Int,

    @SerializedName("wifiStatus")
    val wifiStatus: Boolean,

    @SerializedName("uptime")
    val uptime: Long,

    // Battery status
    @SerializedName("isCharging")
    val isCharging: Boolean = false,

    @SerializedName("batteryHealth")
    val batteryHealth: String? = null,

    @SerializedName("chargingMethod")
    val chargingMethod: String? = null, // USB, AC, WIRELESS, NONE

    @SerializedName("batteryTemperature")
    val batteryTemperature: Int?,

    // Display Info
    @SerializedName("screenWidth")
    val screenWidth: Int? = null,

    @SerializedName("screenHeight")
    val screenHeight: Int? = null,

    @SerializedName("screenDpi")
    val screenDpi: Int? = null,

    @SerializedName("batteryCycleCount")
    val batteryCycleCount: Int?,

    // Network status
    @SerializedName("mobileDataEnabled")
    val mobileDataEnabled: Boolean = false,

    @SerializedName("networkConnected")
    val networkConnected: Boolean = false,

    // Screen status
    @SerializedName("screenOn")
    val screenOn: Boolean = false,

    // Audio status
    @SerializedName("volumeLevels")
    val volumeLevels: VolumeLevels,

    // Bluetooth status
    @SerializedName("bluetoothEnabled")
    val bluetoothEnabled: Boolean = false,

    // Installed apps count
    @SerializedName("installedAppsCount")
    val installedAppsCount: Int = 0,

    // Boot time (timestamp when device booted)
    @SerializedName("bootTime")
    val bootTime: Long = 0,

    // Storage Info
    @SerializedName("totalStorage")
    val totalStorage: Long? = null,

    @SerializedName("freeStorage")
    val freeStorage: Long? = null,

    @SerializedName("totalExternalStorage")
    val totalExternalStorage: Long? = null,

    @SerializedName("freeExternalStorage")
    val freeExternalStorage: Long? = null,

    // Memory Info
    @SerializedName("totalRam")
    val totalRam: Long? = null,

    @SerializedName("availableRam")
    val availableRam: Long? = null,



    // Additional Network Info
    @SerializedName("networkType")
    val networkType: String? = null,

    // Camera and Bluetooth
    @SerializedName("cameraFeatures")
    val cameraFeatures: List<String> = emptyList(),

    @SerializedName("connectedBluetoothDevices")
    val connectedBluetoothDevices: List<String> = emptyList(),

    // Thermal Status
    @SerializedName("thermalStatus")
    val thermalStatus: String? = null,

    @SerializedName("cpuUsage")
    val cpuUsage: Double?,

    @SerializedName("cpuTemperature")
    val cpuTemperature: Float?,

    @SerializedName("cpuAbi")
    val cpuAbi: String?,

    @SerializedName("isSafeBoot")
    val isSafeBoot: Boolean = false,

    @SerializedName("wifiStandard")
    val wifiStandard: String? = null,

    @SerializedName("cellularGeneration")
    val cellularGeneration: String? = null,

    @SerializedName("pendingSystemUpdateInfo")
    val pendingSystemUpdateInfo: Map<String, Any>? = null,

    @SerializedName("lastRebootReason")
    val lastRebootReason: String? = null,

    @SerializedName("timestamp")
    val timestamp: Long = System.currentTimeMillis()
)

data class AppDetail(
    @SerializedName("packageName")
    val packageName: String,
    @SerializedName("label")
    val label: String,
    @SerializedName("versionName")
    val versionName: String?,
    @SerializedName("versionCode")
    val versionCode: Long,
    @SerializedName("firstInstallTime")
    val firstInstallTime: Long,
    @SerializedName("lastUpdateTime")
    val lastUpdateTime: Long
)

data class VolumeLevels(
    @SerializedName("ring")
    val ring: Int,
    @SerializedName("media")
    val media: Int,
    @SerializedName("notification")
    val notification: Int,
    @SerializedName("alarm")
    val alarm: Int
)
