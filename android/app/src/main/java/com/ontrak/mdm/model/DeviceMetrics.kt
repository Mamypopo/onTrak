package com.ontrak.mdm.model

import com.google.gson.annotations.SerializedName

data class DeviceMetrics(
    @SerializedName("deviceId")
    val deviceId: String,
    
    @SerializedName("cpu")
    val cpu: Double,
    
    @SerializedName("memory")
    val memory: DeviceMemory,
    
    @SerializedName("storage")
    val storage: DeviceStorage,
    
    @SerializedName("networkType")
    val networkType: String,
    
    @SerializedName("foregroundApp")
    val foregroundApp: String?,
    
    @SerializedName("timestamp")
    val timestamp: Long = System.currentTimeMillis()
)

data class DeviceMemory(
    @SerializedName("total")
    val total: Long,
    
    @SerializedName("used")
    val used: Long,
    
    @SerializedName("available")
    val available: Long
)

data class DeviceStorage(
    @SerializedName("total")
    val total: Long,
    
    @SerializedName("used")
    val used: Long,
    
    @SerializedName("available")
    val available: Long
)

