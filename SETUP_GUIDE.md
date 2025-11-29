# OnTrak MDM - Setup Guide

## 📋 สารบัญ
1. [Database Setup](#database-setup)
2. [Seed Default Users](#seed-default-users)
3. [MQTT Broker Setup](#mqtt-broker-setup)
4. [Testing](#testing)

---

## 🗄️ Database Setup

### 1. สร้าง PostgreSQL Database

```sql
CREATE DATABASE ontrak_mdm;
```

### 2. ตั้งค่า DATABASE_URL ใน `.env`

สร้างไฟล์ `backend/.env`:

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/ontrak_mdm?schema=public"
```

### 3. Generate Prisma Client และ Push Schema

```bash
cd backend
npm run db:generate
npm run db:push
```

---

## 👥 Seed Default Users

รันคำสั่งเพื่อสร้าง default users:

```bash
cd backend
npm run db:seed
```

### Default Users

| Username | Password | Role | Description |
|----------|----------|------|-------------|
| admin | admin123 | ADMIN | Full access |
| manager | manager123 | MANAGER | View users, manage devices |
| user | user123 | USER | Manage devices only |

---

## 📡 MQTT Broker Setup

### Option 1: Mosquitto (แนะนำสำหรับ Development)

#### Windows:

1. **Download Mosquitto:**
   - ไปที่: https://mosquitto.org/download/
   - Download Windows installer

2. **Install:**
   - รัน installer
   - เลือก "Install as Windows Service"
   - Port: 1883 (default)

3. **Start Service:**
   ```bash
   # ตรวจสอบว่า service รันอยู่
   sc query mosquitto
   
   # หรือ start จาก Services (services.msc)
   ```

4. **Test Connection:**
   ```bash
   # Subscribe
   mosquitto_sub -h localhost -t test
   
   # Publish (ใน terminal อื่น)
   mosquitto_pub -h localhost -t test -m "Hello"
   ```

#### Linux/Mac:

```bash
# Ubuntu/Debian
sudo apt-get install mosquitto mosquitto-clients

# macOS
brew install mosquitto

# Start
sudo systemctl start mosquitto  # Linux
brew services start mosquitto   # macOS
```

### Option 2: EMQX (Production-ready)

#### Docker:

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

#### Windows Native:

1. Download จาก: https://www.emqx.io/downloads
2. Extract และรัน `bin/emqx start`

### Configuration

อัปเดต `backend/.env`:

```env
MQTT_BROKER_URL=mqtt://localhost:1883
MQTT_USERNAME=
MQTT_PASSWORD=
MQTT_CLIENT_ID=ontrak-backend
```

---

## ✅ Testing

### 1. Start Backend

```bash
cd backend
npm run dev
```

ควรเห็น:
```
Server listening at http://127.0.0.1:3007
Database connected successfully
MQTT client connected
```

### 2. Start Dashboard

```bash
cd dashboard
npm run dev
```

เปิด: `http://localhost:3000`

### 3. Test Login

- Username: `admin`
- Password: `admin123`

### 4. Test API

```bash
# Login
curl -X POST http://localhost:3007/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Health Check
curl http://localhost:3007/health
```

---

## 🔧 Troubleshooting

### Database Connection Error

- ตรวจสอบว่า PostgreSQL รันอยู่
- ตรวจสอบ DATABASE_URL ใน `.env`
- ตรวจสอบว่า database `ontrak_mdm` ถูกสร้างแล้ว

### MQTT Connection Error

- ตรวจสอบว่า MQTT broker รันอยู่
- ตรวจสอบ port (default: 1883)
- ตรวจสอบ firewall settings

### CORS Error

- ตรวจสอบ CORS_ORIGIN ใน `backend/.env`
- ตรวจสอบว่า Dashboard URL ตรงกับ CORS config

---

## 📝 Next Steps

1. ✅ Database setup
2. ✅ Seed users
3. ✅ MQTT broker setup
4. ⏳ Connect Android tablets
5. ⏳ Test realtime tracking
6. ⏳ Deploy to production

