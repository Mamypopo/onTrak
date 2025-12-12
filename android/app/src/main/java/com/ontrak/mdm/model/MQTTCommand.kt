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
    
    @SerializedName("WIPE_DEVICE")
    WIPE_DEVICE,
    
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
    SHUTDOWN_DEVICE,
    
    @SerializedName("DISABLE_CAMERA")
    DISABLE_CAMERA,
    
    @SerializedName("ENABLE_CAMERA")
    ENABLE_CAMERA,
    
    @SerializedName("SEND_DATA_NOW")
    SEND_DATA_NOW,

    // App Management (Managed Google Play)
    @SerializedName("SILENT_INSTALL_APP")
    SILENT_INSTALL_APP,
    @SerializedName("SILENT_UNINSTALL_APP")
    SILENT_UNINSTALL_APP,
    @SerializedName("SET_MANAGED_CONFIGURATIONS")
    SET_MANAGED_CONFIGURATIONS,
    @SerializedName("SET_INSTALL_APPS_ALLOWED")
    SET_INSTALL_APPS_ALLOWED,
    @SerializedName("SET_APP_UNINSTALL_ALLOWED")
    SET_APP_UNINSTALL_ALLOWED,

    // Security Policies
    @SerializedName("SET_ENCRYPTION_ENABLED")
    SET_ENCRYPTION_ENABLED,

    @SerializedName("SET_FACTORY_RESET_ALLOWED")
    SET_FACTORY_RESET_ALLOWED,

    @SerializedName("SET_SAFE_MODE_ALLOWED")
    SET_SAFE_MODE_ALLOWED,

    @SerializedName("SET_DEBUGGING_ALLOWED")
    SET_DEBUGGING_ALLOWED,

    @SerializedName("SET_SCREEN_CAPTURE_ALLOWED")
    SET_SCREEN_CAPTURE_ALLOWED,

    @SerializedName("SET_CONFIG_CREDENTIALS_ALLOWED")
    SET_CONFIG_CREDENTIALS_ALLOWED,

    @SerializedName("SET_SMART_LOCK_ALLOWED")
    SET_SMART_LOCK_ALLOWED,

    @SerializedName("SET_LOCATION_SERVICES_ALLOWED")
    SET_LOCATION_SERVICES_ALLOWED,

    @SerializedName("SET_FINGERPRINT_UNLOCK_ALLOWED")
    SET_FINGERPRINT_UNLOCK_ALLOWED,

    @SerializedName("SET_CHANGE_ACCOUNT_PICTURE_ALLOWED")
    SET_CHANGE_ACCOUNT_PICTURE_ALLOWED,

    @SerializedName("SET_HIDE_SENSITIVE_INFO_ON_LOCK_SCREEN")
    SET_HIDE_SENSITIVE_INFO_ON_LOCK_SCREEN,

    @SerializedName("SET_SYSTEM_UPDATE_POLICY")
    SET_SYSTEM_UPDATE_POLICY,

    // Accounts
    @SerializedName("SET_MANAGING_ACCOUNTS_ALLOWED")
    SET_MANAGING_ACCOUNTS_ALLOWED,

    // Network and Communication
    @SerializedName("SET_SMS_ALLOWED")
    SET_SMS_ALLOWED,
    @SerializedName("SET_DATA_ROAMING_ALLOWED")
    SET_DATA_ROAMING_ALLOWED,
    @SerializedName("SET_VPN_CONFIG_ALLOWED")
    SET_VPN_CONFIG_ALLOWED,
    @SerializedName("SET_OUTGOING_CALLS_ALLOWED")
    SET_OUTGOING_CALLS_ALLOWED,
    @SerializedName("SET_NETWORK_RESET_ALLOWED")
    SET_NETWORK_RESET_ALLOWED,
    @SerializedName("SET_WIFI_CONFIG_ALLOWED")
    SET_WIFI_CONFIG_ALLOWED,
    @SerializedName("SET_CELL_BROADCASTS_CONFIG_ALLOWED")
    SET_CELL_BROADCASTS_CONFIG_ALLOWED,
    @SerializedName("SET_TETHERING_CONFIG_ALLOWED")
    SET_TETHERING_CONFIG_ALLOWED,
    @SerializedName("SET_BLUETOOTH_POLICY_ALLOWED")
    SET_BLUETOOTH_POLICY_ALLOWED,

    // Hardware
    @SerializedName("SET_MICROPHONE_MUTED")
    SET_MICROPHONE_MUTED,
    @SerializedName("SET_EXTERNAL_MEDIA_ALLOWED")
    SET_EXTERNAL_MEDIA_ALLOWED,
    @SerializedName("SET_USB_FILE_TRANSFER_ALLOWED")
    SET_USB_FILE_TRANSFER_ALLOWED,

    // Applications (General)
    @SerializedName("SET_WALLPAPER_CHANGE_ALLOWED")
    SET_WALLPAPER_CHANGE_ALLOWED,
    @SerializedName("SET_MANAGING_APPS_ALLOWED")
    SET_MANAGING_APPS_ALLOWED,
    @SerializedName("SET_GOOGLE_SECURITY_SCANS_ALLOWED")
    SET_GOOGLE_SECURITY_SCANS_ALLOWED,
    @SerializedName("SET_DATE_TIME_CHANGE_ALLOWED")
    SET_DATE_TIME_CHANGE_ALLOWED,
    @SerializedName("SET_ORGANIZATION_MESSAGE")
    SET_ORGANIZATION_MESSAGE,

    // Screen & Audio
    @SerializedName("SET_SCREEN_BRIGHTNESS")
    SET_SCREEN_BRIGHTNESS,

    @SerializedName("SET_SCREEN_BRIGHTNESS_MODE")
    SET_SCREEN_BRIGHTNESS_MODE,

    @SerializedName("SET_RINGER_MODE")
    SET_RINGER_MODE,

    @SerializedName("SET_VOLUME_LEVEL")
    SET_VOLUME_LEVEL,

    @SerializedName("SET_DND_MODE")
    SET_DND_MODE
}
