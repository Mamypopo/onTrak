# 🧪 คู่มือทดสอบ Android App โดยไม่ต้องมี Tablet จริง

## ✅ วิธีที่ 1: ใช้ Android Emulator (แนะนำ)

### ขั้นตอน:

1. **เปิด Android Studio**
2. **สร้าง Emulator:**
   - **Tools → Device Manager**
   - กด **Create Device**
   - เลือก **Tablet** (เช่น Pixel Tablet หรือ Nexus 10)
   - เลือก **System Image** (แนะนำ Android 11+)
   - กด **Finish**

3. **Start Emulator:**
   - กด **Play** ▶️ ใน Device Manager
   - รอ emulator boot (ใช้เวลา 1-2 นาที)

4. **Build และ Run App:**
   ```bash
   cd android
   ./gradlew assembleDebug
   ```
   
   หรือใช้ Android Studio:
   - **File → Open** → เลือกโฟลเดอร์ `android`
   - เลือก emulator จาก dropdown
   - กด **Run** ▶️ (Shift+F10)

### ข้อดี:
- ✅ ไม่ต้องมี tablet จริง
- ✅ ทดสอบได้ทุกฟีเจอร์ (ยกเว้น GPS จริง)
- ✅ Debug ง่าย
- ✅ Reset ได้ง่าย

### ข้อจำกัด:
- ⚠️ GPS จะเป็น mock location (ต้อง set manual)
- ⚠️ Battery simulation (ไม่ใช่ battery จริง)
- ⚠️ Device Owner Mode ต้อง setup ผ่าน ADB

---

## ✅ วิธีที่ 2: ทดสอบ MQTT Connection โดยไม่ต้องมี App

### ใช้ MQTT Client Tools เพื่อ Simulate Tablet:

#### 1. ติดตั้ง MQTT Client (เลือก 1 ตัว):

**Option A: MQTTX (แนะนำ - GUI)**
- ดาวน์โหลด: https://mqttx.app/
- ใช้งานง่าย มี UI

**Option B: mosquitto_pub/mosquitto_sub (Command Line)**
- ติดตั้ง Mosquitto แล้วจะมี tools เหล่านี้

#### 2. Simulate Tablet ส่งข้อมูล:

**Terminal 1: Subscribe เพื่อดูคำสั่งจาก Backend**
```bash
mosquitto_sub -h localhost -p 1883 -t "tablet/TAB-001/command"
```

**Terminal 2: Publish Status (Simulate Tablet)**
```bash
mosquitto_pub -h localhost -p 1883 -t "tablet/TAB-001/status" -m '{
  "deviceId": "TAB-001",
  "battery": 85,
  "wifiStatus": true,
  "uptime": 3600
}'
```

**Terminal 3: Publish Location (Simulate GPS)**
```bash
mosquitto_pub -h localhost -p 1883 -t "tablet/TAB-001/location" -m '{
  "deviceId": "TAB-001",
  "latitude": 13.7563,
  "longitude": 100.5018,
  "accuracy": 10.5,
  "timestamp": "2024-01-01T12:00:00Z"
}'
```

**Terminal 4: Publish Metrics**
```bash
mosquitto_pub -h localhost -p 1883 -t "tablet/TAB-001/metrics" -m '{
  "deviceId": "TAB-001",
  "cpu": 45.5,
  "memory": {
    "total": 8192000000,
    "used": 4096000000,
    "available": 4096000000
  },
  "storage": {
    "total": 128000000000,
    "used": 64000000000,
    "available": 64000000000
  },
  "networkType": "WiFi",
  "foregroundApp": "com.ontrak.mdm"
}'
```

### ตรวจสอบผลลัพธ์:

1. **ดู Backend Logs:**
   ```bash
   cd backend
   npm run dev
   # ควรเห็น: "Received device status", "Received device location", etc.
   ```

2. **ดู Dashboard:**
   - เปิด `http://localhost:3000`
   - Login
   - ควรเห็น device TAB-001 อัปเดต realtime

3. **ส่งคำสั่งจาก Dashboard:**
   - ไปที่ Device Detail Page
   - กดปุ่ม "Lock" หรือ "Restart"
   - ดู Terminal 1 ควรเห็น command message

---

## ✅ วิธีที่ 3: สร้าง Test Script (Automation)

### สร้าง Script เพื่อ Simulate Tablet:

**ไฟล์: `test/simulate-tablet.js`**
```javascript
import mqtt from 'mqtt';

const client = mqtt.connect('mqtt://localhost:1883');
const deviceId = 'TAB-001';

client.on('connect', () => {
  console.log('Connected to MQTT broker');
  
  // Subscribe to commands
  client.subscribe(`tablet/${deviceId}/command`);
  
  // Send status every 10 seconds
  setInterval(() => {
    const status = {
      deviceId,
      battery: Math.floor(Math.random() * 100),
      wifiStatus: true,
      uptime: Date.now() / 1000,
    };
    
    client.publish(`tablet/${deviceId}/status`, JSON.stringify(status));
    console.log('Published status:', status);
  }, 10000);
  
  // Send location every 30 seconds
  setInterval(() => {
    const location = {
      deviceId,
      latitude: 13.7563 + (Math.random() - 0.5) * 0.01,
      longitude: 100.5018 + (Math.random() - 0.5) * 0.01,
      accuracy: 10.5,
      timestamp: new Date().toISOString(),
    };
    
    client.publish(`tablet/${deviceId}/location`, JSON.stringify(location));
    console.log('Published location:', location);
  }, 30000);
  
  // Send metrics every 60 seconds
  setInterval(() => {
    const metrics = {
      deviceId,
      cpu: Math.random() * 100,
      memory: {
        total: 8192000000,
        used: Math.floor(Math.random() * 4096000000),
        available: 4096000000,
      },
      storage: {
        total: 128000000000,
        used: Math.floor(Math.random() * 64000000000),
        available: 64000000000,
      },
      networkType: 'WiFi',
      foregroundApp: 'com.ontrak.mdm',
    };
    
    client.publish(`tablet/${deviceId}/metrics`, JSON.stringify(metrics));
    console.log('Published metrics:', metrics);
  }, 60000);
});

client.on('message', (topic, message) => {
  const command = JSON.parse(message.toString());
  console.log('Received command:', command);
  
  // Simulate command execution
  if (command.action === 'LOCK_DEVICE') {
    console.log('🔒 Device locked (simulated)');
  } else if (command.action === 'RESTART_DEVICE') {
    console.log('🔄 Device restarting (simulated)');
  }
  // ... handle other commands
});
```

**รัน Script:**
```bash
cd test
npm install mqtt
node simulate-tablet.js
```

---

## ✅ วิธีที่ 4: ทดสอบบน Tablet จริง (ถ้ามี)

### ขั้นตอน:

1. **Build APK:**
   ```bash
   cd android
   ./gradlew assembleDebug
   ```

2. **Transfer APK ไป Tablet:**
   - วิธี A: ใช้ USB cable + `adb install`
   - วิธี B: Upload ไป Google Drive แล้วดาวน์โหลด
   - วิธี C: Email ไปที่ตัวเอง

3. **Install APK:**
   - เปิดไฟล์ APK บน tablet
   - Allow "Install from unknown sources"
   - Install

4. **Setup Device Owner (ถ้าต้องการ):**
   ```bash
   adb shell dpm set-device-owner com.ontrak.mdm/.receiver.DeviceOwnerReceiver
   ```

5. **Configure MQTT:**
   - แก้ไข `MQTTConfig.kt` ให้ชี้ไปที่ MQTT broker ของคุณ
   - Rebuild APK

---

## 🎯 สรุป: วิธีทดสอบที่แนะนำ

### สำหรับ Development:
1. ✅ **ใช้ Android Emulator** - ทดสอบ UI และ basic functionality
2. ✅ **ใช้ MQTT Client Tools** - ทดสอบ MQTT connection และ backend
3. ✅ **ใช้ Test Script** - Automate testing

### สำหรับ Production Testing:
1. ✅ **ทดสอบบน Tablet จริง** - ตรวจสอบ GPS, battery, real network
2. ✅ **ทดสอบ Device Owner Mode** - ต้องใช้ tablet จริง

---

## 📝 Checklist การทดสอบ

### ทดสอบได้โดยไม่ต้องมี Tablet:
- [x] Build APK สำเร็จ
- [x] App เปิดได้ (Emulator)
- [x] MQTT Connection (ใช้ MQTT Client)
- [x] Backend รับข้อมูล (Simulate ด้วย MQTT pub)
- [x] Dashboard แสดงข้อมูล realtime
- [x] ส่งคำสั่งไปยัง Tablet (Simulate)

### ต้องใช้ Tablet จริง:
- [ ] GPS location จริง
- [ ] Battery level จริง
- [ ] WiFi status จริง
- [ ] Device Owner Mode
- [ ] Kiosk Mode
- [ ] Remote Commands (Lock, Restart, etc.)

---

## 🔧 Quick Test Commands

### Test MQTT Connection:
```bash
# Terminal 1: Start Backend
cd backend && npm run dev

# Terminal 2: Subscribe to commands
mosquitto_sub -h localhost -p 1883 -t "tablet/+/command"

# Terminal 3: Publish test status
mosquitto_pub -h localhost -p 1883 -t "tablet/TAB-001/status" -m '{"deviceId":"TAB-001","battery":85,"wifiStatus":true,"uptime":3600}'

# Terminal 4: Check Dashboard
# เปิด http://localhost:3000 และดู device TAB-001
```

### Test Emulator GPS:
```bash
# Set mock location in emulator
adb emu geo fix 100.5018 13.7563
```

---

## 💡 Tips

1. **ใช้ Emulator สำหรับ Development** - เร็วกว่าและสะดวกกว่า
2. **ใช้ MQTT Tools สำหรับ Testing Backend** - ไม่ต้อง build app ใหม่
3. **ใช้ Tablet จริงสำหรับ Final Testing** - ตรวจสอบ GPS และ hardware features
4. **สร้าง Test Scripts** - Automate testing process

