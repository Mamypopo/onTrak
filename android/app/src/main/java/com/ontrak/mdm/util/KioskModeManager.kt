package com.ontrak.mdm.util

import android.app.Activity
import android.app.ActivityManager
import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.Build
import android.provider.Settings
import android.util.Log
import com.ontrak.mdm.receiver.DeviceOwnerReceiver

object KioskModeManager {
    
    private const val TAG = "KioskModeManager"
    
    fun enableKioskMode(context: Context) {
        try {
            val dpm = context.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
            val adminComponent = ComponentName(context, DeviceOwnerReceiver::class.java)
            
            if (!dpm.isDeviceOwnerApp(context.packageName)) {
                Log.w(TAG, "App is not device owner, cannot enable kiosk mode")
                return
            }
            
            // Set lock task mode
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                dpm.setLockTaskPackages(adminComponent, arrayOf(context.packageName))
            }
            
            // Disable keyguard features
            dpm.setKeyguardDisabled(adminComponent, true)
            
            // Disable status bar
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                dpm.setStatusBarDisabled(adminComponent, true)
            }
            
            Log.d(TAG, "Kiosk mode enabled")
        } catch (e: Exception) {
            Log.e(TAG, "Error enabling kiosk mode", e)
        }
    }
    
    fun disableKioskMode(context: Context) {
        try {
            val dpm = context.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
            val adminComponent = ComponentName(context, DeviceOwnerReceiver::class.java)
            
            if (!dpm.isDeviceOwnerApp(context.packageName)) {
                Log.w(TAG, "App is not device owner, cannot disable kiosk mode")
                return
            }
            
            // Re-enable keyguard
            dpm.setKeyguardDisabled(adminComponent, false)
            
            // Re-enable status bar
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                dpm.setStatusBarDisabled(adminComponent, false)
            }
            
            Log.d(TAG, "Kiosk mode disabled")
        } catch (e: Exception) {
            Log.e(TAG, "Error disabling kiosk mode", e)
        }
    }
    
    fun startLockTask(activity: Activity) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                activity.startLockTask()
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error starting lock task", e)
        }
    }
    
    fun stopLockTask(activity: Activity) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                activity.stopLockTask()
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error stopping lock task", e)
        }
    }
}

