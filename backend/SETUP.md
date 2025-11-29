# คู่มือ Setup Backend - Phase 2

## Prerequisites

1. **Node.js 18+** - [Download](https://nodejs.org/)
2. **PostgreSQL 14+** - [Download](https://www.postgresql.org/download/)
3. **MQTT Broker** - EMQX หรือ Mosquitto

## ขั้นตอน Setup

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Setup Environment Variables

สร้างไฟล์ `.env` จาก template:

```bash
# Windows
copy env.example .env

# Linux/Mac
cp env.example .env
```

แก้ไข `.env`:
```env
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/ontrak_mdm?schema=public"

# JWT Secret (เปลี่ยนเป็นค่าที่ปลอดภัย)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# MQTT Broker
MQTT_BROKER_URL=mqtt://localhost:1883
```

### 3. Setup PostgreSQL Database

**สร้าง Database:**
```sql
CREATE DATABASE ontrak_mdm;
```

**หรือใช้ psql:**
```bash
psql -U postgres
CREATE DATABASE ontrak_mdm;
\q
```

### 4. Setup Prisma

```bash
# Generate Prisma Client
npm run db:generate

# Push schema to database (development)
npm run db:push

# หรือใช้ migrations (production)
npm run db:migrate
```

### 5. Setup MQTT Broker

**Option A: ใช้ Mosquitto (ง่าย)**

```bash
# Windows (Chocolatey)
choco install mosquitto

# Linux
sudo apt-get install mosquitto mosquitto-clients

# Mac
brew install mosquitto

# Start Mosquitto
mosquitto -c mosquitto.conf
```

**Option B: ใช้ EMQX (แนะนำสำหรับ production)**

```bash
# Docker
docker run -d --name emqx -p 1883:1883 -p 8083:8083 -p 8084:8084 -p 8883:8883 -p 18083:18083 emqx/emqx

# หรือ download จาก https://www.emqx.io/
```

### 6. Start Backend Server

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

Server จะรันที่: `http://localhost:3000`

## ตรวจสอบการทำงาน

### 1. Health Check

```bash
curl http://localhost:3000/health
```

ควรเห็น:
```json
{
  "status": "ok",
  "timestamp": "...",
  "uptime": 123,
  "mqtt": {
    "connected": true
  }
}
```

### 2. Test Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin"}'
```

### 3. Test MQTT Connection

```bash
# Subscribe (Terminal 1)
mosquitto_sub -t "tablet/+/status"

# Publish test (Terminal 2)
mosquitto_pub -t "tablet/test123/status" -m '{"deviceId":"test123","battery":80,"wifiStatus":true,"uptime":1000}'
```

## Troubleshooting

### Database Connection Error

```bash
# ตรวจสอบ PostgreSQL ทำงานอยู่
# Windows
net start postgresql-x64-14

# Linux
sudo systemctl status postgresql

# ตรวจสอบ connection
psql -U postgres -d ontrak_mdm
```

### MQTT Connection Error

```bash
# ตรวจสอบ MQTT Broker ทำงานอยู่
# Mosquitto
mosquitto -v

# ตรวจสอบ port
netstat -an | findstr 1883
```

### Port Already in Use

```bash
# เปลี่ยน PORT ใน .env
PORT=3001
```

## Next Steps

- Phase 3: Dashboard (Next.js 14)
- Phase 4: User / Auth / RBAC
- Phase 5: Deployment (Docker Compose)

