package com.ontrak.mdm.util

import android.content.Context
import android.os.Build
import android.provider.Settings

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
}

