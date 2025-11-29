package com.ontrak.mdm.model

import com.google.gson.annotations.SerializedName

data class DeviceEvent(
    @SerializedName("deviceId")
    val deviceId: String,
    
    @SerializedName("eventType")
    val eventType: EventType,
    
    @SerializedName("message")
    val message: String,
    
    @SerializedName("timestamp")
    val timestamp: Long = System.currentTimeMillis()
)

enum class EventType {
    @SerializedName("BOOT")
    BOOT,
    
    @SerializedName("SHUTDOWN")
    SHUTDOWN,
    
    @SerializedName("LOCK")
    LOCK,
    
    @SerializedName("UNLOCK")
    UNLOCK,
    
    @SerializedName("APP_OPENED")
    APP_OPENED,
    
    @SerializedName("APP_CLOSED")
    APP_CLOSED,
    
    @SerializedName("KIOSK_ENABLED")
    KIOSK_ENABLED,
    
    @SerializedName("KIOSK_DISABLED")
    KIOSK_DISABLED,
    
    @SerializedName("ERROR")
    ERROR
}

