package com.ontrak.mdm.ui

import android.app.Activity
import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Intent
import android.os.Bundle
import android.util.Log
import com.ontrak.mdm.receiver.DeviceOwnerReceiver

/**
 * Activity for setting up Device Owner mode via ADB or QR code
 * This should be called during device provisioning
 */
class DeviceOwnerProvisioningActivity : Activity() {
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        val dpm = getSystemService(DevicePolicyManager::class.java)
        val adminComponent = ComponentName(this, DeviceOwnerReceiver::class.java)
        
        try {
            if (!dpm.isDeviceOwnerApp(packageName)) {
                // Try to set as device owner
                if (dpm.isProvisioningAllowed(DevicePolicyManager.ACTION_PROVISION_MANAGED_DEVICE)) {
                    val intent = Intent(DevicePolicyManager.ACTION_PROVISION_MANAGED_DEVICE).apply {
                        putExtra(DevicePolicyManager.EXTRA_PROVISIONING_DEVICE_ADMIN_COMPONENT_NAME, adminComponent)
                    }
                    startActivityForResult(intent, REQUEST_CODE_PROVISION)
                } else {
                    Log.w(TAG, "Provisioning not allowed. Use ADB command instead.")
                    finish()
                }
            } else {
                Log.d(TAG, "Already device owner")
                finish()
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error setting up device owner", e)
            finish()
        }
    }
    
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        
        if (requestCode == REQUEST_CODE_PROVISION) {
            if (resultCode == RESULT_OK) {
                Log.d(TAG, "Device owner setup successful")
            } else {
                Log.w(TAG, "Device owner setup failed")
            }
            finish()
        }
    }
    
    companion object {
        private const val TAG = "DeviceOwnerProvisioning"
        private const val REQUEST_CODE_PROVISION = 1001
    }
}

