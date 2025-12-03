package com.ontrak.mdm.service

import android.app.*
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.media.AudioManager
import android.net.wifi.WifiManager
import android.os.BatteryManager
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import android.os.SystemClock
import android.util.Log
import androidx.core.app.NotificationCompat
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
    private lateinit var locationManager: LocationManager
    private var locationListener: LocationListener? = null
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
                    // Android 13+ requires foreground service type
                    // Use LOCATION type for location tracking (required for background location)
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
                // บนอีมูเลเตอร์ / Android 14 อาจบล็อค startForeground ถ้ามองว่าเริ่มจาก background
                // ให้รันต่อโดยไม่ crash (service จะเป็น background service แทน)
                Log.e(TAG, "startForeground failed, continue as background service", e)
            }
            
            Log.d(TAG, "Getting MQTTManager instance...")
            mqttManager = MQTTManager.getInstance(this)
            Log.d(TAG, "MQTTManager instance obtained")
            
            Log.d(TAG, "Getting LocationManager...")
            locationManager = getSystemService(Context.LOCATION_SERVICE) as LocationManager
            Log.d(TAG, "LocationManager obtained")
            
            // Acquire wake lock to prevent service from being killed
            try {
                val powerManager = getSystemService(Context.POWER_SERVICE) as PowerManager
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
            
            Log.d(TAG, "Setting up location listener...")
            setupLocationListener()
            
            Log.d(TAG, "Connecting to MQTT...")
            connectMQTT()
            
            Log.d(TAG, "Starting data collection...")
            startDataCollection()
            
            Log.d(TAG, "MDMService onCreate completed successfully")
        } catch (e: Exception) {
            Log.e(TAG, "Error in MDMService onCreate", e)
            e.printStackTrace()
            // Don't crash, just log the error
        }
    }
    
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        Log.d(TAG, "MDMService onStartCommand")
        return START_STICKY // Auto-restart if killed
    }
    
    override fun onBind(intent: Intent?): IBinder? = null
    
    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
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
    
    private fun setupLocationListener() {
        try {
            locationListener = object : LocationListener {
                override fun onLocationChanged(location: Location) {
                    publishLocation(location)
                }
                
                override fun onProviderEnabled(provider: String) {}
                override fun onProviderDisabled(provider: String) {}
            }
            
            if (checkSelfPermission(android.Manifest.permission.ACCESS_FINE_LOCATION) == 
                android.content.pm.PackageManager.PERMISSION_GRANTED) {
                locationManager.requestLocationUpdates(
                    LocationManager.GPS_PROVIDER,
                    locationInterval,
                    10f,
                    locationListener!!
                )
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error setting up location listener", e)
        }
    }
    
    private fun startDataCollection() {
        // Heartbeat every 10 seconds
        serviceScope.launch {
            while (isActive) {
                delay(heartbeatInterval)
                publishHeartbeat()
            }
        }
        
        // Status every 30 seconds
        serviceScope.launch {
            while (isActive) {
                delay(statusInterval)
                publishStatus()
            }
        }
        
        // Location every 60 seconds (also handled by LocationListener)
        serviceScope.launch {
            while (isActive) {
                delay(locationInterval)
                requestLocationUpdate()
            }
        }
        
        // Metrics every 60 seconds
        serviceScope.launch {
            while (isActive) {
                delay(metricsInterval)
                publishMetrics()
            }
        }
    }
    
    private fun publishHeartbeat() {
        // Heartbeat ไม่จำเป็นต้องส่ง event
        // Status update (publishStatus) ก็เพียงพอแล้วสำหรับการตรวจสอบว่า device ยัง online อยู่
        // ไม่ส่ง BOOT event เพราะจะทำให้ log เยอะเกินไป
    }
    
    private fun publishStatus() {
        try {
            val batteryManager = getSystemService(Context.BATTERY_SERVICE) as BatteryManager
            val batteryLevel = batteryManager.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY)
            
            // Battery charging status and health
            val batteryIntent = registerReceiver(null, android.content.IntentFilter(android.content.Intent.ACTION_BATTERY_CHANGED))
            val isCharging = batteryIntent?.getIntExtra(android.os.BatteryManager.EXTRA_STATUS, -1) == BatteryManager.BATTERY_STATUS_CHARGING
            
            val batteryHealth = try {
                val health = batteryIntent?.getIntExtra(android.os.BatteryManager.EXTRA_HEALTH, -1) ?: -1
                when (health) {
                    BatteryManager.BATTERY_HEALTH_GOOD -> "GOOD"
                    BatteryManager.BATTERY_HEALTH_OVERHEAT -> "OVERHEAT"
                    BatteryManager.BATTERY_HEALTH_DEAD -> "DEAD"
                    BatteryManager.BATTERY_HEALTH_OVER_VOLTAGE -> "OVER_VOLTAGE"
                    BatteryManager.BATTERY_HEALTH_UNSPECIFIED_FAILURE -> "FAILURE"
                    BatteryManager.BATTERY_HEALTH_COLD -> "COLD"
                    else -> "UNKNOWN"
                }
            } catch (e: Exception) {
                "UNKNOWN"
            }
            
            // Charging method
            val chargingMethod = try {
                val plugged = batteryIntent?.getIntExtra(android.os.BatteryManager.EXTRA_PLUGGED, -1) ?: -1
                when (plugged) {
                    BatteryManager.BATTERY_PLUGGED_USB -> "USB"
                    BatteryManager.BATTERY_PLUGGED_AC -> "AC"
                    BatteryManager.BATTERY_PLUGGED_WIRELESS -> "WIRELESS"
                    else -> if (isCharging) "UNKNOWN" else "NONE"
                }
            } catch (e: Exception) {
                if (isCharging) "UNKNOWN" else "NONE"
            }
            
            val wifiManager = applicationContext.getSystemService(Context.WIFI_SERVICE) as WifiManager
            @Suppress("DEPRECATION")
            val wifiStatus = wifiManager.isWifiEnabled
            
            // Mobile data status (requires READ_PHONE_STATE permission on some devices)
            val mobileDataEnabled = try {
                val connectivityManager = getSystemService(Context.CONNECTIVITY_SERVICE) as android.net.ConnectivityManager
                if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
                    // Android 6.0+ - use activeNetwork
                    val activeNetwork = connectivityManager.activeNetwork
                    val networkCapabilities = connectivityManager.getNetworkCapabilities(activeNetwork)
                    networkCapabilities != null && networkCapabilities.hasTransport(android.net.NetworkCapabilities.TRANSPORT_CELLULAR)
                } else {
                    // Android 5.x - use deprecated method
                    @Suppress("DEPRECATION")
                    val networkInfo = connectivityManager.getNetworkInfo(android.net.ConnectivityManager.TYPE_MOBILE)
                    networkInfo?.isConnected == true
                }
            } catch (e: Exception) {
                false
            }
            
            // Overall network connection status
            val networkConnected = try {
                val connectivityManager = getSystemService(Context.CONNECTIVITY_SERVICE) as android.net.ConnectivityManager
                val activeNetwork = connectivityManager.activeNetwork
                val networkCapabilities = connectivityManager.getNetworkCapabilities(activeNetwork)
                networkCapabilities != null && (
                    networkCapabilities.hasTransport(android.net.NetworkCapabilities.TRANSPORT_WIFI) ||
                    networkCapabilities.hasTransport(android.net.NetworkCapabilities.TRANSPORT_CELLULAR) ||
                    networkCapabilities.hasTransport(android.net.NetworkCapabilities.TRANSPORT_ETHERNET)
                )
            } catch (e: Exception) {
                wifiStatus // Fallback to WiFi status
            }
            
            val uptime = SystemClock.elapsedRealtime()
            
            // Screen on/off status
            val screenOn = try {
                val powerManager = getSystemService(Context.POWER_SERVICE) as PowerManager
                powerManager.isInteractive
            } catch (e: Exception) {
                false
            }
            
            // Volume level (notification stream)
            val volumeLevel = try {
                val audioManager = getSystemService(Context.AUDIO_SERVICE) as AudioManager
                val maxVolume = audioManager.getStreamMaxVolume(AudioManager.STREAM_NOTIFICATION)
                val currentVolume = audioManager.getStreamVolume(AudioManager.STREAM_NOTIFICATION)
                // Return as percentage (0-100)
                if (maxVolume > 0) (currentVolume * 100 / maxVolume) else 0
            } catch (e: Exception) {
                0
            }
            
            // Bluetooth status
            val bluetoothEnabled = try {
                val bluetoothAdapter = android.bluetooth.BluetoothAdapter.getDefaultAdapter()
                bluetoothAdapter?.isEnabled == true
            } catch (e: Exception) {
                false
            }
            
            // Installed apps count
            val installedAppsCount = try {
                val packageManager = packageManager
                packageManager.getInstalledPackages(0).size
            } catch (e: Exception) {
                0
            }
            
            // Boot time (current time - uptime)
            val bootTime = System.currentTimeMillis() - uptime
            
            val status = DeviceStatus(
                deviceId = deviceId,
                battery = batteryLevel,
                wifiStatus = wifiStatus,
                uptime = uptime,
                isCharging = isCharging,
                batteryHealth = batteryHealth,
                chargingMethod = chargingMethod,
                mobileDataEnabled = mobileDataEnabled,
                networkConnected = networkConnected,
                screenOn = screenOn,
                volumeLevel = volumeLevel,
                bluetoothEnabled = bluetoothEnabled,
                installedAppsCount = installedAppsCount,
                bootTime = bootTime
            )
            
            mqttManager?.publishStatus(status)
        } catch (e: Exception) {
            Log.e(TAG, "Error publishing status", e)
        }
    }
    
    private fun requestLocationUpdate() {
        try {
            if (checkSelfPermission(android.Manifest.permission.ACCESS_FINE_LOCATION) == 
                android.content.pm.PackageManager.PERMISSION_GRANTED) {
                Log.d(TAG, "Requesting location update...")
                
                // Try GPS first
                var location = locationManager.getLastKnownLocation(LocationManager.GPS_PROVIDER)
                
                // Fallback to Network Provider if GPS is not available
                if (location == null) {
                    Log.d(TAG, "GPS location not available, trying Network...")
                    location = locationManager.getLastKnownLocation(LocationManager.NETWORK_PROVIDER)
                }
                
                // Fallback to Passive Provider as last resort
                if (location == null) {
                    Log.d(TAG, "Network location not available, trying Passive...")
                    location = locationManager.getLastKnownLocation(LocationManager.PASSIVE_PROVIDER)
                }
                
                if (location != null) {
                    Log.d(TAG, "Location obtained: lat=${location.latitude}, lng=${location.longitude}, accuracy=${location.accuracy}")
                    publishLocation(location)
                } else {
                    Log.w(TAG, "No location available from any provider")
                }
            } else {
                Log.w(TAG, "Location permission not granted")
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
                memory = DeviceMemory(
                    total = totalMem,
                    used = usedMem,
                    available = availableMem
                ),
                storage = DeviceStorage(
                    total = totalStorage,
                    used = usedStorage,
                    available = availableStorage
                ),
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
            
            locationListener?.let {
                try {
                    locationManager.removeUpdates(it)
                    Log.d(TAG, "Location updates removed")
                } catch (e: Exception) {
                    Log.e(TAG, "Error removing location updates", e)
                }
            }
            
            // Release wake lock (avoid using if as expression)
            wakeLock?.let { wl ->
                try {
                    if (wl.isHeld) {
                        wl.release()
                        Log.d(TAG, "WakeLock released")
                    } else {
                        Log.d(TAG, "WakeLock not held, no need to release")
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Error releasing wake lock", e)
                }
            }
            
            mqttManager?.disconnect()
            
            // Auto-restart service using AlarmManager
            val restartIntent = Intent(this, MDMService::class.java)
            val pendingIntent = PendingIntent.getService(
                this, 0, restartIntent,
                PendingIntent.FLAG_ONE_SHOT or PendingIntent.FLAG_IMMUTABLE
            )
            val alarmManager = getSystemService(Context.ALARM_SERVICE) as AlarmManager
            alarmManager.set(AlarmManager.ELAPSED_REALTIME, 1000, pendingIntent)
        } catch (e: Exception) {
            Log.e(TAG, "Error in onDestroy", e)
        }
    }
    
    companion object {
        private const val TAG = "MDMService"
        private const val CHANNEL_ID = "mdm_service_channel"
        private const val NOTIFICATION_ID = 1
    }
}

