package com.ontrak.mdm

import android.app.Application
import android.util.Log

class OnTrakApplication : Application() {
    
    override fun onCreate() {
        super.onCreate()
        Log.d(TAG, "OnTrakApplication onCreate")
    }
    
    companion object {
        private const val TAG = "OnTrakApplication"
    }
}

