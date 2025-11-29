# ✅ ตรวจสอบ MQTT Connection

## 🎉 Mosquitto ทำงานแล้ว!

ตรวจสอบแล้ว: Port 1883 เปิดอยู่ (LISTENING)

---

## 📋 ขั้นตอนต่อไป

### 1. Restart Backend Server

Backend ต้อง restart เพื่อเชื่อมต่อ MQTT:

```bash
cd backend
# หยุด server (Ctrl+C)
npm run dev
```

### 2. ตรวจสอบ Backend Log

**ควรเห็น:**
```
✅ MQTT client connected
```

**ไม่ควรเห็น:**
```
❌ MQTT client error: ECONNREFUSED
```

### 3. ทดสอบการเชื่อมต่อ

#### วิธีที่ 1: ดู Backend Log
- ตรวจสอบว่าไม่มี MQTT error
- ควรเห็น: `MQTT client connected`

#### วิธีที่ 2: ทดสอบด้วย mosquitto_sub (ถ้ามี)
```bash
# Terminal 1 - Subscribe
mosquitto_sub -h localhost -t tablet/+/status

# Terminal 2 - Publish test message
mosquitto_pub -h localhost -t tablet/test-device/status -m '{"battery":100,"wifiStatus":true}'
```

---

## 🔍 ตรวจสอบ Configuration

### Backend Config

ตรวจสอบ `backend/.env` หรือ `backend/src/config/index.js`:

```env
MQTT_BROKER_URL=mqtt://localhost:1883
MQTT_USERNAME=
MQTT_PASSWORD=
MQTT_CLIENT_ID=ontrak-backend
```

**Default values:**
- Broker URL: `mqtt://localhost:1883`
- Port: `1883`
- Username/Password: ว่าง (anonymous access)

---

## ✅ Checklist

- [x] Mosquitto service รันอยู่
- [x] Port 1883 เปิดอยู่
- [ ] Backend restart แล้ว
- [ ] Backend เชื่อมต่อ MQTT สำเร็จ
- [ ] ไม่มี MQTT error ใน log

---

## 🎯 หลังจาก Backend เชื่อมต่อสำเร็จ

1. **Dashboard จะได้รับ realtime updates**
2. **Android tablets จะส่งข้อมูลผ่าน MQTT ได้**
3. **Backend จะ subscribe topics จาก tablets**
4. **Backend จะ publish commands ไปยัง tablets**

---

## 🆘 ถ้ายังมีปัญหา

### MQTT Error: ECONNREFUSED
- ตรวจสอบว่า Mosquitto service รันอยู่
- ตรวจสอบ port 1883 ไม่ถูก block โดย firewall
- ตรวจสอบ MQTT_BROKER_URL ใน backend config

### Connection Timeout
- ตรวจสอบว่า Mosquitto config อนุญาต anonymous access
- ตรวจสอบ firewall settings

### Backend ไม่เชื่อมต่อ
- Restart backend server
- ตรวจสอบ backend log
- ตรวจสอบ MQTT client configuration

