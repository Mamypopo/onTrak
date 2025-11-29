package com.ontrak.mdm.receiver

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import com.ontrak.mdm.service.MDMService

class BootReceiver : BroadcastReceiver() {
    
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED ||
            intent.action == "android.intent.action.QUICKBOOT_POWERON") {
            Log.d(TAG, "Boot completed, starting MDM service")
            
            val serviceIntent = Intent(context, MDMService::class.java)
            context.startForegroundService(serviceIntent)
        }
    }
    
    companion object {
        private const val TAG = "BootReceiver"
    }
}

