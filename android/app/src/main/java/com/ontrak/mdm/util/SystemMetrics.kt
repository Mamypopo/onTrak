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
    
    // Store previous CPU times for calculation
    private var prevCpuTime: Long = 0
    private var prevAppTime: Long = 0
    private var prevTimestamp: Long = 0
    
    /**
     * Get CPU usage percentage
     * 
     * Android 10+ restricts access to /proc/stat for system-wide CPU usage
     * This method tries multiple approaches:
     * 1. Try to read /proc/stat (system-wide) - may fail on Android 10+
     * 2. Fallback to /proc/self/stat (process-specific) - usually works
     * 3. Fallback to shell command - requires root or special permissions
     */
    fun getCpuUsage(): Double {
        // Method 1: Try to read system-wide /proc/stat (may fail on Android 10+)
        // Note: canRead() may return true but actual read may still fail due to SELinux/security restrictions
        try {
            val statFile = File("/proc/stat")
            if (!statFile.exists()) {
                Log.d(TAG, "/proc/stat does not exist, trying fallback")
            } else {
                // Try to read - even if canRead() returns true, actual read may fail
                try {
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
                } catch (e: SecurityException) {
                    Log.d(TAG, "SecurityException reading /proc/stat (Android 10+ restriction), trying fallback")
                } catch (e: java.io.FileNotFoundException) {
                    Log.d(TAG, "FileNotFoundException reading /proc/stat (permission denied), trying fallback")
                }
            }
        } catch (e: SecurityException) {
            Log.d(TAG, "SecurityException accessing /proc/stat (Android 10+ restriction), trying fallback")
        } catch (e: Exception) {
            Log.d(TAG, "Error accessing /proc/stat: ${e.message}, trying fallback")
        }
        
        // Method 2: Calculate CPU usage of this process (usually works)
        try {
            return getProcessCpuUsage()
        } catch (e: Exception) {
            Log.w(TAG, "Error getting process CPU usage: ${e.message}")
        }
        
        // Method 3: Try shell command as last resort
        try {
            return getCpuUsageFromShell()
        } catch (e: Exception) {
            Log.w(TAG, "Error getting CPU usage from shell: ${e.message}")
        }
        
        return 0.0
    }
    
    /**
     * Get CPU usage of this process by reading /proc/self/stat
     * This calculates the percentage of CPU time used by this app
     */
    private fun getProcessCpuUsage(): Double {
        try {
            val statFile = File("/proc/self/stat")
            if (!statFile.exists() || !statFile.canRead()) {
                return 0.0
            }
            
            val reader = RandomAccessFile(statFile, "r")
            val line = reader.readLine()
            reader.close()
            
            val parts = line.split("\\s+".toRegex())
            if (parts.size >= 15) {
                // Fields: pid, comm, state, ppid, pgrp, session, tty_nr, tpgid, flags, minflt, cminflt, majflt, cmajflt, utime, stime
                val utime = parts[13].toLong() // User time
                val stime = parts[14].toLong() // System time
                val appTime = utime + stime
                
                val currentTime = System.currentTimeMillis()
                
                if (prevTimestamp > 0 && prevCpuTime > 0) {
                    val timeDiff = currentTime - prevTimestamp
                    val cpuDiff = appTime - prevAppTime
                    
                    if (timeDiff > 0) {
                        // Calculate CPU usage as percentage
                        // Note: This is CPU time used by this process, not system-wide
                        val cpuUsage = (cpuDiff.toDouble() / timeDiff) * 100.0
                        
                        // Store current values for next calculation
                        prevCpuTime = appTime
                        prevAppTime = appTime
                        prevTimestamp = currentTime
                        
                        return cpuUsage.coerceIn(0.0, 100.0)
                    }
                }
                
                // First call - just store values
                prevCpuTime = appTime
                prevAppTime = appTime
                prevTimestamp = currentTime
                return 0.0
            }
        } catch (e: Exception) {
            Log.w(TAG, "Error reading /proc/self/stat: ${e.message}")
        }
        return 0.0
    }
    
    /**
     * Try to get CPU usage using shell command (requires permissions)
     */
    private fun getCpuUsageFromShell(): Double {
        try {
            val process = Runtime.getRuntime().exec("top -n 1 -d 1")
            val reader = process.inputStream.bufferedReader()
            var line: String?
            var cpuLine: String? = null
            
            // Read until we find the CPU line
            while (reader.readLine().also { line = it } != null) {
                if (line?.contains("%cpu") == true || line?.contains("CPU:") == true) {
                    cpuLine = line
                    break
                }
            }
            
            reader.close()
            process.waitFor()
            
            if (cpuLine != null) {
                // Parse CPU percentage from output
                val regex = Regex("(\\d+\\.?\\d*)%")
                val match = regex.find(cpuLine)
                if (match != null) {
                    return match.groupValues[1].toDoubleOrNull() ?: 0.0
                }
            }
        } catch (e: Exception) {
            // Shell command may not work without root or special permissions
            Log.d(TAG, "Shell command failed (may require root): ${e.message}")
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

