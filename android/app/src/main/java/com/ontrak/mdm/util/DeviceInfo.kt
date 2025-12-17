package com.ontrak.mdm.util

import android.annotation.SuppressLint
import android.app.ActivityManager
import android.app.KeyguardManager
import android.app.NotificationManager
import android.app.admin.DevicePolicyManager
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothProfile
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.location.LocationManager
import android.media.AudioManager
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.net.wifi.WifiInfo
import android.net.wifi.WifiManager
import android.nfc.NfcAdapter
import android.os.BatteryManager
import android.os.Build
import android.os.Environment
import android.os.PowerManager
import android.os.StatFs
import android.os.SystemClock
import android.provider.Settings
import android.telephony.SignalStrength
import android.telephony.TelephonyManager
import android.util.Log
import androidx.annotation.RequiresApi
import com.ontrak.mdm.model.AppDetail
import com.ontrak.mdm.model.VolumeLevels
import com.ontrak.mdm.receiver.DeviceOwnerReceiver
import java.io.File
import java.io.IOException
import java.util.Date
import java.util.Locale
import java.util.TimeZone

object DeviceInfo {

    fun getDeviceId(context: Context): String {
        return Settings.Secure.getString(
            context.contentResolver,
            Settings.Secure.ANDROID_ID
        ) ?: Build.SERIAL
    }

    fun getDeviceModel(): String {
        return "${Build.MANUFACTURER} ${Build.MODEL}"
    }

    fun getOSVersion(): String {
        return "Android ${Build.VERSION.RELEASE} (SDK ${Build.VERSION.SDK_INT})"
    }

    fun getSerialNumber(): String {
        return Build.SERIAL
    }

    fun getSecurityPatch(): String? {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            Build.VERSION.SECURITY_PATCH
        } else {
            null
        }
    }

    fun getEncryptionStatus(context: Context): String {
        val dpm = context.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
        return when (dpm.storageEncryptionStatus) {
            DevicePolicyManager.ENCRYPTION_STATUS_UNSUPPORTED -> "UNSUPPORTED"
            DevicePolicyManager.ENCRYPTION_STATUS_INACTIVE -> "INACTIVE"
            DevicePolicyManager.ENCRYPTION_STATUS_ACTIVATING -> "ACTIVATING"
            DevicePolicyManager.ENCRYPTION_STATUS_ACTIVE -> "ACTIVE"
            DevicePolicyManager.ENCRYPTION_STATUS_ACTIVE_DEFAULT_KEY -> "ACTIVE_DEFAULT_KEY"
            DevicePolicyManager.ENCRYPTION_STATUS_ACTIVE_PER_USER -> "ACTIVE_PER_USER"
            else -> "UNKNOWN"
        }
    }

    fun getSimOperator(context: Context): String? {
        val telephonyManager = context.getSystemService(Context.TELEPHONY_SERVICE) as TelephonyManager
        return telephonyManager.simOperatorName
    }

    @SuppressLint("MissingPermission")
    fun getSimSerialNumber(context: Context): String? {
        val telephonyManager = context.getSystemService(Context.TELEPHONY_SERVICE) as TelephonyManager
        return try {
            telephonyManager.simSerialNumber
        } catch (e: SecurityException) {
            Log.w("DeviceInfo", "Failed to get SIM serial number. App might not be a device owner or lacks permissions.", e)
            null
        } catch (e: Exception) {
            Log.e("DeviceInfo", "An unexpected error occurred while getting SIM serial number.", e)
            null
        }
    }

    @SuppressLint("MissingPermission", "HardwareIds")
    fun getPhoneNumber(context: Context): String? {
        val telephonyManager = context.getSystemService(Context.TELEPHONY_SERVICE) as TelephonyManager
        return try {
            telephonyManager.line1Number
        } catch (e: SecurityException) {
            Log.w("DeviceInfo", "Failed to get phone number. App might not be a device owner or lacks permissions.", e)
            null
        } catch (e: Exception) {
            Log.e("DeviceInfo", "An unexpected error occurred while getting phone number.", e)
            null
        }
    }


    @SuppressLint("HardwareIds")
    fun getMacAddress(context: Context): String? {
        val wifiManager = context.applicationContext.getSystemService(Context.WIFI_SERVICE) as WifiManager
        return wifiManager.connectionInfo.macAddress
    }

    fun getIpAddress(context: Context): String? {
        val wifiManager = context.applicationContext.getSystemService(Context.WIFI_SERVICE) as WifiManager
        val ipAddress = wifiManager.connectionInfo.ipAddress
        return if (ipAddress == 0) null else String.format(
            "%d.%d.%d.%d",
            ipAddress and 0xff,
            ipAddress shr 8 and 0xff,
            ipAddress shr 16 and 0xff,
            ipAddress shr 24 and 0xff
        )
    }

    fun getTimezone(): String? {
        return TimeZone.getDefault().id
    }

    fun getLocale(): String? {
        return Locale.getDefault().toString()
    }

    fun isNfcEnabled(context: Context): Boolean {
        val nfcAdapter = NfcAdapter.getDefaultAdapter(context)
        return nfcAdapter?.isEnabled ?: false
    }

    fun isAdbEnabled(context: Context): Boolean {
        return Settings.Global.getInt(
            context.contentResolver,
            Settings.Global.ADB_ENABLED, 0
        ) == 1
    }

    fun isScreenLockEnabled(context: Context): Boolean {
        val keyguardManager = context.getSystemService(Context.KEYGUARD_SERVICE) as KeyguardManager
        return keyguardManager.isKeyguardSecure
    }

    fun isDeveloperModeEnabled(context: Context): Boolean {
        return Settings.Global.getInt(
            context.contentResolver,
            Settings.Global.DEVELOPMENT_SETTINGS_ENABLED, 0
        ) == 1
    }

    fun isVpnActive(context: Context): Boolean {
        val connectivityManager = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        val activeNetwork = connectivityManager.activeNetwork ?: return false
        val networkCapabilities = connectivityManager.getNetworkCapabilities(activeNetwork) ?: return false
        return networkCapabilities.hasTransport(NetworkCapabilities.TRANSPORT_VPN)
    }

    fun getInstalledAppDetails(context: Context): List<AppDetail> {
        val packageManager = context.packageManager
        val packages = packageManager.getInstalledApplications(PackageManager.GET_META_DATA)
        return packages
            .filter { (it.flags and ApplicationInfo.FLAG_SYSTEM) == 0 }
            .mapNotNull { appInfo ->
                try {
                    val packageInfo = packageManager.getPackageInfo(appInfo.packageName, 0)
                    AppDetail(
                        packageName = appInfo.packageName,
                        label = packageManager.getApplicationLabel(appInfo).toString(),
                        versionName = packageInfo.versionName,
                        versionCode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                            packageInfo.longVersionCode
                        } else {
                            @Suppress("DEPRECATION")
                            packageInfo.versionCode.toLong()
                        },
                        firstInstallTime = packageInfo.firstInstallTime,
                        lastUpdateTime = packageInfo.lastUpdateTime
                    )
                } catch (e: PackageManager.NameNotFoundException) {
                    null
                }
            }
    }

    fun getSsid(context: Context): String? {
        val wifiManager = context.applicationContext.getSystemService(Context.WIFI_SERVICE) as WifiManager
        return wifiManager.connectionInfo.ssid
    }

    @SuppressLint("MissingPermission")
    fun getCellularSignalStrength(context: Context): Int? {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            val telephonyManager = context.getSystemService(Context.TELEPHONY_SERVICE) as TelephonyManager
            val signalStrength = telephonyManager.signalStrength
            return signalStrength?.getCellSignalStrengths()?.firstOrNull()?.dbm
        } else {
            return null
        }
    }

    fun getWifiSignalStrength(context: Context): Int? {
        val wifiManager = context.applicationContext.getSystemService(Context.WIFI_SERVICE) as WifiManager
        return wifiManager.connectionInfo.rssi
    }

    fun isAirplaneModeEnabled(context: Context): Boolean {
        return Settings.Global.getInt(
            context.contentResolver,
            Settings.Global.AIRPLANE_MODE_ON, 0
        ) == 1
    }

    fun isPowerSaveModeEnabled(context: Context): Boolean {
        val powerManager = context.getSystemService(Context.POWER_SERVICE) as PowerManager
        return powerManager.isPowerSaveMode
    }

    fun getScreenBrightness(context: Context): Int? {
        return try {
            Settings.System.getInt(context.contentResolver, Settings.System.SCREEN_BRIGHTNESS)
        } catch (e: Settings.SettingNotFoundException) {
            null
        }
    }

    fun isAutoScreenBrightnessEnabled(context: Context): Boolean {
        return try {
            Settings.System.getInt(
                context.contentResolver,
                Settings.System.SCREEN_BRIGHTNESS_MODE
            ) == Settings.System.SCREEN_BRIGHTNESS_MODE_AUTOMATIC
        } catch (e: Settings.SettingNotFoundException) {
            false
        }
    }

    fun getRingerMode(context: Context): String {
        val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
        return when (audioManager.ringerMode) {
            AudioManager.RINGER_MODE_NORMAL -> "NORMAL"
            AudioManager.RINGER_MODE_VIBRATE -> "VIBRATE"
            AudioManager.RINGER_MODE_SILENT -> "SILENT"
            else -> "UNKNOWN"
        }
    }

    fun getVolumeLevels(context: Context): VolumeLevels {
        val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager

        val ringVolume = audioManager.getStreamVolume(AudioManager.STREAM_RING)
        val maxRingVolume = audioManager.getStreamMaxVolume(AudioManager.STREAM_RING)
        val ring = if (maxRingVolume > 0) (ringVolume * 100f / maxRingVolume).toInt() else 0

        val mediaVolume = audioManager.getStreamVolume(AudioManager.STREAM_MUSIC)
        val maxMediaVolume = audioManager.getStreamMaxVolume(AudioManager.STREAM_MUSIC)
        val media = if (maxMediaVolume > 0) (mediaVolume * 100f / maxMediaVolume).toInt() else 0

        val notificationVolume = audioManager.getStreamVolume(AudioManager.STREAM_NOTIFICATION)
        val maxNotificationVolume = audioManager.getStreamMaxVolume(AudioManager.STREAM_NOTIFICATION)
        val notification = if (maxNotificationVolume > 0) (notificationVolume * 100f / maxNotificationVolume).toInt() else 0

        val alarmVolume = audioManager.getStreamVolume(AudioManager.STREAM_ALARM)
        val maxAlarmVolume = audioManager.getStreamMaxVolume(AudioManager.STREAM_ALARM)
        val alarm = if (maxAlarmVolume > 0) (alarmVolume * 100f / maxAlarmVolume).toInt() else 0

        return VolumeLevels(
            ring = ring,
            media = media,
            notification = notification,
            alarm = alarm
        )
    }

    fun getBatteryTemperature(context: Context): Int? {
        val intent = context.registerReceiver(null, IntentFilter(Intent.ACTION_BATTERY_CHANGED))
        return intent?.getIntExtra(BatteryManager.EXTRA_TEMPERATURE, -1)?.let { it / 10 }
    }

    fun getBatteryCycleCount(context: Context): Int? {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            val batteryManager = context.getSystemService(Context.BATTERY_SERVICE) as BatteryManager
            val cycleCount = batteryManager.getIntProperty(4)
            return if (cycleCount != Int.MIN_VALUE) cycleCount else null
        } else {
            return null
        }
    }

    fun getDndMode(context: Context): String? {
        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            when (notificationManager.currentInterruptionFilter) {
                NotificationManager.INTERRUPTION_FILTER_ALL -> "ALL"
                NotificationManager.INTERRUPTION_FILTER_PRIORITY -> "PRIORITY"
                NotificationManager.INTERRUPTION_FILTER_NONE -> "NONE"
                NotificationManager.INTERRUPTION_FILTER_ALARMS -> "ALARMS"
                else -> "UNKNOWN"
            }
        } else {
            null
        }
    }

    fun isGpsEnabled(context: Context): Boolean {
        val locationManager = context.getSystemService(Context.LOCATION_SERVICE) as LocationManager
        return locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER)
    }

    fun isDeviceRooted(): Boolean {
        return checkRootMethod1() || checkRootMethod2() || checkRootMethod3()
    }

    fun getScreenWidth(context: Context): Int {
        return context.resources.displayMetrics.widthPixels
    }

    fun getScreenHeight(context: Context): Int {
        return context.resources.displayMetrics.heightPixels
    }

    fun getScreenDpi(context: Context): Int {
        return context.resources.displayMetrics.densityDpi
    }

    private fun checkRootMethod1(): Boolean {
        val buildTags = Build.TAGS
        return buildTags != null && buildTags.contains("test-keys")
    }

    private fun checkRootMethod2(): Boolean {
        val paths = arrayOf(
            "/system/app/Superuser.apk",
            "/sbin/su",
            "/system/bin/su",
            "/system/xbin/su",
            "/data/local/xbin/su",
            "/data/local/bin/su",
            "/system/sd/xbin/su",
            "/system/bin/failsafe/su",
            "/data/local/su",
            "/su/bin/su")
        for (path in paths) {
            if (File(path).exists()) return true
        }
        return false
    }

    private fun checkRootMethod3(): Boolean {
        var process: Process? = null
        return try {
            process = Runtime.getRuntime().exec(arrayOf("/system/xbin/which", "su"))
            val `in` = process.inputStream
            `in`.read() != -1
        } catch (t: Throwable) {
            false
        } finally {
            process?.destroy()
        }
    }

    fun getTotalStorage(): Long {
        val stat = StatFs(Environment.getDataDirectory().path)
        return stat.blockCountLong * stat.blockSizeLong
    }

    fun getFreeStorage(): Long {
        val stat = StatFs(Environment.getDataDirectory().path)
        return stat.availableBlocksLong * stat.blockSizeLong
    }

    fun getTotalExternalStorage(): Long? {
        return if (Environment.getExternalStorageState() == Environment.MEDIA_MOUNTED) {
            val stat = StatFs(Environment.getExternalStorageDirectory().path)
            stat.blockCountLong * stat.blockSizeLong
        } else {
            null
        }
    }

    fun getFreeExternalStorage(): Long? {
        return if (Environment.getExternalStorageState() == Environment.MEDIA_MOUNTED) {
            val stat = StatFs(Environment.getExternalStorageDirectory().path)
            stat.availableBlocksLong * stat.blockSizeLong
        } else {
            null
        }
    }

    fun getTotalRam(context: Context): Long {
        val actManager = context.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
        val memInfo = ActivityManager.MemoryInfo()
        actManager.getMemoryInfo(memInfo)
        return memInfo.totalMem
    }

    fun getAvailableRam(context: Context): Long {
        val actManager = context.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
        val memInfo = ActivityManager.MemoryInfo()
        actManager.getMemoryInfo(memInfo)
        return memInfo.availMem
    }

    fun getNetworkType(context: Context): String {
        val cm = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        val capabilities = cm.getNetworkCapabilities(cm.activeNetwork)
        return when {
            capabilities?.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) == true -> "WIFI"
            capabilities?.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) == true -> "CELLULAR"
            else -> "UNKNOWN"
        }
    }

    fun getCameraFeatures(context: Context): List<String> {
        val features = mutableListOf<String>()
        val pm = context.packageManager
        if (pm.hasSystemFeature(PackageManager.FEATURE_CAMERA_FRONT)) {
            features.add("FRONT_CAMERA")
        }
        if (pm.hasSystemFeature(PackageManager.FEATURE_CAMERA_ANY)) {
            features.add("BACK_CAMERA")
        }
        if (pm.hasSystemFeature(PackageManager.FEATURE_CAMERA_FLASH)) {
            features.add("FLASH")
        }
        return features
    }

    @SuppressLint("MissingPermission")
    fun getConnectedBluetoothDevices(context: Context, callback: (List<String>) -> Unit) {
        val bluetoothAdapter = BluetoothAdapter.getDefaultAdapter() ?: return callback(emptyList())
        val deviceNames = mutableListOf<String>()

        val profileListener = object : BluetoothProfile.ServiceListener {
            override fun onServiceConnected(profile: Int, proxy: BluetoothProfile) {
                if (profile == BluetoothProfile.HEADSET || profile == BluetoothProfile.A2DP) {
                    val connectedDevices = proxy.connectedDevices
                    for (device in connectedDevices) {
                        device.name?.let { deviceNames.add(it) }
                    }
                    // Make sure to close the proxy connection and avoid duplicates
                    if (profile == BluetoothProfile.A2DP) { // Check on the last profile
                        bluetoothAdapter.closeProfileProxy(BluetoothProfile.HEADSET, proxy)
                        callback(deviceNames.distinct())
                    }
                }
            }

            override fun onServiceDisconnected(profile: Int) {}
        }

        bluetoothAdapter.getProfileProxy(context, profileListener, BluetoothProfile.HEADSET)
        bluetoothAdapter.getProfileProxy(context, profileListener, BluetoothProfile.A2DP)
    }

    fun getCpuUsage(): Double? {
        return try {
            val reader1 = File("/proc/stat").bufferedReader()
            val line1 = reader1.readLine()
            reader1.close()

            val parts1 = line1.split(" ").filter { it.isNotBlank() }
            if (parts1.isEmpty() || parts1[0] != "cpu") return null

            val idle1 = parts1[4].toLong()
            val total1 = parts1.subList(1, parts1.size).sumOf { it.toLongOrNull() ?: 0L }

            Thread.sleep(360)

            val reader2 = File("/proc/stat").bufferedReader()
            val line2 = reader2.readLine()
            reader2.close()

            val parts2 = line2.split(" ").filter { it.isNotBlank() }
            if (parts2.isEmpty() || parts2[0] != "cpu") return null

            val idle2 = parts2[4].toLong()
            val total2 = parts2.subList(1, parts2.size).sumOf { it.toLongOrNull() ?: 0L }

            val totalDiff = (total2 - total1).toDouble()
            val idleDiff = (idle2 - idle1).toDouble()

            if (totalDiff > 0) {
                (1.0 - idleDiff / totalDiff) * 100.0
            } else {
                0.0
            }
        } catch (e: Exception) {
            null
        }
    }

    fun getCpuTemperature(): Float? {
        val thermalZonePath = "/sys/class/thermal/"
        val thermalZoneDir = File(thermalZonePath)

        if (!thermalZoneDir.exists() || !thermalZoneDir.isDirectory) {
            return null
        }

        val thermalZoneFiles = thermalZoneDir.listFiles() ?: return null

        for (thermalZone in thermalZoneFiles) {
            if (thermalZone.isDirectory && thermalZone.name.startsWith("thermal_zone")) {
                val typeFile = File(thermalZone, "type")
                val tempFile = File(thermalZone, "temp")

                if (typeFile.exists() && tempFile.exists()) {
                    val type = typeFile.readText().trim()
                    if (type.contains("cpu", ignoreCase = true)) {
                        return try {
                            val temp = tempFile.readText().trim().toFloat()
                            if (temp > 1000) temp / 1000.0f else temp // some are in milliCelsius
                        } catch (e: NumberFormatException) {
                            continue // Try next thermal zone
                        }
                    }
                }
            }
        }
        return null
    }

    @RequiresApi(Build.VERSION_CODES.Q)
    fun getThermalStatus(context: Context): String {
        val powerManager = context.getSystemService(Context.POWER_SERVICE) as PowerManager
        return when (powerManager.currentThermalStatus) {
            PowerManager.THERMAL_STATUS_NONE -> "NONE"
            PowerManager.THERMAL_STATUS_LIGHT -> "LIGHT"
            PowerManager.THERMAL_STATUS_MODERATE -> "MODERATE"
            PowerManager.THERMAL_STATUS_SEVERE -> "SEVERE"
            PowerManager.THERMAL_STATUS_CRITICAL -> "CRITICAL"
            PowerManager.THERMAL_STATUS_EMERGENCY -> "EMERGENCY"
            PowerManager.THERMAL_STATUS_SHUTDOWN -> "SHUTDOWN"
            else -> "UNKNOWN"
        }
    }

    fun isBluetoothEnabled(): Boolean {
        val bluetoothAdapter = BluetoothAdapter.getDefaultAdapter()
        return bluetoothAdapter?.isEnabled ?: false
    }

    @SuppressLint("MissingPermission")
    fun getPairedBluetoothDevices(): List<String> {
        val bluetoothAdapter = BluetoothAdapter.getDefaultAdapter() ?: return emptyList()
        return bluetoothAdapter.bondedDevices.map { it.name }
    }

    fun getLastBootTime(): Date {
        return Date(System.currentTimeMillis() - SystemClock.elapsedRealtime())
    }
    
    fun getCpuAbi(): String {
        return Build.SUPPORTED_ABIS[0]
    }

    fun isSafeBoot(context: Context): Boolean {
        val packageManager = context.packageManager
        return packageManager.isSafeMode
    }

    @SuppressLint("MissingPermission")
    fun getWifiStandard(context: Context): String? {
        val wifiManager = context.applicationContext.getSystemService(Context.WIFI_SERVICE) as WifiManager
        val wifiInfo: WifiInfo = wifiManager.connectionInfo
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            when (wifiInfo.wifiStandard) {
                1 -> "802.11a/b/g" // WIFI_STANDARD_LEGACY
                4 -> "802.11n" // WIFI_STANDARD_11N
                5 -> "802.11ac" // WIFI_STANDARD_11AC
                6 -> "802.11ax" // WIFI_STANDARD_11AX
                else -> "Unknown"
            }
        } else {
            // Fallback for older versions
            null
        }
    }

    @SuppressLint("MissingPermission")
    fun getCellularGeneration(context: Context): String? {
        val telephonyManager = context.getSystemService(Context.TELEPHONY_SERVICE) as TelephonyManager
        val networkType = telephonyManager.dataNetworkType
        return when (networkType) {
            TelephonyManager.NETWORK_TYPE_GPRS,
            TelephonyManager.NETWORK_TYPE_EDGE,
            TelephonyManager.NETWORK_TYPE_CDMA,
            TelephonyManager.NETWORK_TYPE_1xRTT,
            TelephonyManager.NETWORK_TYPE_IDEN -> "2G"
            TelephonyManager.NETWORK_TYPE_UMTS,
            TelephonyManager.NETWORK_TYPE_EVDO_0,
            TelephonyManager.NETWORK_TYPE_EVDO_A,
            TelephonyManager.NETWORK_TYPE_HSDPA,
            TelephonyManager.NETWORK_TYPE_HSUPA,
            TelephonyManager.NETWORK_TYPE_HSPA,
            TelephonyManager.NETWORK_TYPE_EVDO_B,
            TelephonyManager.NETWORK_TYPE_EHRPD,
            TelephonyManager.NETWORK_TYPE_HSPAP -> "3G"
            TelephonyManager.NETWORK_TYPE_LTE -> "4G"
            TelephonyManager.NETWORK_TYPE_NR -> "5G"
            else -> "Unknown"
        }
    }

    @RequiresApi(Build.VERSION_CODES.P)
    fun getPendingSystemUpdateInfo(context: Context): Map<String, Any>? {
        val dpm = context.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
        val admin = ComponentName(context, DeviceOwnerReceiver::class.java)
        val pendingUpdate = dpm.getPendingSystemUpdate(admin)
        return pendingUpdate?.let {
            mapOf(
                "osVersion" to it.toString(),
                "receivedAt" to it.receivedTime
            )
        }
    }

    @RequiresApi(Build.VERSION_CODES.R)
    fun getLastRebootReason(context: Context): String? {
        val am = context.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
        return when (val reason = am.getHistoricalProcessExitReasons(null, 0, 1).firstOrNull()?.reason) {
            6 -> "ANR" // REASON_ANR
            4 -> "CRASH" // REASON_CRASH
            3 -> "LOW_MEMORY" // REASON_LOW_MEMORY
            8 -> "USER_REQUESTED" // REASON_USER_REQUESTED
            9 -> "SYSTEM_UPDATE" // REASON_SYSTEM_UPDATE
            1 -> "WATCHDOG" // REASON_WATCHDOG
            11 -> "KERNEL_PANIC" // REASON_KERNEL_PANIC
            else -> reason?.toString()
        }
    }
}