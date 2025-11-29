# 🚀 OnTrak MDM - Quick Start Guide

## ✅ สิ่งที่ทำเสร็จแล้ว

1. ✅ Backend Server (Port 3007)
2. ✅ Dashboard (Port 3000)
3. ✅ Database Setup
4. ✅ Default Users Created
5. ✅ CORS Configuration
6. ✅ Authentication System

---

## 👥 Default Users

| Username | Password | Role |
|----------|----------|------|
| admin | admin123 | ADMIN |
| manager | manager123 | MANAGER |
| user | user123 | USER |

---

## 🏃‍♂️ Quick Start

### 1. Start Backend

```bash
cd backend
npm run dev
```

**ตรวจสอบ:**
- ✅ Server listening at `http://localhost:3007`
- ✅ Database connected
- ⚠️ MQTT error (ปกติถ้ายังไม่ได้ setup broker)

### 2. Start Dashboard

```bash
cd dashboard
npm run dev
```

**เปิด:** http://localhost:3000

### 3. Login

- Username: `admin`
- Password: `admin123`

---

## 📋 Features ที่พร้อมใช้งาน

### ✅ Authentication
- Login/Logout
- JWT Token
- Role-based access

### ✅ User Management
- View users
- Create/Edit/Delete users (Admin only)
- Role management

### ✅ Device Management
- Device list
- Device details
- Device commands (Lock, Restart, etc.)

### ⏳ Pending (ต้องมี MQTT + Android App)
- Realtime device tracking
- GPS location
- Battery status
- Remote commands

---

## 🔧 Next Steps

### 1. Setup MQTT Broker (ถ้าต้องการ realtime)

ดู: [MQTT_SETUP.md](./MQTT_SETUP.md)

### 2. Connect Android Tablets

1. Build Android APK
2. Install on tablets
3. Configure MQTT broker URL
4. Tablets จะส่งข้อมูล realtime ขึ้น server

### 3. Test Features

- ✅ Login/Logout
- ✅ User Management
- ✅ Device List (จะแสดงเมื่อมี tablets connect)
- ⏳ Realtime Updates (ต้องมี MQTT)

---

## 📝 API Endpoints

### Authentication
- `POST /api/auth/login` - Login
- `GET /api/auth/verify` - Verify token
- `GET /api/auth/me` - Get current user

### Users
- `GET /api/user` - Get all users
- `GET /api/user/:id` - Get user by ID
- `POST /api/user` - Create user (Admin only)
- `PUT /api/user/:id` - Update user
- `DELETE /api/user/:id` - Delete user (Admin only)

### Devices
- `GET /api/device` - Get all devices
- `GET /api/device/:id` - Get device by ID
- `POST /api/device/:id/command` - Send command to device

---

## 🆘 Troubleshooting

### Backend ไม่ start
- ตรวจสอบ PostgreSQL รันอยู่
- ตรวจสอบ DATABASE_URL ใน `.env`
- ตรวจสอบ port 3007 ไม่ถูกใช้งาน

### Login ไม่ได้
- ตรวจสอบ backend รันอยู่ที่ port 3007
- ตรวจสอบ CORS config
- ตรวจสอบ username/password

### MQTT Error
- ปกติถ้ายังไม่ได้ setup MQTT broker
- ดู: [MQTT_SETUP.md](./MQTT_SETUP.md)

---

## 📚 Documentation

- [SETUP_GUIDE.md](./SETUP_GUIDE.md) - Complete setup guide
- [MQTT_SETUP.md](./MQTT_SETUP.md) - MQTT broker setup
- [PHASE_STATUS.md](./PHASE_STATUS.md) - Development phases

---

## 🎉 Ready to Use!

ระบบพร้อมใช้งานแล้ว! 

**สิ่งที่ทำได้ตอนนี้:**
- ✅ Login/Logout
- ✅ User Management
- ✅ View Dashboard

**สิ่งที่ต้องทำต่อ:**
- ⏳ Setup MQTT Broker
- ⏳ Connect Android Tablets
- ⏳ Test Realtime Features

