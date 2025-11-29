# 🚀 วิธี Start Mosquitto Service

## ⚠️ ต้องใช้สิทธิ์ Administrator

### วิธีที่ 1: ใช้ Services Manager (แนะนำ - ง่ายที่สุด)

1. **เปิด Services Manager:**
   - กด `Win + R`
   - พิมพ์ `services.msc`
   - กด Enter

2. **หา Mosquitto Broker:**
   - Scroll หา "Mosquitto Broker" หรือ "mosquitto"
   - หรือใช้ Search (Ctrl+F)

3. **Start Service:**
   - คลิกขวาที่ "Mosquitto Broker"
   - เลือก "Start"
   - หรือดับเบิลคลิก → กด "Start"

4. **ตรวจสอบ:**
   - Status ควรเป็น "Running"
   - Startup type: "Automatic" (จะ start อัตโนมัติเมื่อเปิดเครื่อง)

---

### วิธีที่ 2: ใช้ Command Prompt (Run as Administrator)

1. **เปิด Command Prompt as Administrator:**
   - คลิกขวาที่ Start Menu
   - เลือก "Windows Terminal (Admin)" หรือ "Command Prompt (Admin)"

2. **Start Service:**
   ```bash
   net start mosquitto
   ```

3. **ตรวจสอบ:**
   ```bash
   sc query mosquitto
   ```
   - STATE ควรเป็น: `RUNNING`

---

### วิธีที่ 3: ใช้ PowerShell (Run as Administrator)

1. **เปิด PowerShell as Administrator**

2. **Start Service:**
   ```powershell
   Start-Service mosquitto
   ```

3. **ตรวจสอบ:**
   ```powershell
   Get-Service mosquitto
   ```
   - Status ควรเป็น: `Running`

---

## ✅ ตรวจสอบว่า Mosquitto ทำงาน

### 1. ตรวจสอบ Service Status

```bash
sc query mosquitto
```

**ควรเห็น:**
```
STATE: 4  RUNNING
```

### 2. ตรวจสอบ Port 1883

```bash
netstat -an | findstr ":1883"
```

**ควรเห็น:**
```
TCP    0.0.0.0:1883           0.0.0.0:0              LISTENING
```

### 3. ทดสอบการเชื่อมต่อ (ถ้ามี mosquitto_sub)

```bash
# Terminal 1 - Subscribe
mosquitto_sub -h localhost -t test

# Terminal 2 - Publish
mosquitto_pub -h localhost -t test -m "Hello MQTT"
```

---

## 🔧 ถ้า Start ไม่ได้

### ปัญหา: Service won't start

**แก้ไข:**
1. ตรวจสอบ log: `C:\Program Files\mosquitto\mosquitto.log`
2. ตรวจสอบ config: `C:\Program Files\mosquitto\mosquitto.conf`
3. ตรวจสอบว่า port 1883 ไม่ถูกใช้งานโดยโปรแกรมอื่น

### ปัญหา: Port already in use

**แก้ไข:**
```bash
# หา process ที่ใช้ port 1883
netstat -ano | findstr ":1883"

# Kill process (แทน <PID> ด้วย PID ที่เจอ)
taskkill /PID <PID> /F
```

---

## 📝 หลังจาก Start สำเร็จ

1. **Restart Backend Server:**
   ```bash
   cd backend
   npm run dev
   ```

2. **ตรวจสอบ Backend Log:**
   - ควรเห็น: `MQTT client connected`
   - ไม่ควรเห็น: `MQTT client error: ECONNREFUSED`

3. **ทดสอบ Dashboard:**
   - เปิด `http://localhost:3000`
   - Login และดู Dashboard
   - WebSocket ควรเชื่อมต่อได้

---

## 🎉 เสร็จแล้ว!

หลังจาก start Mosquitto service แล้ว:
- ✅ Backend จะเชื่อมต่อ MQTT อัตโนมัติ
- ✅ Dashboard จะได้รับ realtime updates
- ✅ Android tablets จะส่งข้อมูลผ่าน MQTT ได้

