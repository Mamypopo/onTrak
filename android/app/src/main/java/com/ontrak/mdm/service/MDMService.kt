package com.ontrak.mdm.service

import android.annotation.SuppressLint
import android.app.*
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.location.Location
import android.media.AudioManager
import android.net.wifi.WifiManager
import android.os.BatteryManager
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import android.os.SystemClock
import android.util.Log
import androidx.core.app.NotificationCompat
import com.google.android.gms.location.*
import com.ontrak.mdm.R
import com.ontrak.mdm.model.*
import com.ontrak.mdm.mqtt.MQTTManager
import com.ontrak.mdm.ui.MainActivity
import com.ontrak.mdm.util.DeviceInfo
import com.ontrak.mdm.util.SystemMetrics
import kotlinx.coroutines.*

class MDMService : Service() {

    private val serviceScope = CoroutineScope(Dispatchers.Default + SupervisorJob())
    private var mqttManager: MQTTManager? = null
    private lateinit var fusedLocationClient: FusedLocationProviderClient
    private var locationCallback: LocationCallback? = null
    private var wakeLock: PowerManager.WakeLock? = null
    private val deviceId: String by lazy {
        try {
            DeviceInfo.getDeviceId(this)
        } catch (e: Exception) {
            Log.e(TAG, "Error getting device ID", e)
            "unknown"
        }
    }

    private val heartbeatInterval = 10_000L // 10 seconds
    private val statusInterval = 30_000L // 30 seconds
    private val locationInterval = 60_000L // 60 seconds
    private val metricsInterval = 60_000L // 60 seconds

    override fun onCreate() {
        super.onCreate()
        Log.d(TAG, "MDMService onCreate - START")

        try {
            Log.d(TAG, "Creating notification channel...")
            createNotificationChannel()
            Log.d(TAG, "Starting foreground service...")
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                    startForeground(
                        NOTIFICATION_ID,
                        createNotification(),
                        android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION
                    )
                    Log.d(TAG, "Foreground service started with LOCATION type")
                } else {
                    startForeground(NOTIFICATION_ID, createNotification())
                    Log.d(TAG, "Foreground service started (pre-Android 13)")
                }
            } catch (e: Exception) {
                Log.e(TAG, "startForeground failed, continue as background service", e)
            }

            Log.d(TAG, "Getting MQTTManager instance...")
            mqttManager = MQTTManager.getInstance(this)
            Log.d(TAG, "MQTTManager instance obtained")

            Log.d(TAG, "Getting FusedLocationProviderClient...")
            fusedLocationClient = LocationServices.getFusedLocationProviderClient(this)
            Log.d(TAG, "FusedLocationProviderClient obtained")

            try {
                val powerManager = getSystemService(POWER_SERVICE) as PowerManager
                wakeLock = powerManager.newWakeLock(
                    PowerManager.PARTIAL_WAKE_LOCK,
                    "OnTrakMDM::LocationWakeLock"
                ).apply {
                    acquire(10 * 60 * 60 * 1000L /*10 hours*/)
                    Log.d(TAG, "WakeLock acquired")
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error acquiring wake lock", e)
            }

            Log.d(TAG, "Setting up location updates...")
            setupLocationUpdates()

            Log.d(TAG, "Connecting to MQTT...")
            connectMQTT()

            Log.d(TAG, "Starting data collection...")
            startDataCollection()

            Log.d(TAG, "MDMService onCreate completed successfully")
        } catch (e: Exception) {
            Log.e(TAG, "Error in MDMService onCreate", e)
            e.printStackTrace()
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        Log.d(TAG, "MDMService onStartCommand")

        intent?.action?.let { action ->
            if (action == ACTION_SEND_DATA_NOW) {
                Log.d(TAG, "Received request to send data now")
                serviceScope.launch {
                    publishStatus()
                    requestLocationUpdate()
                    publishMetrics()
                }
            }
        }

        return START_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun createNotificationChannel() {
        val channel = NotificationChannel(
            CHANNEL_ID,
            "MDM Service Channel",
            NotificationManager.IMPORTANCE_LOW
        ).apply {
            description = "OnTrak MDM Service"
            setShowBadge(false)
        }

        val notificationManager = getSystemService(NotificationManager::class.java)
        notificationManager.createNotificationChannel(channel)
    }

    private fun createNotification(): Notification {
        val intent = Intent(this, MainActivity::class.java)
        val pendingIntent = PendingIntent.getActivity(
            this, 0, intent,
            PendingIntent.FLAG_IMMUTABLE
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(getString(R.string.service_notification_title))
            .setContentText(getString(R.string.service_notification_text))
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
    }

    private fun connectMQTT() {
        try {
            Log.d(TAG, "connectMQTT() called")
            mqttManager?.connect()
            Log.d(TAG, "mqttManager.connect() called")
        } catch (e: Exception) {
            Log.e(TAG, "Error in connectMQTT()", e)
            e.printStackTrace()
        }
    }

    private fun setupLocationUpdates() {
        val locationRequest = LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, locationInterval)
            .setWaitForAccurateLocation(false)
            .setMinUpdateIntervalMillis(locationInterval / 2)
            .setMaxUpdateDelayMillis(locationInterval * 2)
            .build()

        locationCallback = object : LocationCallback() {
            override fun onLocationResult(locationResult: LocationResult) {
                locationResult.lastLocation?.let {
                    Log.d(TAG, "Location update received via callback: lat=${it.latitude}, lng=${it.longitude}")
                    publishLocation(it)
                }
            }
        }

        try {
            if (checkSelfPermission(android.Manifest.permission.ACCESS_FINE_LOCATION) ==
                android.content.pm.PackageManager.PERMISSION_GRANTED) {
                fusedLocationClient.requestLocationUpdates(
                    locationRequest,
                    locationCallback!!,
                    mainLooper
                )
                Log.d(TAG, "Requested location updates")
            } else {
                Log.w(TAG, "Location permission not granted, cannot request updates")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error setting up location updates", e)
        }
    }

    private fun startDataCollection() {
        serviceScope.launch {
            while (isActive) {
                delay(heartbeatInterval)
                publishHeartbeat()
            }
        }

        serviceScope.launch {
            while (isActive) {
                delay(statusInterval)
                publishStatus()
            }
        }

        serviceScope.launch {
            while (isActive) {
                delay(locationInterval)
                requestLocationUpdate()
            }
        }

        serviceScope.launch {
            while (isActive) {
                delay(metricsInterval)
                publishMetrics()
            }
        }
    }

    private fun publishHeartbeat() {
        // Not needed, status updates are sufficient
    }

    @SuppressLint("MissingPermission")
    private fun publishStatus() {
        try {
            val batteryManager = getSystemService(BATTERY_SERVICE) as BatteryManager
            val batteryLevel = batteryManager.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY)

            val batteryIntent = registerReceiver(null, IntentFilter(Intent.ACTION_BATTERY_CHANGED))
            val isCharging = batteryIntent?.getIntExtra(BatteryManager.EXTRA_STATUS, -1) == BatteryManager.BATTERY_STATUS_CHARGING

            val batteryHealth = try {
                when (batteryIntent?.getIntExtra(BatteryManager.EXTRA_HEALTH, -1)) {
                    BatteryManager.BATTERY_HEALTH_GOOD -> "GOOD"
                    BatteryManager.BATTERY_HEALTH_OVERHEAT -> "OVERHEAT"
                    BatteryManager.BATTERY_HEALTH_DEAD -> "DEAD"
                    BatteryManager.BATTERY_HEALTH_OVER_VOLTAGE -> "OVER_VOLTAGE"
                    BatteryManager.BATTERY_HEALTH_UNSPECIFIED_FAILURE -> "FAILURE"
                    BatteryManager.BATTERY_HEALTH_COLD -> "COLD"
                    else -> "UNKNOWN"
                }
            } catch (_: Exception) { "UNKNOWN" }

            val chargingMethod = try {
                when (batteryIntent?.getIntExtra(BatteryManager.EXTRA_PLUGGED, -1)) {
                    BatteryManager.BATTERY_PLUGGED_USB -> "USB"
                    BatteryManager.BATTERY_PLUGGED_AC -> "AC"
                    BatteryManager.BATTERY_PLUGGED_WIRELESS -> "WIRELESS"
                    else -> if (isCharging) "UNKNOWN" else "NONE"
                }
            } catch (_: Exception) { if (isCharging) "UNKNOWN" else "NONE" }

            val wifiManager = applicationContext.getSystemService(WIFI_SERVICE) as WifiManager
            @Suppress("DEPRECATION")
            val wifiStatus = wifiManager.isWifiEnabled

            val connectivityManager = getSystemService(CONNECTIVITY_SERVICE) as android.net.ConnectivityManager
            val mobileDataEnabled = {
                val network = connectivityManager.activeNetwork
                val capabilities = connectivityManager.getNetworkCapabilities(network)
                capabilities != null && capabilities.hasTransport(android.net.NetworkCapabilities.TRANSPORT_CELLULAR)
            }

            val networkConnected = try {
                val network = connectivityManager.activeNetwork
                val capabilities = connectivityManager.getNetworkCapabilities(network)
                capabilities != null && (
                    capabilities.hasTransport(android.net.NetworkCapabilities.TRANSPORT_WIFI) ||
                        capabilities.hasTransport(android.net.NetworkCapabilities.TRANSPORT_CELLULAR) ||
                        capabilities.hasTransport(android.net.NetworkCapabilities.TRANSPORT_ETHERNET)
                    )
            } catch (_: Exception) { wifiStatus }

            val uptime = SystemClock.elapsedRealtime()

            val screenOn = (getSystemService(POWER_SERVICE) as PowerManager).isInteractive

            val volumeLevel = DeviceInfo.getVolumeLevels(this)

            val bluetoothEnabled = android.bluetooth.BluetoothAdapter.getDefaultAdapter()?.isEnabled == true
            val installedApps = DeviceInfo.getInstalledApps(this)
            val installedAppsCount = installedApps.size
            val bootTime = System.currentTimeMillis() - uptime

            val serialNumber = try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    Build.getSerial()
                } else {
                    @Suppress("DEPRECATION")
                    Build.SERIAL
                }
            } catch (e: SecurityException) {
                Log.w(TAG, "Failed to get serial number. App is likely not a device owner.")
                "unknown"
            }

            val osVersion = Build.VERSION.RELEASE
            val deviceModel = Build.MODEL
            val brand = Build.BRAND
            val isRooted = DeviceInfo.isDeviceRooted()
            val securityPatch = DeviceInfo.getSecurityPatch()
            val encryptionStatus = DeviceInfo.getEncryptionStatus(this)
            val simOperator = DeviceInfo.getSimOperator(this)
            val ipAddress = DeviceInfo.getIpAddress(this)
            val macAddress = DeviceInfo.getMacAddress(this)
            val timezone = DeviceInfo.getTimezone()
            val locale = DeviceInfo.getLocale()
            val nfcEnabled = DeviceInfo.isNfcEnabled(this)
            val isScreenLockEnabled = DeviceInfo.isScreenLockEnabled(this)
            val isDeveloperModeEnabled = DeviceInfo.isDeveloperModeEnabled(this)
            val isVpnActive = DeviceInfo.isVpnActive(this)
            val ssid = DeviceInfo.getSsid(this)
            val cellularSignalStrength = DeviceInfo.getCellularSignalStrength(this)
            val wifiSignalStrength = DeviceInfo.getWifiSignalStrength(this)
            val isAirplaneModeEnabled = DeviceInfo.isAirplaneModeEnabled(this)
            val isPowerSaveModeEnabled = DeviceInfo.isPowerSaveModeEnabled(this)
            val screenBrightness = DeviceInfo.getScreenBrightness(this)
            val isAutoScreenBrightnessEnabled = DeviceInfo.isAutoScreenBrightnessEnabled(this)
            val ringerMode = DeviceInfo.getRingerMode(this)
            val batteryTemperature = DeviceInfo.getBatteryTemperature(this)
            val dndMode = DeviceInfo.getDndMode(this)

            val status = DeviceStatus(
                deviceId = deviceId,
                serialNumber = serialNumber,
                osVersion = osVersion,
                deviceModel = deviceModel,
                brand = brand,
                isRooted = isRooted,
                securityPatch = securityPatch,
                encryptionStatus = encryptionStatus,
                simOperator = simOperator,
                ipAddress = ipAddress,
                macAddress = macAddress,
                timezone = timezone,
                locale = locale,
                nfcEnabled = nfcEnabled,
                isScreenLockEnabled = isScreenLockEnabled,
                isDeveloperModeEnabled = isDeveloperModeEnabled,
                isVpnActive = isVpnActive,
                installedApps = installedApps,
                ssid = ssid,
                cellularSignalStrength = cellularSignalStrength,
                wifiSignalStrength = wifiSignalStrength,
                isAirplaneModeEnabled = isAirplaneModeEnabled,
                isPowerSaveModeEnabled = isPowerSaveModeEnabled,
                screenBrightness = screenBrightness,
                isAutoScreenBrightnessEnabled = isAutoScreenBrightnessEnabled,
                ringerMode = ringerMode,
                dndMode = dndMode,
                battery = batteryLevel,
                wifiStatus = wifiStatus,
                uptime = uptime,
                isCharging = isCharging,
                batteryHealth = batteryHealth,
                chargingMethod = chargingMethod,
                batteryTemperature = batteryTemperature,
                batteryCycleCount = null,
                mobileDataEnabled = mobileDataEnabled(),
                networkConnected = networkConnected,
                screenOn = screenOn,
                volumeLevels = volumeLevel,
                bluetoothEnabled = bluetoothEnabled,
                installedAppsCount = installedAppsCount,
                bootTime = bootTime
            )

            Log.d(TAG, "Prepared DeviceStatus: $status")
            mqttManager?.publishStatus(status)
        } catch (e: Exception) {
            Log.e(TAG, "Error publishing status", e)
        }
    }

    private fun requestLocationUpdate() {
        try {
            if (checkSelfPermission(android.Manifest.permission.ACCESS_FINE_LOCATION) != android.content.pm.PackageManager.PERMISSION_GRANTED) {
                Log.w(TAG, "Location permission not granted")
                return
            }

            Log.d(TAG, "Requesting current location...")
            fusedLocationClient.getCurrentLocation(Priority.PRIORITY_HIGH_ACCURACY, null)
                .addOnCompleteListener { task ->
                    if (task.isSuccessful && task.result != null) {
                        val location = task.result
                        Log.d(TAG, "Current location obtained: lat=${location.latitude}, lng=${location.longitude}, accuracy=${location.accuracy}")
                        publishLocation(location)
                    } else {
                        Log.w(TAG, "Failed to get current location, trying last known location.", task.exception)
                        // Fallback to last known location
                        fusedLocationClient.lastLocation.addOnSuccessListener { lastLocation: Location? ->
                            if (lastLocation != null) {
                                Log.d(TAG, "Last known location obtained as fallback: lat=${lastLocation.latitude}, lng=${lastLocation.longitude}, accuracy=${lastLocation.accuracy}")
                                publishLocation(lastLocation)
                            } else {
                                Log.w(TAG, "Failed to get any location.")
                            }
                        }
                    }
                }
        } catch (e: Exception) {
            Log.e(TAG, "Error requesting location update", e)
        }
    }

    private fun publishLocation(location: Location) {
        try {
            val deviceLocation = DeviceLocation(
                deviceId = deviceId,
                latitude = location.latitude,
                longitude = location.longitude,
                accuracy = location.accuracy
            )
            Log.d(TAG, "Publishing location: lat=${location.latitude}, lng=${location.longitude}")
            mqttManager?.publishLocation(deviceLocation)
            Log.d(TAG, "Location published successfully")
        } catch (e: Exception) {
            Log.e(TAG, "Error publishing location", e)
        }
    }

    private fun publishMetrics() {
        try {
            val cpu = SystemMetrics.getCpuUsage()
            val (totalMem, usedMem, availableMem) = SystemMetrics.getMemoryInfo(this)
            val (totalStorage, usedStorage, availableStorage) = SystemMetrics.getStorageInfo(this)
            val networkType = SystemMetrics.getNetworkType(this)
            val foregroundApp = SystemMetrics.getForegroundApp(this)

            val metrics = DeviceMetrics(
                deviceId = deviceId,
                cpu = cpu,
                memory = DeviceMemory(total = totalMem, used = usedMem, available = availableMem),
                storage = DeviceStorage(total = totalStorage, used = usedStorage, available = availableStorage),
                networkType = networkType,
                foregroundApp = foregroundApp
            )
            mqttManager?.publishMetrics(metrics)
        } catch (e: Exception) {
            Log.e(TAG, "Error publishing metrics", e)
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        Log.d(TAG, "MDMService onDestroy")
        try {
            serviceScope.cancel()

            locationCallback?.let {
                try {
                    fusedLocationClient.removeLocationUpdates(it)
                    Log.d(TAG, "Location updates removed")
                } catch (e: Exception) {
                    Log.e(TAG, "Error removing location updates", e)
                }
            }

            wakeLock?.let {
                if (it.isHeld) {
                    it.release()
                    Log.d(TAG, "WakeLock released")
                }
            }

            mqttManager?.disconnect()

            val restartIntent = Intent(this, MDMService::class.java)
            val pendingIntent = PendingIntent.getService(
                this, 0, restartIntent,
                PendingIntent.FLAG_ONE_SHOT or PendingIntent.FLAG_IMMUTABLE
            )
            val alarmManager = getSystemService(ALARM_SERVICE) as AlarmManager
            alarmManager.set(AlarmManager.ELAPSED_REALTIME, 1000, pendingIntent)
        } catch (e: Exception) {
            Log.e(TAG, "Error in onDestroy", e)
        }
    }

    companion object {
        private const val TAG = "MDMService"
        private const val CHANNEL_ID = "mdm_service_channel"
        private const val NOTIFICATION_ID = 1
        const val ACTION_SEND_DATA_NOW = "com.ontrak.mdm.service.ACTION_SEND_DATA_NOW"
    }
}
