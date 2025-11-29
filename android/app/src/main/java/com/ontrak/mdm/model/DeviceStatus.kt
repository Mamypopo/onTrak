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
    
    @SerializedName("timestamp")
    val timestamp: Long = System.currentTimeMillis()
)

