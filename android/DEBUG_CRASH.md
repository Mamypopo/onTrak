# คู่มือ Debug แอป Crash

## แอปเปิดแล้วปิดทันที (Crash)

### วิธีตรวจสอบ Error Logs

#### วิธีที่ 1: ใช้ Android Studio Logcat (แนะนำ)

1. **เปิด Android Studio**
2. **เชื่อมต่อ Device/Emulator**
3. **เปิด Logcat:**
   - **View → Tool Windows → Logcat**
   - หรือกด **Alt+6**
4. **Filter logs:**
   - เลือก package: `com.ontrak.mdm`
   - หรือ filter: `tag:MainActivity` หรือ `tag:AndroidRuntime`
5. **ดู Error:**
   - หา logs ที่มี `FATAL EXCEPTION` หรือ `AndroidRuntime`
   - จะเห็น stack trace ที่บอกว่า crash ที่ไหน

#### วิธีที่ 2: ใช้ ADB Command Line

```cmd
# ดู logs แบบ realtime
adb logcat | findstr /i "ontrak\|mdm\|fatal\|exception"

# ดู crash logs เฉพาะ
adb logcat *:E | findstr /i "ontrak\|mdm"

# ดู crash report
adb logcat -d > crash_log.txt
```

#### วิธีที่ 3: ดู Crash Report ใน Android Studio

1. **Run → View Breakpoints**
2. **Exception Breakpoints**
3. **Enable "Any Exception"**
4. **Run in Debug mode**
5. **Android Studio จะหยุดที่จุดที่ crash**

---

## สาเหตุที่พบบ่อย

### 1. NullPointerException

**อาการ:**
- Crash ทันทีเมื่อเปิดแอป
- Error: `java.lang.NullPointerException`

**แก้ไข:**
- ตรวจสอบว่า findViewById ไม่ return null
- ตรวจสอบว่า layout file มี view ที่ต้องการ

### 2. Resource Not Found

**อาการ:**
- Crash เมื่อ setContentView
- Error: `android.content.res.Resources$NotFoundException`

**แก้ไข:**
- ตรวจสอบว่า `R.layout.activity_main` มีอยู่
- ตรวจสอบว่า layout file อยู่ใน `res/layout/`

### 3. Permission Denied

**อาการ:**
- Crash เมื่อเรียกใช้ permission
- Error: `SecurityException`

**แก้ไข:**
- ตรวจสอบ AndroidManifest.xml มี permission
- Request runtime permission (Android 6.0+)

### 4. Service Start Error

**อาการ:**
- Crash เมื่อ startForegroundService
- Error: `IllegalStateException` หรือ `ForegroundServiceStartNotAllowedException`

**แก้ไข:**
- ตรวจสอบ FOREGROUND_SERVICE permission
- ตรวจสอบ FOREGROUND_SERVICE_LOCATION permission (ถ้าใช้ location)
- Request runtime permission

### 5. Device Owner Error

**อาการ:**
- Crash เมื่อ check device owner
- Error: `SecurityException`

**แก้ไข:**
- ตรวจสอบว่า app เป็น device owner หรือไม่
- ใช้ try-catch เพื่อป้องกัน crash

---

## วิธีแก้ไขที่ทำแล้ว

### 1. เพิ่ม Try-Catch ใน MainActivity

```kotlin
override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    
    try {
        setContentView(R.layout.activity_main)
        initViews()
        setupClickListeners()
        checkDeviceOwnerStatus()
        startMDMService()
    } catch (e: Exception) {
        Log.e(TAG, "Error in onCreate", e)
        Toast.makeText(this, "Error: ${e.message}", Toast.LENGTH_LONG).show()
        finish()
    }
}
```

### 2. เพิ่ม Error Handling ใน initViews

```kotlin
private fun initViews() {
    try {
        deviceIdText = findViewById(R.id.deviceIdText)
        // ...
    } catch (e: Exception) {
        Log.e(TAG, "Error in initViews", e)
        throw e
    }
}
```

### 3. เพิ่ม Error Handling ใน startMDMService

```kotlin
private fun startMDMService() {
    try {
        val serviceIntent = Intent(this, MDMService::class.java)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(serviceIntent)
        } else {
            startService(serviceIntent)
        }
    } catch (e: Exception) {
        Log.e(TAG, "Error starting MDM service", e)
        Toast.makeText(this, "Error: ${e.message}", Toast.LENGTH_SHORT).show()
    }
}
```

---

## ขั้นตอน Debug

### 1. เปิดแอปใน Debug Mode

1. **Android Studio → Run → Debug 'app'**
2. **ดู Logcat**
3. **หาจุดที่ crash**

### 2. ตรวจสอบ Stack Trace

```
FATAL EXCEPTION: main
Process: com.ontrak.mdm, PID: 12345
java.lang.RuntimeException: Unable to start activity ComponentInfo{...}
    at android.app.ActivityThread.performLaunchActivity(ActivityThread.java:...)
    ...
Caused by: java.lang.NullPointerException
    at com.ontrak.mdm.ui.MainActivity.initViews(MainActivity.kt:39)
    ...
```

**ดูบรรทัดสุดท้าย** → บอกว่า crash ที่ไหน

### 3. ตรวจสอบ Code ที่ Crash

- เปิดไฟล์ที่ crash
- ดูบรรทัดที่ error
- ตรวจสอบว่า variable เป็น null หรือไม่

---

## คำสั่ง Debug ที่มีประโยชน์

```cmd
# ดู installed apps
adb shell pm list packages | findstr ontrak

# ดู app info
adb shell dumpsys package com.ontrak.mdm

# ดู crash logs
adb logcat -b crash

# Clear app data
adb shell pm clear com.ontrak.mdm

# Uninstall app
adb uninstall com.ontrak.mdm

# Reinstall app
adb install app-debug.apk
```

---

## หมายเหตุ

- **Logcat** คือเครื่องมือที่ดีที่สุดสำหรับ debug
- **Try-catch** ช่วยป้องกัน crash แต่ต้องดู logs เพื่อหาสาเหตุ
- **Android Studio** มี debugger ที่ดีมาก ใช้ breakpoint ได้

