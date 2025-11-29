# MQTT Broker Setup Guide

## 🎯 วัตถุประสงค์
Setup MQTT Broker สำหรับ realtime communication ระหว่าง Android tablets และ Backend

---

## 📦 Option 1: Mosquitto (แนะนำสำหรับ Development)

### Windows Installation

#### วิธีที่ 1: Download Installer

1. **Download:**
   - ไปที่: https://mosquitto.org/download/
   - เลือก Windows installer (64-bit)
   - หรือใช้ direct link: https://mosquitto.org/files/binary/win64/mosquitto-2.0.18-install-windows-x64.exe

2. **Install:**
   - รัน installer
   - ✅ เลือก "Install as Windows Service"
   - ✅ เลือก "Add to PATH"
   - Port: 1883 (default)

3. **Verify Installation:**
   ```bash
   mosquitto -v
   ```

4. **Start Service:**
   ```bash
   # ตรวจสอบสถานะ
   sc query mosquitto
   
   # Start service
   net start mosquitto
   
   # หรือใช้ Services Manager
   # กด Win+R → services.msc → หา "Mosquitto Broker" → Start
   ```

#### วิธีที่ 2: Chocolatey (ถ้ามี)

```bash
choco install mosquitto
```

### Linux Installation

```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install mosquitto mosquitto-clients

# Start service
sudo systemctl start mosquitto
sudo systemctl enable mosquitto

# Check status
sudo systemctl status mosquitto
```

### macOS Installation

```bash
brew install mosquitto
brew services start mosquitto
```

---

## 🐳 Option 2: Docker (ง่ายที่สุด)

### Mosquitto Docker

```bash
docker run -it -d \
  --name mosquitto \
  -p 1883:1883 \
  -p 9001:9001 \
  eclipse-mosquitto:latest
```

### EMQX Docker (Production-ready)

```bash
docker run -d \
  --name emqx \
  -p 1883:1883 \
  -p 8083:8083 \
  -p 8084:8084 \
  -p 8883:8883 \
  -p 18083:18083 \
  emqx/emqx:latest
```

**EMQX Web UI:** http://localhost:18083
- Username: `admin`
- Password: `public`

---

## ✅ Testing MQTT Connection

### Test 1: Subscribe (รับข้อความ)

```bash
# Terminal 1 - Subscribe
mosquitto_sub -h localhost -t test/topic
```

### Test 2: Publish (ส่งข้อความ)

```bash
# Terminal 2 - Publish
mosquitto_pub -h localhost -t test/topic -m "Hello MQTT"
```

ถ้าเห็น "Hello MQTT" ใน Terminal 1 = ✅ ทำงานได้แล้ว!

---

## 🔧 Configuration

### Mosquitto Config (Windows)

ไฟล์: `C:\Program Files\mosquitto\mosquitto.conf`

```conf
# Allow anonymous connections (development only)
allow_anonymous true

# Listener
listener 1883
protocol mqtt

# Logging
log_dest file C:\mosquitto\mosquitto.log
log_type all
```

**Restart service หลังจากแก้ไข config:**
```bash
net stop mosquitto
net start mosquitto
```

### Backend Configuration

อัปเดต `backend/.env`:

```env
MQTT_BROKER_URL=mqtt://localhost:1883
MQTT_USERNAME=
MQTT_PASSWORD=
MQTT_CLIENT_ID=ontrak-backend
```

---

## 🔍 Verify Backend Connection

หลังจาก start backend server ควรเห็น:

```
✅ MQTT client connected
```

ถ้าเห็น error:
```
❌ MQTT client error: ECONNREFUSED
```

**แก้ไข:**
1. ตรวจสอบว่า MQTT broker รันอยู่
2. ตรวจสอบ port (default: 1883)
3. ตรวจสอบ firewall settings

---

## 🚀 Production Setup

### Security Best Practices

1. **Disable Anonymous Access:**
   ```conf
   allow_anonymous false
   password_file C:\mosquitto\passwd
   ```

2. **Create Users:**
   ```bash
   mosquitto_passwd -c C:\mosquitto\passwd ontrak_user
   ```

3. **Use SSL/TLS:**
   ```conf
   listener 8883
   protocol mqtt
   cafile C:\mosquitto\certs\ca.crt
   certfile C:\mosquitto\certs\server.crt
   keyfile C:\mosquitto\certs\server.key
   ```

4. **Update Backend:**
   ```env
   MQTT_BROKER_URL=mqtts://your-mqtt-server:8883
   MQTT_USERNAME=ontrak_user
   MQTT_PASSWORD=your_password
   ```

---

## 📝 Next Steps

1. ✅ Install MQTT Broker
2. ✅ Test connection
3. ✅ Update backend config
4. ✅ Verify backend connects
5. ⏳ Connect Android tablets

---

## 🆘 Troubleshooting

### Port Already in Use

```bash
# Windows - หา process ที่ใช้ port 1883
netstat -ano | findstr :1883

# Kill process
taskkill /PID <PID> /F
```

### Service Won't Start

- ตรวจสอบ log: `C:\Program Files\mosquitto\mosquitto.log`
- ตรวจสอบ config syntax
- ตรวจสอบ permissions

### Connection Refused

- ตรวจสอบ firewall
- ตรวจสอบว่า service รันอยู่
- ตรวจสอบ port number

