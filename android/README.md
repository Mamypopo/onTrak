# OnTrak MDM - Android App

## Phase 1: Android Device Controller App

This is the Android Kotlin application for the OnTrak MDM system.

### Features

- **Device Owner Mode**: Full device control capabilities
- **Kiosk Mode**: Lock device to single app mode
- **Foreground Service**: 24/7 background service for data collection
- **MQTT Client**: Real-time communication with backend
- **Remote Commands**: Execute commands from server (lock, restart, wifi, etc.)
- **Auto-Restart**: Service automatically restarts if killed

### Setup Instructions

#### 1. Device Owner Mode Setup

**Method 1: QR Code Provisioning (Recommended for production)**
- Create a QR code with device owner provisioning data
- Scan QR code during device setup

**Method 2: ADB Provisioning (For development/testing)**
```bash
adb shell dpm set-device-owner com.ontrak.mdm/.receiver.DeviceOwnerReceiver
```

**Method 3: Factory Reset Provisioning**
- Factory reset device
- During setup wizard, use NFC or QR code provisioning

#### 2. Configure MQTT

Edit `com/ontrak/mdm/config/MQTTConfig.kt`:
```kotlin
const val BROKER_URL = "tcp://your-mqtt-broker:1883"
const val USERNAME = "your-username"
const val PASSWORD = "your-password"
```

#### 3. Build and Install

```bash
cd android
./gradlew assembleDebug
adb install app/build/outputs/apk/debug/app-debug.apk
```

### MQTT Topics

**Publish (Tablet → Backend):**
- `tablet/{deviceId}/status` - Device status (battery, wifi, uptime)
- `tablet/{deviceId}/location` - GPS location
- `tablet/{deviceId}/metrics` - System metrics (CPU, memory, storage)
- `tablet/{deviceId}/event` - Device events

**Subscribe (Backend → Tablet):**
- `tablet/{deviceId}/command` - Remote commands

### Supported Commands

- `LOCK_DEVICE` - Lock the device screen
- `UNLOCK_DEVICE` - Unlock device (requires user interaction)
- `RESTART_DEVICE` - Restart the device
- `WIFI_ON` - Enable WiFi
- `WIFI_OFF` - Disable WiFi
- `OPEN_APP` - Open an app by package name
- `SHOW_MESSAGE` - Display a message dialog
- `PLAY_SOUND` - Play a notification sound
- `ENABLE_KIOSK` - Enable kiosk mode
- `DISABLE_KIOSK` - Disable kiosk mode

### Data Collection

The service collects and sends data at the following intervals:
- **Heartbeat**: Every 10 seconds
- **Status**: Every 30 seconds (battery, wifi, uptime)
- **Location**: Every 60 seconds (GPS coordinates)
- **Metrics**: Every 60 seconds (CPU, memory, storage, foreground app)

### Permissions Required

- Internet & Network State
- Location (Fine & Coarse)
- WiFi State & Control
- Device Admin (for Device Owner mode)
- Foreground Service
- Boot Completed (for auto-start)

### Troubleshooting

**Service not starting:**
- Check if device owner mode is enabled
- Check battery optimization settings
- Ensure foreground service permission is granted

**MQTT not connecting:**
- Verify broker URL and credentials
- Check network connectivity
- Review logs: `adb logcat | grep MQTTManager`

**Kiosk mode not working:**
- Device owner mode must be enabled
- App must be set as lock task package
- Check logs: `adb logcat | grep KioskModeManager`

### Development Notes

- Minimum SDK: 26 (Android 8.0)
- Target SDK: 34 (Android 14)
- Uses Kotlin Coroutines for async operations
- Uses Eclipse Paho MQTT client library
- Service uses START_STICKY for auto-restart

