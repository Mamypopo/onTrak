package com.ontrak.mdm.model

import com.google.gson.annotations.SerializedName

data class DeviceLocation(
    @SerializedName("deviceId")
    val deviceId: String,
    
    @SerializedName("latitude")
    val latitude: Double,
    
    @SerializedName("longitude")
    val longitude: Double,
    
    @SerializedName("accuracy")
    val accuracy: Float,
    
    @SerializedName("timestamp")
    val timestamp: Long = System.currentTimeMillis()
)

