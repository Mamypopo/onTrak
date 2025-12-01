package com.ontrak.mdm.model

import com.google.gson.annotations.SerializedName

data class DeviceStatus(
    @SerializedName("deviceId")
    val deviceId: String,
    
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
    
    // Network status
    @SerializedName("mobileDataEnabled")
    val mobileDataEnabled: Boolean = false,
    
    @SerializedName("networkConnected")
    val networkConnected: Boolean = false,
    
    // Screen status
    @SerializedName("screenOn")
    val screenOn: Boolean = false,
    
    // Audio status
    @SerializedName("volumeLevel")
    val volumeLevel: Int = 0,
    
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

