package com.ontrak.mdm.util

import android.annotation.SuppressLint
import android.app.KeyguardManager
import android.app.NotificationManager
import android.app.admin.DevicePolicyManager
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.location.LocationManager
import android.media.AudioManager
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.net.wifi.WifiManager
import android.nfc.NfcAdapter
import android.os.BatteryManager
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import android.telephony.SignalStrength
import android.telephony.TelephonyManager
import androidx.annotation.RequiresApi
import com.ontrak.mdm.model.VolumeLevels
import java.io.File
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

    fun getInstalledApps(context: Context): List<String> {
        val packageManager = context.packageManager
        val packages = packageManager.getInstalledApplications(PackageManager.GET_META_DATA)
        return packages.filter { (it.flags and ApplicationInfo.FLAG_SYSTEM) == 0 }.map { it.packageName }
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
}
