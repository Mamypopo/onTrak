# คู่มือทดสอบ Phase 1 - Android App

## สถานะปัจจุบัน

✅ Phase 1 (Android App) เสร็จสมบูรณ์  
⏳ Phase 2 (Backend + MQTT) ยังไม่เริ่ม  
⏳ Phase 3 (Dashboard) ยังไม่เริ่ม  

**หมายเหตุ:** ตอนนี้ Android App ยังไม่สามารถเชื่อมต่อ MQTT ได้เพราะยังไม่มี MQTT Broker

## สิ่งที่ทดสอบได้ตอนนี้

### 1. Build และ Install App

```bash
cd android
./gradlew assembleDebug
adb install app/build/outputs/apk/debug/app-debug.apk
```

### 2. ทดสอบ UI

- เปิดแอป → ดู MainActivity
- ตรวจสอบ Device ID แสดงถูกต้อง
- ตรวจสอบ Device Owner Status

### 3. ทดสอบ Device Owner Setup

**วิธีที่ 1: ADB (สำหรับ Development)**
```bash
# ต้อง factory reset device ก่อน
adb shell dpm set-device-owner com.ontrak.mdm/.receiver.DeviceOwnerReceiver
```

**ตรวจสอบ:**
```bash
adb shell dpm list-owners
```

### 4. ทดสอบ Kiosk Mode

- กด "Enable Kiosk Mode" → ควรล็อกหน้าจอ
- กด "Disable Kiosk Mode" → ควรปลดล็อก

### 5. ทดสอบ Service

- กด "Start MDM Service" → ควรเห็น notification
- ตรวจสอบ log: `adb logcat | grep MDMService`

### 6. ทดสอบ Command Handler (Local)

สามารถทดสอบ command handler โดยตรงผ่าน ADB:

```bash
# สร้าง test command JSON
adb shell "echo '{\"action\":\"SHOW_MESSAGE\",\"params\":{\"title\":\"Test\",\"message\":\"Hello\"}}' > /sdcard/test_command.json"

# หรือทดสอบผ่าน code โดยตรง
```

## สิ่งที่ยังทดสอบไม่ได้

❌ **MQTT Connection** - ยังไม่มี Broker  
❌ **ส่งข้อมูลไป Backend** - ยังไม่มี Backend  
❌ **รับคำสั่งจาก Server** - ยังไม่มี Backend  
❌ **Dashboard** - ยังไม่สร้าง  

## ขั้นตอนต่อไป

### ตัวเลือก 1: รอ Phase 2 (แนะนำ)

รอให้ Phase 2 สร้าง Backend + MQTT Broker เสร็จก่อน แล้วค่อยทดสอบระบบครบ

### ตัวเลือก 2: Setup MQTT Broker เอง (ถ้าต้องการทดสอบ MQTT ตอนนี้)

**ใช้ Mosquitto (ง่ายที่สุด):**

```bash
# Windows (ใช้ Chocolatey)
choco install mosquitto

# หรือดาวน์โหลดจาก https://mosquitto.org/download/

# เริ่ม Mosquitto
mosquitto -c mosquitto.conf
```

**แก้ไข MQTTConfig.kt:**
```kotlin
const val BROKER_URL = "tcp://localhost:1883"  // หรือ IP ของเครื่อง
```

**ทดสอบ MQTT:**
```bash
# Terminal 1: Subscribe
mosquitto_sub -t "tablet/+/status"

# Terminal 2: Publish test
mosquitto_pub -t "tablet/test123/command" -m '{"action":"SHOW_MESSAGE","params":{"title":"Test","message":"Hello"}}'
```

## คำแนะนำ

**สำหรับ Development:**
- ทดสอบ UI และ basic functionality ได้เลย
- MQTT จะทดสอบได้เมื่อ Phase 2 เสร็จ

**สำหรับ Production:**
- รอ Phase 2-5 เสร็จก่อน deploy

## Logs ที่ควรดู

```bash
# MDM Service
adb logcat | grep MDMService

# MQTT
adb logcat | grep MQTTManager

# Command Handler
adb logcat | grep CommandHandler

# Device Owner
adb logcat | grep DeviceOwnerReceiver

# ทั้งหมด
adb logcat | grep -E "MDMService|MQTTManager|CommandHandler|DeviceOwner"
```

## Troubleshooting

**App ไม่ build:**
- ตรวจสอบ Android SDK installed
- ตรวจสอบ Java 17 installed
- ตรวจสอบ Gradle version

**Service ไม่ start:**
- ตรวจสอบ permissions
- ตรวจสอบ battery optimization settings
- ดู logs: `adb logcat | grep MDMService`

**Device Owner ไม่ได้:**
- ต้อง factory reset device
- ตรวจสอบ package name ตรงกับ AndroidManifest.xml
- ดู `DEVICE_OWNER_SETUP.md`

