package com.ontrak.mdm.receiver

import android.Manifest
import android.app.admin.DeviceAdminReceiver
import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log

class DeviceOwnerReceiver : DeviceAdminReceiver() {

    override fun onEnabled(context: Context, intent: Intent) {
        super.onEnabled(context, intent)
        Log.d(TAG, "Device admin enabled")
        grantRequiredPermissions(context)
    }

    private fun grantRequiredPermissions(context: Context) {
        val dpm = context.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
        val adminComponentName = getComponentName(context)
        val packageName = context.packageName

        if (dpm.isDeviceOwnerApp(packageName)) {
            Log.d(TAG, "App is device owner. Granting required permissions.")

            // Grant READ_PHONE_STATE to allow getting the device serial number.
            dpm.setPermissionGrantState(
                adminComponentName,
                packageName,
                Manifest.permission.READ_PHONE_STATE,
                DevicePolicyManager.PERMISSION_GRANT_STATE_GRANTED
            )

            // Grant PACKAGE_USAGE_STATS for foreground app detection
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP_MR1) {
                dpm.setPermissionGrantState(
                    adminComponentName,
                    packageName,
                    Manifest.permission.PACKAGE_USAGE_STATS,
                    DevicePolicyManager.PERMISSION_GRANT_STATE_GRANTED
                )
            }
        }
    }

    override fun onDisabled(context: Context, intent: Intent) {
        super.onDisabled(context, intent)
        Log.d(TAG, "Device admin disabled")
    }

    override fun onLockTaskModeEntering(context: Context, intent: Intent, pkg: String) {
        super.onLockTaskModeEntering(context, intent, pkg)
        Log.d(TAG, "Lock task mode entering: $pkg")
    }

    override fun onLockTaskModeExiting(context: Context, intent: Intent) {
        super.onLockTaskModeExiting(context, intent)
        Log.d(TAG, "Lock task mode exiting")
    }

    companion object {
        private const val TAG = "DeviceOwnerReceiver"

        fun getComponentName(context: Context): ComponentName {
            return ComponentName(context, DeviceOwnerReceiver::class.java)
        }
    }
}
