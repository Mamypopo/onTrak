package com.ontrak.mdm.ui

import android.Manifest
import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.util.Log
import android.widget.Button
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.ontrak.mdm.R
import com.ontrak.mdm.mqtt.MQTTManager
import com.ontrak.mdm.receiver.DeviceOwnerReceiver
import com.ontrak.mdm.service.MDMService
import com.ontrak.mdm.util.DeviceInfo
import com.ontrak.mdm.util.KioskModeManager

class MainActivity : AppCompatActivity() {

    private lateinit var deviceIdText: TextView
    private lateinit var deviceOwnerStatusText: TextView
    private lateinit var mqttStatusText: TextView
    private lateinit var startServiceButton: Button
    private lateinit var enableKioskButton: Button
    private lateinit var disableKioskButton: Button

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        try {
            Log.d(TAG, "MainActivity onCreate started")
            setContentView(R.layout.activity_main)
            Log.d(TAG, "setContentView completed")

            initViews()
            Log.d(TAG, "initViews completed")

            setupClickListeners()
            Log.d(TAG, "setupClickListeners completed")

            checkDeviceOwnerStatus()
            Log.d(TAG, "checkDeviceOwnerStatus completed")

            // Request all necessary permissions on startup
            requestPermissions()

            // Initialize MQTT status
            updateMQTTStatus()

            // Start service in background to avoid blocking UI
            // Delay service start to avoid blocking UI thread
            android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
                startMDMService()
            }, 500)

            // Update MQTT status every 2 seconds
            android.os.Handler(android.os.Looper.getMainLooper()).postDelayed(object : Runnable {
                override fun run() {
                    updateMQTTStatus()
                    android.os.Handler(android.os.Looper.getMainLooper()).postDelayed(this, 2000)
                }
            }, 2000)

            Log.d(TAG, "MainActivity onCreate completed successfully")
        } catch (e: Exception) {
            Log.e(TAG, "FATAL ERROR in onCreate", e)
            e.printStackTrace()
            // Show error and finish
            try {
                Toast.makeText(this, "Error: ${e.message}", Toast.LENGTH_LONG).show()
            } catch (toastError: Exception) {
                Log.e(TAG, "Error showing toast", toastError)
            }
            // Don't finish immediately, let user see the error
            // finish()
        }
    }

    private fun initViews() {
        try {
            deviceIdText = findViewById(R.id.deviceIdText)
            deviceOwnerStatusText = findViewById(R.id.deviceOwnerStatusText)
            mqttStatusText = findViewById(R.id.mqttStatusText)
            startServiceButton = findViewById(R.id.startServiceButton)
            enableKioskButton = findViewById(R.id.enableKioskButton)
            disableKioskButton = findViewById(R.id.disableKioskButton)

            try {
                deviceIdText.text = "Device ID: ${DeviceInfo.getDeviceId(this)}"
            } catch (e: Exception) {
                Log.e(TAG, "Error getting device ID", e)
                deviceIdText.text = "Device ID: Unknown"
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error in initViews", e)
            throw e
        }
    }

    private fun setupClickListeners() {
        startServiceButton.setOnClickListener {
            startMDMService()
        }

        enableKioskButton.setOnClickListener {
            enableKioskMode()
        }

        disableKioskButton.setOnClickListener {
            disableKioskMode()
        }
    }

    private fun checkDeviceOwnerStatus() {
        try {
            val dpm = getSystemService(DevicePolicyManager::class.java)
            val adminComponent = ComponentName(this, DeviceOwnerReceiver::class.java)
            val isDeviceOwner = dpm.isDeviceOwnerApp(packageName)

            deviceOwnerStatusText.text = if (isDeviceOwner) {
                "Device Owner: Enabled"
            } else {
                "Device Owner: Disabled\n(Required for full functionality)"
            }

            enableKioskButton.isEnabled = isDeviceOwner
            disableKioskButton.isEnabled = isDeviceOwner
        } catch (e: Exception) {
            Log.e(TAG, "Error checking device owner status", e)
            deviceOwnerStatusText.text = "Device Owner: Error\n${e.message}"
            enableKioskButton.isEnabled = false
            disableKioskButton.isEnabled = false
        }
    }

    private fun updateMQTTStatus() {
        try {
            val mqttManager = MQTTManager.getInstance(this)
            val isConnected = mqttManager.isConnected()
            mqttStatusText.text = if (isConnected) {
                "MQTT: Connected"
            } else {
                "MQTT: Disconnected"
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error updating MQTT status", e)
            mqttStatusText.text = "MQTT: Error"
        }
    }

    private fun startMDMService() {
        try {
            val serviceIntent = Intent(this, MDMService::class.java)
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                startForegroundService(serviceIntent)
            } else {
                startService(serviceIntent)
            }
            Toast.makeText(this, "MDM Service started", Toast.LENGTH_SHORT).show()
        } catch (e: Exception) {
            Log.e(TAG, "Error starting MDM service", e)
            Toast.makeText(this, "Error starting service: ${e.message}", Toast.LENGTH_SHORT).show()
        }
    }

    private fun enableKioskMode() {
        try {
            KioskModeManager.enableKioskMode(this)
            KioskModeManager.startLockTask(this)
            Toast.makeText(this, "Kiosk mode enabled", Toast.LENGTH_SHORT).show()
        } catch (e: Exception) {
            Log.e(TAG, "Error enabling kiosk mode", e)
            Toast.makeText(this, "Error: ${e.message}", Toast.LENGTH_SHORT).show()
        }
    }

    private fun disableKioskMode() {
        try {
            KioskModeManager.disableKioskMode(this)
            KioskModeManager.stopLockTask(this)
            Toast.makeText(this, "Kiosk mode disabled", Toast.LENGTH_SHORT).show()
        } catch (e: Exception) {
            Log.e(TAG, "Error disabling kiosk mode", e)
            Toast.makeText(this, "Error: ${e.message}", Toast.LENGTH_SHORT).show()
        }
    }

    override fun onBackPressed() {
        val dpm = getSystemService(DevicePolicyManager::class.java)
        if (dpm.isDeviceOwnerApp(packageName)) {
            // Prevent back button in kiosk mode
            return
        }
        super.onBackPressed()
    }

    private fun requestPermissions() {
        val permissionsToRequest = mutableListOf<String>()

        // Location
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            permissionsToRequest.add(Manifest.permission.ACCESS_FINE_LOCATION)
        }

        // Camera
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
            permissionsToRequest.add(Manifest.permission.CAMERA)
        }

        // Bluetooth
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.BLUETOOTH_CONNECT) != PackageManager.PERMISSION_GRANTED) {
                permissionsToRequest.add(Manifest.permission.BLUETOOTH_CONNECT)
            }
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.BLUETOOTH_SCAN) != PackageManager.PERMISSION_GRANTED) {
                permissionsToRequest.add(Manifest.permission.BLUETOOTH_SCAN)
            }
        }

        if (permissionsToRequest.isNotEmpty()) {
            ActivityCompat.requestPermissions(this, permissionsToRequest.toTypedArray(), PERMISSION_REQUEST_CODE)
        }
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == PERMISSION_REQUEST_CODE) {
            grantResults.forEachIndexed { index, result ->
                if (result != PackageManager.PERMISSION_GRANTED) {
                    Log.w(TAG, "Permission denied: ${permissions[index]}")
                    // Optionally, show a message to the user explaining why the permission is needed
                }
            }
        }
    }

    companion object {
        private const val TAG = "MainActivity"
        private const val PERMISSION_REQUEST_CODE = 1001
    }
}
