package com.ontrak.mdm.model

import com.google.gson.annotations.SerializedName

data class DeviceStatus(
    @SerializedName("deviceId")
    val deviceId: String,

    @SerializedName("serialNumber")
    val serialNumber: String,

    @SerializedName("osVersion")
    val osVersion: String,

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

    @SerializedName("isScreenLockEnabled")
    val isScreenLockEnabled: Boolean = false,

    @SerializedName("isDeveloperModeEnabled")
    val isDeveloperModeEnabled: Boolean = false,

    @SerializedName("isVpnActive")
    val isVpnActive: Boolean = false,

    @SerializedName("isGpsEnabled")
    val isGpsEnabled: Boolean = false,

    @SerializedName("installedApps")
    val installedApps: List<String> = emptyList(),

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

    @SerializedName("timestamp")
    val timestamp: Long = System.currentTimeMillis()
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
