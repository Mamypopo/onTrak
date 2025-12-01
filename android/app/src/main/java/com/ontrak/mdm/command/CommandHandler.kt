package com.ontrak.mdm.command

import android.app.ActivityManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.media.AudioManager
import android.media.ToneGenerator
import android.net.wifi.WifiManager
import android.os.Build
import android.os.PowerManager
import android.util.Log
import androidx.core.app.NotificationCompat
import com.ontrak.mdm.R
import com.ontrak.mdm.model.CommandAction
import com.ontrak.mdm.model.MQTTCommand
import com.ontrak.mdm.receiver.DeviceOwnerReceiver
import com.ontrak.mdm.ui.MainActivity
import com.ontrak.mdm.ui.MessageDialogActivity
import com.ontrak.mdm.util.KioskModeManager

object CommandHandler {
    
    private const val TAG = "CommandHandler"
    
    fun handleCommand(context: Context, command: MQTTCommand) {
        Log.d(TAG, "Handling command: ${command.action}")
        
        when (command.action) {
            CommandAction.LOCK_DEVICE -> lockDevice(context)
            CommandAction.UNLOCK_DEVICE -> unlockDevice(context)
            CommandAction.RESTART_DEVICE -> restartDevice(context)
            CommandAction.WIFI_ON -> setWifiEnabled(context, true)
            CommandAction.WIFI_OFF -> setWifiEnabled(context, false)
            CommandAction.OPEN_APP -> openApp(context, command.params)
            CommandAction.SHOW_MESSAGE -> showMessage(context, command.params)
            CommandAction.PLAY_SOUND -> playSound(context)
            CommandAction.ENABLE_KIOSK -> enableKioskMode(context)
            CommandAction.DISABLE_KIOSK -> disableKioskMode(context)
            CommandAction.OPEN_CAMERA -> openCamera(context)
            CommandAction.TAKE_PHOTO -> takePhoto(context)
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
            // Note: Unlocking requires user interaction or biometric authentication
            // This is a limitation of Android security
            Log.d(TAG, "Unlock device - requires user interaction")
        } catch (e: Exception) {
            Log.e(TAG, "Error unlocking device", e)
        }
    }
    
    private fun restartDevice(context: Context) {
        try {
            val powerManager = context.getSystemService(Context.POWER_SERVICE) as PowerManager
            powerManager.reboot(null)
        } catch (e: Exception) {
            Log.e(TAG, "Error restarting device", e)
        }
    }
    
    private fun setWifiEnabled(context: Context, enabled: Boolean) {
        try {
            val wifiManager = context.applicationContext.getSystemService(Context.WIFI_SERVICE) as WifiManager
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.Q) {
                // Android 10+ requires different approach, but for now we'll use the deprecated method
                // as it still works for device owner apps
                @Suppress("DEPRECATION")
                wifiManager.isWifiEnabled = enabled
            } else {
                @Suppress("DEPRECATION")
                wifiManager.isWifiEnabled = enabled
            }
            Log.d(TAG, "WiFi ${if (enabled) "enabled" else "disabled"}")
        } catch (e: Exception) {
            Log.e(TAG, "Error setting WiFi state", e)
        }
    }
    
    private fun openApp(context: Context, params: Map<String, Any>?) {
        try {
            val packageName = params?.get("packageName") as? String
            if (packageName == null) {
                Log.w(TAG, "No packageName provided for OPEN_APP command")
                return
            }
            
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
            
            val intent = Intent(context, MessageDialogActivity::class.java).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                putExtra("title", title)
                putExtra("message", message)
            }
            context.startActivity(intent)
            Log.d(TAG, "Showing message: $title - $message")
        } catch (e: Exception) {
            Log.e(TAG, "Error showing message", e)
        }
    }
    
    private fun playSound(context: Context) {
        try {
            // 1. Play sound
            val toneGenerator = ToneGenerator(AudioManager.STREAM_NOTIFICATION, 100)
            toneGenerator.startTone(ToneGenerator.TONE_PROP_BEEP, 800)
            
            // 2. Vibrate if available
            try {
                if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.S) {
                    // Android 12+ (API 31+)
                    val vibratorManager = context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as? android.os.VibratorManager
                    val vibrator = vibratorManager?.defaultVibrator
                    if (vibrator != null) {
                        val pattern = android.os.VibrationEffect.createWaveform(
                            longArrayOf(0, 200, 100, 200),
                            -1
                        )
                        vibrator.vibrate(pattern)
                    }
                } else {
                    // Android 11 and below
                    @Suppress("DEPRECATION")
                    val vibrator = context.getSystemService(Context.VIBRATOR_SERVICE) as? android.os.Vibrator
                    if (vibrator != null && vibrator.hasVibrator()) {
                        val pattern = longArrayOf(0, 200, 100, 200)
                        @Suppress("DEPRECATION")
                        vibrator.vibrate(pattern, -1)
                    }
                }
            } catch (e: Exception) {
                Log.w(TAG, "Vibration not available", e)
            }
            
            // 3. Show notification (best practice: multi-modal feedback)
            showAlertNotification(context)
            
            Log.d(TAG, "Playing alert sound, vibration, and notification")
        } catch (e: Exception) {
            Log.e(TAG, "Error playing sound", e)
        }
    }
    
    private fun showAlertNotification(context: Context) {
        try {
            val channelId = "alert_channel"
            val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            
            // Create notification channel for Android 8.0+
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val channel = NotificationChannel(
                    channelId,
                    "Alert Notifications",
                    NotificationManager.IMPORTANCE_HIGH
                ).apply {
                    description = "Remote alert notifications from OnTrak MDM"
                    enableVibration(true)
                    vibrationPattern = longArrayOf(0, 200, 100, 200)
                    enableLights(true)
                }
                notificationManager.createNotificationChannel(channel)
            }
            
            // Create intent to open app when notification is tapped
            val intent = Intent(context, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
            }
            val pendingIntent = PendingIntent.getActivity(
                context,
                0,
                intent,
                PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
            )
            
            // Build notification
            val notification = NotificationCompat.Builder(context, channelId)
                .setSmallIcon(android.R.drawable.ic_dialog_alert)
                .setContentTitle("Alert from OnTrak MDM")
                .setContentText("You have received an alert notification")
                .setStyle(NotificationCompat.BigTextStyle()
                    .bigText("You have received an alert notification from the OnTrak MDM system. Please check your device."))
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setDefaults(NotificationCompat.DEFAULT_ALL) // Sound + Vibration + Light
                .setAutoCancel(true) // Auto-dismiss when tapped
                .setContentIntent(pendingIntent)
                .build()
            
            // Show notification with unique ID (use timestamp to avoid replacing)
            val notificationId = System.currentTimeMillis().toInt()
            notificationManager.notify(notificationId, notification)
            
            Log.d(TAG, "Alert notification shown")
        } catch (e: Exception) {
            Log.e(TAG, "Error showing notification", e)
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
            // Try to open camera app directly by package name (doesn't require CAMERA permission)
            // This works because we're just launching the camera app, not using camera ourselves
            val packageManager = context.packageManager
            
            // Try common camera package names
            val cameraPackages = listOf(
                "com.android.camera2",
                "com.android.camera",
                "com.google.android.GoogleCamera",
                "com.samsung.android.camera",
                "com.huawei.camera",
                "com.miui.camera",
                "com.oppo.camera",
                "com.vivo.camera"
            )
            
            for (packageName in cameraPackages) {
                try {
                    val intent = packageManager.getLaunchIntentForPackage(packageName)
                    if (intent != null) {
                        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                        context.startActivity(intent)
                        Log.d(TAG, "Camera app opened: $packageName")
                        return
                    }
                } catch (e: Exception) {
                    // Try next package
                    continue
                }
            }
            
            // Fallback: Try ACTION_IMAGE_CAPTURE (requires permission on some devices)
            try {
                val cameraIntent = Intent(android.provider.MediaStore.ACTION_IMAGE_CAPTURE)
                cameraIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                
                if (cameraIntent.resolveActivity(context.packageManager) != null) {
                    context.startActivity(cameraIntent)
                    Log.d(TAG, "Camera app opened via ACTION_IMAGE_CAPTURE")
                } else {
                    Log.w(TAG, "No camera app available on device")
                }
            } catch (e: SecurityException) {
                Log.w(TAG, "Camera permission denied. Please grant camera permission in app settings.")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error opening camera", e)
        }
    }
    
    private fun takePhoto(context: Context) {
        // Use same method as openCamera (opens camera app for user to take photo)
        openCamera(context)
    }
}

