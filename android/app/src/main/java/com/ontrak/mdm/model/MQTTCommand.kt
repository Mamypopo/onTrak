package com.ontrak.mdm.model

import com.google.gson.annotations.SerializedName

data class MQTTCommand(
    @SerializedName("action")
    val action: CommandAction,
    
    @SerializedName("params")
    val params: Map<String, Any>? = null
)

enum class CommandAction {
    @SerializedName("LOCK_DEVICE")
    LOCK_DEVICE,
    
    @SerializedName("UNLOCK_DEVICE")
    UNLOCK_DEVICE,
    
    @SerializedName("RESTART_DEVICE")
    RESTART_DEVICE,
    
    @SerializedName("OPEN_APP")
    OPEN_APP,
    
    @SerializedName("SHOW_MESSAGE")
    SHOW_MESSAGE,
    
    @SerializedName("PLAY_SOUND")
    PLAY_SOUND,
    
    @SerializedName("ENABLE_KIOSK")
    ENABLE_KIOSK,
    
    @SerializedName("DISABLE_KIOSK")
    DISABLE_KIOSK,
    
    @SerializedName("OPEN_CAMERA")
    OPEN_CAMERA,
    
    @SerializedName("TAKE_PHOTO")
    TAKE_PHOTO,
    
    @SerializedName("BLUETOOTH_ON")
    BLUETOOTH_ON,
    
    @SerializedName("BLUETOOTH_OFF")
    BLUETOOTH_OFF,
    
    @SerializedName("SHUTDOWN_DEVICE")
    SHUTDOWN_DEVICE
}

