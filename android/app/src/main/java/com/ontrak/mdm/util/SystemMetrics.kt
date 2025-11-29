package com.ontrak.mdm.util

import android.app.ActivityManager
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.os.Build
import android.os.StatFs
import android.util.Log
import java.io.File
import java.io.RandomAccessFile

object SystemMetrics {
    
    private const val TAG = "SystemMetrics"
    
    fun getCpuUsage(): Double {
        try {
            val statFile = File("/proc/stat")
            val reader = RandomAccessFile(statFile, "r")
            val line = reader.readLine()
            reader.close()
            
            val parts = line.split("\\s+".toRegex())
            if (parts.size >= 8) {
                val user = parts[1].toLong()
                val nice = parts[2].toLong()
                val system = parts[3].toLong()
                val idle = parts[4].toLong()
                val iowait = parts[5].toLong()
                val irq = parts[6].toLong()
                val softirq = parts[7].toLong()
                
                val total = user + nice + system + idle + iowait + irq + softirq
                val used = total - idle
                
                return if (total > 0) (used.toDouble() / total) * 100.0 else 0.0
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error getting CPU usage", e)
        }
        return 0.0
    }
    
    fun getMemoryInfo(context: Context): Triple<Long, Long, Long> {
        try {
            val activityManager = context.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
            val memInfo = ActivityManager.MemoryInfo()
            activityManager.getMemoryInfo(memInfo)
            
            val total = memInfo.totalMem
            val available = memInfo.availMem
            val used = total - available
            
            return Triple(total, used, available)
        } catch (e: Exception) {
            Log.e(TAG, "Error getting memory info", e)
            return Triple(0, 0, 0)
        }
    }
    
    fun getStorageInfo(context: Context): Triple<Long, Long, Long> {
        try {
            val stat = StatFs(context.filesDir.absolutePath)
            val blockSize = stat.blockSizeLong
            val totalBlocks = stat.blockCountLong
            val availableBlocks = stat.availableBlocksLong
            
            val total = totalBlocks * blockSize
            val available = availableBlocks * blockSize
            val used = total - available
            
            return Triple(total, used, available)
        } catch (e: Exception) {
            Log.e(TAG, "Error getting storage info", e)
            return Triple(0, 0, 0)
        }
    }
    
    fun getForegroundApp(context: Context): String? {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                val usageStatsManager = context.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
                val time = System.currentTimeMillis()
                val stats = usageStatsManager.queryUsageStats(
                    UsageStatsManager.INTERVAL_DAILY,
                    time - 1000 * 60,
                    time
                )
                
                if (stats != null && stats.isNotEmpty()) {
                    var mostRecent = stats[0]
                    for (stat in stats) {
                        if (stat.lastTimeUsed > mostRecent.lastTimeUsed) {
                            mostRecent = stat
                        }
                    }
                    return mostRecent.packageName
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error getting foreground app", e)
        }
        return null
    }
    
    fun getNetworkType(context: Context): String {
        try {
            val connectivityManager = context.getSystemService(Context.CONNECTIVITY_SERVICE)
            if (connectivityManager != null) {
                val networkInfo = (connectivityManager as android.net.ConnectivityManager).activeNetworkInfo
                return when {
                    networkInfo == null -> "NONE"
                    networkInfo.type == android.net.ConnectivityManager.TYPE_WIFI -> "WIFI"
                    networkInfo.type == android.net.ConnectivityManager.TYPE_MOBILE -> "MOBILE"
                    else -> "UNKNOWN"
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error getting network type", e)
        }
        return "UNKNOWN"
    }
}

