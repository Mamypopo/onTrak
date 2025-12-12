package com.ontrak.mdm.command

import android.app.ActivityManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.admin.DevicePolicyManager
import android.app.admin.SystemUpdatePolicy
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.media.AudioManager
import android.media.RingtoneManager
import android.media.ToneGenerator
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.PowerManager
import android.os.UserManager
import android.provider.Settings
import android.bluetooth.BluetoothAdapter
import android.util.Log
import androidx.core.app.NotificationCompat
import com.ontrak.mdm.R
import com.ontrak.mdm.model.CommandAction
import com.ontrak.mdm.model.MQTTCommand
import com.ontrak.mdm.receiver.DeviceOwnerReceiver
import com.ontrak.mdm.service.MDMService
import com.ontrak.mdm.ui.MainActivity
import com.ontrak.mdm.util.KioskModeManager

object CommandHandler {
    
    private const val TAG = "CommandHandler"
    
    fun handleCommand(context: Context, command: MQTTCommand) {
        Log.d(TAG, "Handling command: ${command.action}")
        
        when (command.action) {
            CommandAction.LOCK_DEVICE -> lockDevice(context)
            CommandAction.UNLOCK_DEVICE -> unlockDevice(context)
            CommandAction.RESTART_DEVICE -> restartDevice(context)
            CommandAction.WIPE_DEVICE -> wipeDevice(context)
            CommandAction.OPEN_APP -> openApp(context, command.params)
            CommandAction.SHOW_MESSAGE -> showMessage(context, command.params)
            CommandAction.PLAY_SOUND -> playSound(context)
            CommandAction.ENABLE_KIOSK -> enableKioskMode(context)
            CommandAction.DISABLE_KIOSK -> disableKioskMode(context)
            CommandAction.OPEN_CAMERA -> openCamera(context)
            CommandAction.TAKE_PHOTO -> takePhoto(context)
            CommandAction.BLUETOOTH_ON -> setBluetoothEnabled(context, true)
            CommandAction.BLUETOOTH_OFF -> setBluetoothEnabled(context, false)
            CommandAction.SHUTDOWN_DEVICE -> shutdownDevice(context)
            CommandAction.DISABLE_CAMERA -> setCameraEnabled(context, false)
            CommandAction.ENABLE_CAMERA -> setCameraEnabled(context, true)
            CommandAction.SEND_DATA_NOW -> sendDataNow(context)
            
            // App Management
            CommandAction.SILENT_INSTALL_APP -> silentInstallApp(context, command.params)
            CommandAction.SILENT_UNINSTALL_APP -> silentUninstallApp(context, command.params)
            CommandAction.SET_MANAGED_CONFIGURATIONS -> setManagedConfigurations(context, command.params)
            CommandAction.SET_INSTALL_APPS_ALLOWED -> setInstallAppsAllowed(context, command.params)
            CommandAction.SET_APP_UNINSTALL_ALLOWED -> setAppUninstallAllowed(context, command.params)

            // Security Policies
            CommandAction.SET_ENCRYPTION_ENABLED -> setEncryptionEnabled(context, command.params)
            CommandAction.SET_FACTORY_RESET_ALLOWED -> setFactoryResetAllowed(context, command.params)
            CommandAction.SET_SAFE_MODE_ALLOWED -> setSafeModeAllowed(context, command.params)
            CommandAction.SET_DEBUGGING_ALLOWED -> setDebuggingAllowed(context, command.params)
            CommandAction.SET_SCREEN_CAPTURE_ALLOWED -> setScreenCaptureAllowed(context, command.params)
            CommandAction.SET_CONFIG_CREDENTIALS_ALLOWED -> setConfigCredentialsAllowed(context, command.params)
            CommandAction.SET_SMART_LOCK_ALLOWED -> setSmartLockAllowed(context, command.params)
            CommandAction.SET_LOCATION_SERVICES_ALLOWED -> setLocationServicesAllowed(context, command.params)
            CommandAction.SET_FINGERPRINT_UNLOCK_ALLOWED -> setFingerprintUnlockAllowed(context, command.params)
            CommandAction.SET_CHANGE_ACCOUNT_PICTURE_ALLOWED -> setChangeAccountPictureAllowed(context, command.params)
            CommandAction.SET_HIDE_SENSITIVE_INFO_ON_LOCK_SCREEN -> setHideSensitiveInfoOnLockScreen(context, command.params)
            
            // Set 2
            CommandAction.SET_MANAGING_ACCOUNTS_ALLOWED -> setManagingAccountsAllowed(context, command.params)
            CommandAction.SET_SMS_ALLOWED -> setSmsAllowed(context, command.params)
            CommandAction.SET_DATA_ROAMING_ALLOWED -> setDataRoamingAllowed(context, command.params)
            CommandAction.SET_VPN_CONFIG_ALLOWED -> setVpnConfigAllowed(context, command.params)
            CommandAction.SET_OUTGOING_CALLS_ALLOWED -> setOutgoingCallsAllowed(context, command.params)
            CommandAction.SET_NETWORK_RESET_ALLOWED -> setNetworkResetAllowed(context, command.params)
            CommandAction.SET_WIFI_CONFIG_ALLOWED -> setWifiConfigAllowed(context, command.params)
            CommandAction.SET_CELL_BROADCASTS_CONFIG_ALLOWED -> setCellBroadcastsConfigAllowed(context, command.params)
            CommandAction.SET_TETHERING_CONFIG_ALLOWED -> setTetheringConfigAllowed(context, command.params)
            CommandAction.SET_BLUETOOTH_POLICY_ALLOWED -> setBluetoothPolicyAllowed(context, command.params)
            CommandAction.SET_MICROPHONE_MUTED -> setMicrophoneMuted(context, command.params)
            CommandAction.SET_EXTERNAL_MEDIA_ALLOWED -> setExternalMediaAllowed(context, command.params)
            CommandAction.SET_USB_FILE_TRANSFER_ALLOWED -> setUsbFileTransferAllowed(context, command.params)

            // Set 3
            CommandAction.SET_WALLPAPER_CHANGE_ALLOWED -> setWallpaperChangeAllowed(context, command.params)
            CommandAction.SET_MANAGING_APPS_ALLOWED -> setManagingAppsAllowed(context, command.params)
            CommandAction.SET_GOOGLE_SECURITY_SCANS_ALLOWED -> setGoogleSecurityScansAllowed(context, command.params)
            CommandAction.SET_DATE_TIME_CHANGE_ALLOWED -> setDateTimeChangeAllowed(context, command.params)
            CommandAction.SET_ORGANIZATION_MESSAGE -> setOrganizationMessage(context, command.params)

            // System Update Policy
            CommandAction.SET_SYSTEM_UPDATE_POLICY -> setSystemUpdatePolicy(context, command.params)

            // Screen & Audio
            CommandAction.SET_SCREEN_BRIGHTNESS -> setScreenBrightness(context, command.params)
            CommandAction.SET_SCREEN_BRIGHTNESS_MODE -> setScreenBrightnessMode(context, command.params)
            CommandAction.SET_RINGER_MODE -> setRingerMode(context, command.params)
            CommandAction.SET_VOLUME_LEVEL -> setVolumeLevel(context, command.params)

            else -> Log.w(TAG, "Unhandled command: ${command.action}")
        }
    }

    // --- ORIGINAL FUNCTIONS ---
    private fun sendDataNow(context: Context) {
        try {
            val intent = Intent(context, MDMService::class.java).apply {
                action = MDMService.ACTION_SEND_DATA_NOW
            }
            context.startService(intent)
            Log.d(TAG, "Sent request to MDMService to send data now")
        } catch (e: Exception) {
            Log.e(TAG, "Error sending request to MDMService", e)
        }
    }

    private fun lockDevice(context: Context) {
        try {
            val dpm = context.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager

            if (dpm.isDeviceOwnerApp(context.packageName)) {
                dpm.lockNow()
                Log.d(TAG, "Device locked")
            } else {
                Log.w(TAG, "App is not device owner, cannot lock device")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error locking device", e)
        }
    }

    private fun unlockDevice(_context: Context) {
        try {
            Log.d(TAG, "Unlock device - requires user interaction")
        } catch (e: Exception) {
            Log.e(TAG, "Error unlocking device", e)
        }
    }

    private fun restartDevice(context: Context) {
        try {
            val dpm = context.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
            if (!dpm.isDeviceOwnerApp(context.packageName)) {
                Log.e(TAG, "Cannot restart device: App is not Device Owner")
                return
            }
            val powerManager = context.getSystemService(Context.POWER_SERVICE) as PowerManager
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                powerManager.reboot("restart")
            } else {
                powerManager.reboot(null)
            }
        } catch (e: SecurityException) {
            Log.e(TAG, "Reboot permission denied. Device must be set as Device Owner to restart.", e)
        } catch (e: Exception) {
            Log.e(TAG, "Error restarting device", e)
        }
    }

    private fun wipeDevice(context: Context) {
        try {
            val dpm = context.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
            if (dpm.isDeviceOwnerApp(context.packageName)) {
                dpm.wipeData(0)
                Log.d(TAG, "Device wipe initiated")
            } else {
                Log.w(TAG, "App is not device owner, cannot wipe device")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error wiping device", e)
        }
    }

    private fun openApp(context: Context, params: Map<String, Any>?) {
        try {
            val packageName = params?.get("packageName") as? String ?: return
            val packageManager = context.packageManager
            val intent = packageManager.getLaunchIntentForPackage(packageName)
            if (intent != null) {
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                context.startActivity(intent)
                Log.d(TAG, "Opened app: $packageName")
            } else {
                Log.w(TAG, "App not found: $packageName")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error opening app", e)
        }
    }

    private fun showMessage(context: Context, params: Map<String, Any>?) {
        try {
            val message = params?.get("message") as? String ?: "No message"
            val title = params?.get("title") as? String ?: "Message"
            showMessageNotification(context, title, message)
        } catch (e: Exception) {
            Log.e(TAG, "Error showing message", e)
        }
    }

    private fun showMessageNotification(context: Context, title: String, message: String) {
        try {
            val channelId = "message_channel"
            val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val channel = NotificationChannel(channelId, "Messages", NotificationManager.IMPORTANCE_HIGH)
                notificationManager.createNotificationChannel(channel)
            }
            val intent = Intent(context, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            val pendingIntent = PendingIntent.getActivity(context, 0, intent, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
            val notification = NotificationCompat.Builder(context, channelId)
                .setSmallIcon(R.drawable.ic_launcher_foreground)
                .setContentTitle(title)
                .setContentText(message)
                .setStyle(NotificationCompat.BigTextStyle().bigText(message))
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setAutoCancel(true)
                .setContentIntent(pendingIntent)
                .build()
            val notificationId = System.currentTimeMillis().toInt()
            notificationManager.notify(notificationId, notification)
        } catch (e: Exception) {
            Log.e(TAG, "Error showing message notification", e)
        }
    }

    private fun playSound(context: Context) {
         try {
            val ringtoneUri: Uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)
            val ringtone = RingtoneManager.getRingtone(context, ringtoneUri)
            ringtone?.play()
            android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({ ringtone?.stop() }, 2000)
        } catch (e: Exception) {
            try {
                val toneGenerator = ToneGenerator(AudioManager.STREAM_NOTIFICATION, 100)
                toneGenerator.startTone(ToneGenerator.TONE_PROP_BEEP, 800)
            } catch (e2: Exception) {
                 Log.e(TAG, "Error playing sound fallback", e2)
            }
        }
    }

    private fun enableKioskMode(context: Context) {
        try {
            KioskModeManager.enableKioskMode(context)
            Log.d(TAG, "Kiosk mode enabled")
        } catch (e: Exception) {
            Log.e(TAG, "Error enabling kiosk mode", e)
        }
    }

    private fun disableKioskMode(context: Context) {
        try {
            KioskModeManager.disableKioskMode(context)
            Log.d(TAG, "Kiosk mode disabled")
        } catch (e: Exception) {
            Log.e(TAG, "Error disabling kiosk mode", e)
        }
    }

    private fun openCamera(context: Context) {
        try {
            val intent = Intent(android.provider.MediaStore.ACTION_IMAGE_CAPTURE)
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            context.startActivity(intent)
        } catch (e: Exception) {
            Log.e(TAG, "Error opening camera", e)
        }
    }

    private fun takePhoto(context: Context) {
        openCamera(context)
    }

    private fun setBluetoothEnabled(context: Context, enabled: Boolean) {
        try {
            val bluetoothAdapter = BluetoothAdapter.getDefaultAdapter() ?: return
            if (enabled) bluetoothAdapter.enable() else bluetoothAdapter.disable()
        } catch (e: SecurityException) {
            Log.e(TAG, "Bluetooth permission denied.", e)
        } catch (e: Exception) {
            Log.e(TAG, "Error setting Bluetooth state", e)
        }
    }

    private fun shutdownDevice(context: Context) {
        try {
             val dpm = context.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
            if (dpm.isDeviceOwnerApp(context.packageName)) {
                 val powerManager = context.getSystemService(Context.POWER_SERVICE) as PowerManager
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                    powerManager.reboot("shutdown")
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error shutting down device", e)
        }
    }

    private fun setCameraEnabled(context: Context, enabled: Boolean) {
         try {
            val dpm = context.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
            val adminComponent = ComponentName(context, DeviceOwnerReceiver::class.java)
            if (!dpm.isDeviceOwnerApp(context.packageName)) return
            dpm.setCameraDisabled(adminComponent, !enabled)
        } catch (e: Exception) {
            Log.e(TAG, "Error setting camera state", e)
        }
    }

    // --- APP MANAGEMENT (Managed Google Play) ---
    private fun silentInstallApp(context: Context, params: Map<String, Any>?) {
        val packageName = params?.get("packageName") as? String ?: return
        val dpm = context.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
        val admin = ComponentName(context, DeviceOwnerReceiver::class.java)
        if (dpm.isDeviceOwnerApp(context.packageName)) {
            try {
                dpm.installExistingPackage(admin, packageName)
                Log.d(TAG, "Sent silent install request for: $packageName")
            } catch (e: Exception) {
                Log.e(TAG, "Error during silent install for $packageName", e)
            }
        }
    }

    private fun silentUninstallApp(context: Context, params: Map<String, Any>?) {
        val packageName = params?.get("packageName") as? String ?: return
        val dpm = context.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
        val admin = ComponentName(context, DeviceOwnerReceiver::class.java)

        if (dpm.isDeviceOwnerApp(context.packageName)) {
            Log.d(TAG, "Attempting to silently uninstall package: $packageName")
            try {
                // สร้าง Intent เพื่อรอรับผลลัพธ์หลังจากการถอนการติดตั้งเสร็จสิ้น
                val intent = Intent(context, DeviceOwnerReceiver::class.java).apply {
                    // ตั้งชื่อ Action ที่ไม่ซ้ำใคร เพื่อให้ BroadcastReceiver ของเรารู้ว่านี่คือผลลัพธ์การถอนการติดตั้ง
                    action = "com.ontrak.mdm.action.UNINSTALL_COMPLETE"
                }

                // สร้าง PendingIntent ที่จะถูกเรียกเมื่อการทำงานเสร็จสิ้น
                val pendingIntent = PendingIntent.getBroadcast(
                    context,
                    0,
                    intent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )

                // ใช้ PackageInstaller เพื่อสั่งถอนการติดตั้ง
                // นี่คือวิธีที่ถูกต้องสำหรับ Device Owner
                context.packageManager.packageInstaller.uninstall(packageName, pendingIntent.intentSender)

                Log.d(TAG, "Uninstall initiated for $packageName")

            } catch (e: Exception) {
                Log.e(TAG, "Error initiating silent uninstall for $packageName", e)
            }
        } else {
            Log.w(TAG, "Cannot uninstall app: Not a device owner.")
        }
    }

    private fun setManagedConfigurations(context: Context, params: Map<String, Any>?) {
        val packageName = params?.get("packageName") as? String ?: return
        val configurations = params?.get("configurations") as? Map<String, Any> ?: return
        val dpm = context.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
        val admin = ComponentName(context, DeviceOwnerReceiver::class.java)
        if (dpm.isDeviceOwnerApp(context.packageName)) {
            val bundle = Bundle()
            configurations.forEach { (key, value) ->
                when (value) {
                    is Boolean -> bundle.putBoolean(key, value)
                    is Int -> bundle.putInt(key, value)
                    is String -> bundle.putString(key, value)
                    is Array<*> -> if (value.all { it is String }) {
                        bundle.putStringArray(key, value.map { it.toString() }.toTypedArray())
                    }
                }
            }
            try {
                dpm.setApplicationRestrictions(admin, packageName, bundle)
                Log.d(TAG, "Applied managed configurations for: $packageName")
            } catch (e: Exception) {
                Log.e(TAG, "Error applying managed configurations for $packageName", e)
            }
        }
    }

    private fun setInstallAppsAllowed(context: Context, params: Map<String, Any>?) {
        val allowed = params?.get("allowed") as? Boolean ?: return
        val dpm = context.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
        val admin = ComponentName(context, DeviceOwnerReceiver::class.java)
        if (dpm.isDeviceOwnerApp(context.packageName)) {
            if (!allowed) dpm.addUserRestriction(admin, UserManager.DISALLOW_INSTALL_APPS)
            else dpm.clearUserRestriction(admin, UserManager.DISALLOW_INSTALL_APPS)
        }
    }

    private fun setAppUninstallAllowed(context: Context, params: Map<String, Any>?) {
        val allowed = params?.get("allowed") as? Boolean ?: return
        val dpm = context.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
        val admin = ComponentName(context, DeviceOwnerReceiver::class.java)
        if (dpm.isDeviceOwnerApp(context.packageName)) {
            if (!allowed) dpm.addUserRestriction(admin, UserManager.DISALLOW_UNINSTALL_APPS)
            else dpm.clearUserRestriction(admin, UserManager.DISALLOW_UNINSTALL_APPS)
        }
    }

    // --- FUNCTIONS FOR SET 1 ---
    private fun setEncryptionEnabled(context: Context, params: Map<String, Any>?) {
        val enabled = params?.get("enabled") as? Boolean ?: return
        val dpm = context.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
        val admin = DeviceOwnerReceiver.getComponentName(context)
        if (dpm.isDeviceOwnerApp(context.packageName)) {
             dpm.setStorageEncryption(admin, enabled)
        }
    }

    private fun setFactoryResetAllowed(context: Context, params: Map<String, Any>?) {
        val allowed = params?.get("allowed") as? Boolean ?: return
        val dpm = context.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
        val admin = DeviceOwnerReceiver.getComponentName(context)
        if (dpm.isDeviceOwnerApp(context.packageName)) {
            if(!allowed) dpm.addUserRestriction(admin, UserManager.DISALLOW_FACTORY_RESET)
            else dpm.clearUserRestriction(admin, UserManager.DISALLOW_FACTORY_RESET)
        }
    }

    private fun setSafeModeAllowed(context: Context, params: Map<String, Any>?) {
        val allowed = params?.get("allowed") as? Boolean ?: return
        val dpm = context.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
        val admin = DeviceOwnerReceiver.getComponentName(context)
        if (dpm.isDeviceOwnerApp(context.packageName)) {
            if (!allowed) dpm.addUserRestriction(admin, UserManager.DISALLOW_SAFE_BOOT)
            else dpm.clearUserRestriction(admin, UserManager.DISALLOW_SAFE_BOOT)
        }
    }

    private fun setDebuggingAllowed(context: Context, params: Map<String, Any>?) {
        val allowed = params?.get("allowed") as? Boolean ?: return
        val dpm = context.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
        val admin = DeviceOwnerReceiver.getComponentName(context)
        if (dpm.isDeviceOwnerApp(context.packageName)) {
            if (!allowed) dpm.addUserRestriction(admin, UserManager.DISALLOW_DEBUGGING_FEATURES)
            else dpm.clearUserRestriction(admin, UserManager.DISALLOW_DEBUGGING_FEATURES)
        }
    }

    private fun setScreenCaptureAllowed(context: Context, params: Map<String, Any>?) {
        val allowed = params?.get("allowed") as? Boolean ?: return
        val dpm = context.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
        val admin = ComponentName(context, DeviceOwnerReceiver::class.java)
        if (dpm.isDeviceOwnerApp(context.packageName)) {
            dpm.setScreenCaptureDisabled(admin, !allowed)
        }
    }

    private fun setConfigCredentialsAllowed(context: Context, params: Map<String, Any>?) {
        val allowed = params?.get("allowed") as? Boolean ?: return
        val dpm = context.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
        val admin = DeviceOwnerReceiver.getComponentName(context)
        if (dpm.isDeviceOwnerApp(context.packageName)) {
            if (!allowed) dpm.addUserRestriction(admin, UserManager.DISALLOW_CONFIG_CREDENTIALS)
            else dpm.clearUserRestriction(admin, UserManager.DISALLOW_CONFIG_CREDENTIALS)
        }
    }

    private fun setSmartLockAllowed(context: Context, params: Map<String, Any>?) {
        val allowed = params?.get("allowed") as? Boolean ?: return
        val dpm = context.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
        val admin = ComponentName(context, DeviceOwnerReceiver::class.java)
        if (dpm.isDeviceOwnerApp(context.packageName)) {
            val features = if (!allowed) DevicePolicyManager.KEYGUARD_DISABLE_TRUST_AGENTS else DevicePolicyManager.KEYGUARD_DISABLE_FEATURES_NONE
            dpm.setKeyguardDisabledFeatures(admin, features)
        }
    }

    private fun setLocationServicesAllowed(context: Context, params: Map<String, Any>?) {
        val allowed = params?.get("allowed") as? Boolean ?: return
        val dpm = context.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
        val admin = DeviceOwnerReceiver.getComponentName(context)
        if (dpm.isDeviceOwnerApp(context.packageName)) {
             if (!allowed) dpm.addUserRestriction(admin, UserManager.DISALLOW_SHARE_LOCATION)
             else dpm.clearUserRestriction(admin, UserManager.DISALLOW_SHARE_LOCATION)
        }
    }

    private fun setFingerprintUnlockAllowed(context: Context, params: Map<String, Any>?) {
        val allowed = params?.get("allowed") as? Boolean ?: return
        val dpm = context.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
        val admin = ComponentName(context, DeviceOwnerReceiver::class.java)
        if (dpm.isDeviceOwnerApp(context.packageName)) {
            val features = if (!allowed) DevicePolicyManager.KEYGUARD_DISABLE_FINGERPRINT else DevicePolicyManager.KEYGUARD_DISABLE_FEATURES_NONE
            dpm.setKeyguardDisabledFeatures(admin, features)
        }
    }

    private fun setChangeAccountPictureAllowed(context: Context, params: Map<String, Any>?) {
        val allowed = params?.get("allowed") as? Boolean ?: return
        val dpm = context.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
        val admin = DeviceOwnerReceiver.getComponentName(context)
        if (dpm.isDeviceOwnerApp(context.packageName)) {
            if (!allowed) dpm.addUserRestriction(admin, UserManager.DISALLOW_SET_USER_ICON)
            else dpm.clearUserRestriction(admin, UserManager.DISALLOW_SET_USER_ICON)
        }
    }

    private fun setHideSensitiveInfoOnLockScreen(context: Context, params: Map<String, Any>?) {
        val hide = params?.get("hide") as? Boolean ?: return
        val dpm = context.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
        val admin = ComponentName(context, DeviceOwnerReceiver::class.java)
        if (dpm.isDeviceOwnerApp(context.packageName)) {
            val features = if (hide) DevicePolicyManager.KEYGUARD_DISABLE_SECURE_NOTIFICATIONS else DevicePolicyManager.KEYGUARD_DISABLE_FEATURES_NONE
            dpm.setKeyguardDisabledFeatures(admin, features)
        }
    }

    // --- FUNCTIONS FOR SET 2 ---

    private fun setManagingAccountsAllowed(context: Context, params: Map<String, Any>?) {
        val allowed = params?.get("allowed") as? Boolean ?: return
        val dpm = context.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
        val admin = ComponentName(context, DeviceOwnerReceiver::class.java)
        if (dpm.isDeviceOwnerApp(context.packageName)) {
            if (!allowed) dpm.addUserRestriction(admin, UserManager.DISALLOW_MODIFY_ACCOUNTS)
            else dpm.clearUserRestriction(admin, UserManager.DISALLOW_MODIFY_ACCOUNTS)
        }
    }

    private fun setSmsAllowed(context: Context, params: Map<String, Any>?) {
        val allowed = params?.get("allowed") as? Boolean ?: return
        val dpm = context.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
        val admin = ComponentName(context, DeviceOwnerReceiver::class.java)
        if (dpm.isDeviceOwnerApp(context.packageName)) {
            if (!allowed) dpm.addUserRestriction(admin, UserManager.DISALLOW_SMS)
            else dpm.clearUserRestriction(admin, UserManager.DISALLOW_SMS)
        }
    }

    private fun setDataRoamingAllowed(context: Context, params: Map<String, Any>?) {
        val allowed = params?.get("allowed") as? Boolean ?: return
        val dpm = context.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
        val admin = ComponentName(context, DeviceOwnerReceiver::class.java)
        if (dpm.isDeviceOwnerApp(context.packageName)) {
            if (!allowed) dpm.addUserRestriction(admin, UserManager.DISALLOW_DATA_ROAMING)
            else dpm.clearUserRestriction(admin, UserManager.DISALLOW_DATA_ROAMING)
        }
    }

    private fun setVpnConfigAllowed(context: Context, params: Map<String, Any>?) {
        val allowed = params?.get("allowed") as? Boolean ?: return
        val dpm = context.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
        val admin = ComponentName(context, DeviceOwnerReceiver::class.java)
        if (dpm.isDeviceOwnerApp(context.packageName)) {
            if (!allowed) dpm.addUserRestriction(admin, UserManager.DISALLOW_CONFIG_VPN)
            else dpm.clearUserRestriction(admin, UserManager.DISALLOW_CONFIG_VPN)
        }
    }

    private fun setOutgoingCallsAllowed(context: Context, params: Map<String, Any>?) {
        val allowed = params?.get("allowed") as? Boolean ?: return
        val dpm = context.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
        val admin = ComponentName(context, DeviceOwnerReceiver::class.java)
        if (dpm.isDeviceOwnerApp(context.packageName)) {
            if (!allowed) dpm.addUserRestriction(admin, UserManager.DISALLOW_OUTGOING_CALLS)
            else dpm.clearUserRestriction(admin, UserManager.DISALLOW_OUTGOING_CALLS)
        }
    }

    private fun setNetworkResetAllowed(context: Context, params: Map<String, Any>?) {
        val allowed = params?.get("allowed") as? Boolean ?: return
        val dpm = context.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
        val admin = ComponentName(context, DeviceOwnerReceiver::class.java)
        if (dpm.isDeviceOwnerApp(context.packageName)) {
            if (!allowed) dpm.addUserRestriction(admin, UserManager.DISALLOW_NETWORK_RESET)
            else dpm.clearUserRestriction(admin, UserManager.DISALLOW_NETWORK_RESET)
        }
    }

    private fun setWifiConfigAllowed(context: Context, params: Map<String, Any>?) {
        val allowed = params?.get("allowed") as? Boolean ?: return
        val dpm = context.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
        val admin = ComponentName(context, DeviceOwnerReceiver::class.java)
        if (dpm.isDeviceOwnerApp(context.packageName)) {
            if (!allowed) dpm.addUserRestriction(admin, UserManager.DISALLOW_CONFIG_WIFI)
            else dpm.clearUserRestriction(admin, UserManager.DISALLOW_CONFIG_WIFI)
        }
    }

    private fun setCellBroadcastsConfigAllowed(context: Context, params: Map<String, Any>?) {
        val allowed = params?.get("allowed") as? Boolean ?: return
        val dpm = context.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
        val admin = ComponentName(context, DeviceOwnerReceiver::class.java)
        if (dpm.isDeviceOwnerApp(context.packageName)) {
            if (!allowed) dpm.addUserRestriction(admin, UserManager.DISALLOW_CONFIG_CELL_BROADCASTS)
            else dpm.clearUserRestriction(admin, UserManager.DISALLOW_CONFIG_CELL_BROADCASTS)
        }
    }

    private fun setTetheringConfigAllowed(context: Context, params: Map<String, Any>?) {
        val allowed = params?.get("allowed") as? Boolean ?: return
        val dpm = context.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
        val admin = ComponentName(context, DeviceOwnerReceiver::class.java)
        if (dpm.isDeviceOwnerApp(context.packageName)) {
            if (!allowed) dpm.addUserRestriction(admin, UserManager.DISALLOW_CONFIG_TETHERING)
            else dpm.clearUserRestriction(admin, UserManager.DISALLOW_CONFIG_TETHERING)
        }
    }

    private fun setBluetoothPolicyAllowed(context: Context, params: Map<String, Any>?) {
        val allowed = params?.get("allowed") as? Boolean ?: return
        val dpm = context.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
        val admin = ComponentName(context, DeviceOwnerReceiver::class.java)
        if (dpm.isDeviceOwnerApp(context.packageName)) {
            if (!allowed) dpm.addUserRestriction(admin, UserManager.DISALLOW_BLUETOOTH)
            else dpm.clearUserRestriction(admin, UserManager.DISALLOW_BLUETOOTH)
        }
    }

    private fun setMicrophoneMuted(context: Context, params: Map<String, Any>?) {
        val muted = params?.get("muted") as? Boolean ?: return
        val dpm = context.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
        val admin = ComponentName(context, DeviceOwnerReceiver::class.java)
        if (dpm.isDeviceOwnerApp(context.packageName)) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                if (muted) {
                    dpm.addUserRestriction(admin, UserManager.DISALLOW_MICROPHONE_TOGGLE)
                } else {
                    dpm.clearUserRestriction(admin, UserManager.DISALLOW_MICROPHONE_TOGGLE)
                }
                Log.d(TAG, "Microphone toggle policy set to: ${!muted}")

            } else {
                Log.w(TAG, "Setting microphone mute policy is not supported on this Android version (requires API 31+).")
            }
        }
    }

    private fun setExternalMediaAllowed(context: Context, params: Map<String, Any>?) {
        val allowed = params?.get("allowed") as? Boolean ?: return
        val dpm = context.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
        val admin = ComponentName(context, DeviceOwnerReceiver::class.java)
        if (dpm.isDeviceOwnerApp(context.packageName)) {
            if (!allowed) dpm.addUserRestriction(admin, UserManager.DISALLOW_MOUNT_PHYSICAL_MEDIA)
            else dpm.clearUserRestriction(admin, UserManager.DISALLOW_MOUNT_PHYSICAL_MEDIA)
        }
    }

    private fun setUsbFileTransferAllowed(context: Context, params: Map<String, Any>?) {
        val allowed = params?.get("allowed") as? Boolean ?: return
        val dpm = context.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
        val admin = ComponentName(context, DeviceOwnerReceiver::class.java)
        if (dpm.isDeviceOwnerApp(context.packageName)) {
            if (!allowed) dpm.addUserRestriction(admin, UserManager.DISALLOW_USB_FILE_TRANSFER)
            else dpm.clearUserRestriction(admin, UserManager.DISALLOW_USB_FILE_TRANSFER)
        }
    }

    // --- FUNCTIONS FOR SET 3 ---
    private fun setWallpaperChangeAllowed(context: Context, params: Map<String, Any>?) {
        val allowed = params?.get("allowed") as? Boolean ?: return
        val dpm = context.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
        val admin = ComponentName(context, DeviceOwnerReceiver::class.java)
        if (dpm.isDeviceOwnerApp(context.packageName)) {
            if (!allowed) dpm.addUserRestriction(admin, UserManager.DISALLOW_SET_WALLPAPER)
            else dpm.clearUserRestriction(admin, UserManager.DISALLOW_SET_WALLPAPER)
        }
    }

    private fun setManagingAppsAllowed(context: Context, params: Map<String, Any>?) {
        val allowed = params?.get("allowed") as? Boolean ?: return
        val dpm = context.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
        val admin = ComponentName(context, DeviceOwnerReceiver::class.java)
        if (dpm.isDeviceOwnerApp(context.packageName)) {
            if (!allowed) dpm.addUserRestriction(admin, UserManager.DISALLOW_APPS_CONTROL)
            else dpm.clearUserRestriction(admin, UserManager.DISALLOW_APPS_CONTROL)
        }
    }

    private fun setGoogleSecurityScansAllowed(context: Context, params: Map<String, Any>?) {
        val allowed = params?.get("allowed") as? Boolean ?: return
        val dpm = context.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
        val admin = ComponentName(context, DeviceOwnerReceiver::class.java)
        if (dpm.isDeviceOwnerApp(context.packageName)) {
            // This policy disallows the user from disabling Google Play Protect's app verification.
            if (!allowed) dpm.addUserRestriction(admin, "no_verify_apps")
            else dpm.clearUserRestriction(admin, "no_verify_apps")
        }
    }

    private fun setDateTimeChangeAllowed(context: Context, params: Map<String, Any>?) {
        val allowed = params?.get("allowed") as? Boolean ?: return
        val dpm = context.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
        val admin = ComponentName(context, DeviceOwnerReceiver::class.java)
        if (dpm.isDeviceOwnerApp(context.packageName)) {
            if (!allowed) dpm.addUserRestriction(admin, UserManager.DISALLOW_CONFIG_DATE_TIME)
            else dpm.clearUserRestriction(admin, UserManager.DISALLOW_CONFIG_DATE_TIME)
        }
    }

    private fun setOrganizationMessage(context: Context, params: Map<String, Any>?) {
        val dpm = context.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
        val admin = ComponentName(context, DeviceOwnerReceiver::class.java)
        if (dpm.isDeviceOwnerApp(context.packageName)) {
            val shortMsg = params?.get("short_message") as? CharSequence
            val longMsg = params?.get("long_message") as? CharSequence
            dpm.setShortSupportMessage(admin, shortMsg)
            dpm.setLongSupportMessage(admin, longMsg)
        }
    }

    private fun setSystemUpdatePolicy(context: Context, params: Map<String, Any>?) {
        val dpm = context.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
        val admin = ComponentName(context, DeviceOwnerReceiver::class.java)
        if (dpm.isDeviceOwnerApp(context.packageName)) {
            val policyType = params?.get("policy") as? String
            val policy = when (policyType) {
                "automatic" -> SystemUpdatePolicy.createAutomaticInstallPolicy()
                "windowed" -> {
                    val start = (params?.get("start") as? Double)?.toInt() ?: 0
                    val end = (params?.get("end") as? Double)?.toInt() ?: 2359
                    SystemUpdatePolicy.createWindowedInstallPolicy(start, end)
                }
                "postpone" -> SystemUpdatePolicy.createPostponeInstallPolicy()
                else -> null
            }
            dpm.setSystemUpdatePolicy(admin, policy)
        }
    }

    private fun setScreenBrightness(context: Context, params: Map<String, Any>?) {
        try {
            val level = (params?.get("level") as? Double)?.toInt() ?: return
            Settings.System.putInt(context.contentResolver, Settings.System.SCREEN_BRIGHTNESS, level.coerceIn(0, 255))
            Log.d(TAG, "Screen brightness set to $level")
        } catch (e: Exception) {
            Log.e(TAG, "Error setting screen brightness", e)
        }
    }

    private fun setScreenBrightnessMode(context: Context, params: Map<String, Any>?) {
        try {
            val auto = params?.get("auto") as? Boolean ?: return

            Settings.System.putInt(
                context.contentResolver,
                Settings.System.SCREEN_BRIGHTNESS_MODE,
                if (auto) Settings.System.SCREEN_BRIGHTNESS_MODE_AUTOMATIC else Settings.System.SCREEN_BRIGHTNESS_MODE_MANUAL
            )
            Log.d(TAG, "Screen brightness mode set to ${if (auto) "auto" else "manual"}")
        } catch (e: Exception) {
            Log.e(TAG, "Error setting screen brightness mode", e)
        }
    }

    private fun setRingerMode(context: Context, params: Map<String, Any>?) {
        try {
            val mode = params?.get("mode") as? String ?: return
            val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager

            when (mode.uppercase()) {
                "NORMAL" -> audioManager.ringerMode = AudioManager.RINGER_MODE_NORMAL
                "VIBRATE" -> audioManager.ringerMode = AudioManager.RINGER_MODE_VIBRATE
                "SILENT" -> audioManager.ringerMode = AudioManager.RINGER_MODE_SILENT
            }
            Log.d(TAG, "Ringer mode set to $mode")
        } catch (e: Exception) {
            Log.e(TAG, "Error setting ringer mode", e)
        }
    }

    private fun setVolumeLevel(context: Context, params: Map<String, Any>?) {
        try {
            val level = (params?.get("level") as? Double)?.toInt() ?: return
            val stream = params?.get("stream") as? String ?: "ring"
            val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
            
            val streamType = when (stream.uppercase()) {
                "MUSIC" -> AudioManager.STREAM_MUSIC
                "ALARM" -> AudioManager.STREAM_ALARM
                "NOTIFICATION" -> AudioManager.STREAM_NOTIFICATION
                else -> AudioManager.STREAM_RING
            }
            
            val maxVolume = audioManager.getStreamMaxVolume(streamType)
            val newVolume = (level / 100.0 * maxVolume).toInt().coerceIn(0, maxVolume)

            audioManager.setStreamVolume(streamType, newVolume, 0)
            Log.d(TAG, "Volume level for $stream set to $level%")
        } catch (e: Exception) {
            Log.e(TAG, "Error setting volume level", e)
        }
    }
}
