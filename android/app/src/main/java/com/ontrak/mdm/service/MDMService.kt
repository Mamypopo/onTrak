package com.ontrak.mdm.service

import android.app.*
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.net.wifi.WifiManager
import android.os.BatteryManager
import android.os.Build
import android.os.IBinder
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
                    // Using DATA_SYNC type to avoid location permission issues
                    startForeground(
                        NOTIFICATION_ID,
                        createNotification(),
                        android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC
                    )
                } else {
                    startForeground(NOTIFICATION_ID, createNotification())
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
        // Heartbeat is included in status, but we can send a simple event
        val event = DeviceEvent(
            deviceId = deviceId,
            eventType = EventType.BOOT,
            message = "Heartbeat"
        )
        mqttManager?.publishEvent(event)
    }
    
    private fun publishStatus() {
        try {
            val batteryManager = getSystemService(Context.BATTERY_SERVICE) as BatteryManager
            val batteryLevel = batteryManager.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY)
            
            val wifiManager = applicationContext.getSystemService(Context.WIFI_SERVICE) as WifiManager
            val wifiStatus = wifiManager.isWifiEnabled
            
            val uptime = SystemClock.elapsedRealtime()
            
            val status = DeviceStatus(
                deviceId = deviceId,
                battery = batteryLevel,
                wifiStatus = wifiStatus,
                uptime = uptime
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
                val lastLocation = locationManager.getLastKnownLocation(LocationManager.GPS_PROVIDER)
                if (lastLocation != null) {
                    publishLocation(lastLocation)
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
            
            mqttManager?.publishLocation(deviceLocation)
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
                } catch (e: Exception) {
                    Log.e(TAG, "Error removing location updates", e)
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

