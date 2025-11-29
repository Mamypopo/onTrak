package com.ontrak.mdm.receiver

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import com.ontrak.mdm.service.MDMService

class RestartReceiver : BroadcastReceiver() {
    
    override fun onReceive(context: Context, intent: Intent) {
        Log.d(TAG, "Restart receiver triggered, restarting MDM service")
        
        val serviceIntent = Intent(context, MDMService::class.java)
        context.startForegroundService(serviceIntent)
    }
    
    companion object {
        private const val TAG = "RestartReceiver"
    }
}

