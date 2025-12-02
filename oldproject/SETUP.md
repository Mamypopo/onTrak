# คู่มือการตั้งค่า FlowTrak

## ขั้นตอนการติดตั้ง

### 1. ติดตั้ง Dependencies

```bash
npm install
```

### 2. ตั้งค่า PostgreSQL Database

สร้าง database ใหม่:
```sql
CREATE DATABASE flowtrak;
```

### 3. ตั้งค่า Environment Variables

สร้างไฟล์ `.env` ใน root directory:

```env
DATABASE_URL="postgresql://username:password@localhost:5432/flowtrak"
JWT_SECRET="your-secret-key-here-change-in-production"
NEXTAUTH_URL="http://localhost:3001"
NEXT_PUBLIC_SOCKET_URL="http://localhost:3001"
PORT=3001
HOST=0.0.0.0
OPEN=true
```

**Environment Variables:**
- `PORT`: Port ที่จะรัน server (default: 3001)
- `HOST`: Host address (default: 0.0.0.0 เพื่อให้เข้าถึงจากภายนอกได้)
- `OPEN`: เปิด browser อัตโนมัติเมื่อรัน (default: true, ตั้งเป็น false เพื่อปิด)

### 4. สร้าง Database Schema

```bash
npx prisma db push
```

### 5. (Optional) Seed ข้อมูลตัวอย่าง

```bash
npm run db:seed
```

ข้อมูลที่ถูก seed:
- 3 แผนก (IT, บัญชี, ขาย)
- 1 Admin user (admin/admin123)
- 2 Staff users (staff1/staff123, staff2/staff123)
- 1 Template พร้อม 3 checkpoints

### 6. รัน Development Server

```bash
npm run dev
```

ระบบจะรันที่ `http://localhost:3001` และจะเปิด browser อัตโนมัติ

**หมายเหตุ:**
- Server จะรันที่ `0.0.0.0:3001` เพื่อให้เข้าถึงจากภายนอกได้
- คนอื่นสามารถเข้าถึงได้ผ่าน IP address ของเครื่องคุณ เช่น `http://192.168.1.100:3001`
- หาก port 3001 ถูกใช้งานอยู่ จะแสดง error และต้องเปลี่ยน port

## การใช้งานครั้งแรก

1. เปิดเบราว์เซอร์ไปที่ `http://localhost:3001` (จะเปิดอัตโนมัติเมื่อรัน dev server)
2. Login ด้วย:
   - Username: `admin`
   - Password: `123456` (ตาม seed file ที่แก้ไข)
3. เริ่มใช้งานระบบ

## การสร้าง WorkOrder

1. ไปที่หน้า Dashboard
2. คลิก "สร้างงานใหม่"
3. เลือก Template
4. กรอกข้อมูลงาน
5. คลิก "สร้างงาน"

## การจัดการ Checkpoint

- **start**: เริ่มดำเนินการ checkpoint
- **complete**: เสร็จสิ้น checkpoint
- **return**: ส่งกลับ checkpoint
- **problem**: แจ้งปัญหาใน checkpoint

## Real-time Features

ระบบใช้ Socket.io สำหรับ:
- Real-time comment updates
- Real-time checkpoint status updates
- Real-time activity log updates

## Troubleshooting

### Database Connection Error
- ตรวจสอบ DATABASE_URL ในไฟล์ .env
- ตรวจสอบว่า PostgreSQL กำลังรันอยู่
- ตรวจสอบ username/password

### Socket.io Connection Error
- ตรวจสอบ NEXT_PUBLIC_SOCKET_URL
- ตรวจสอบว่า server.ts กำลังรันอยู่ (ใช้ `npm run dev` ไม่ใช่ `next dev`)

### Prisma Error
- รัน `npx prisma generate` ใหม่
- รัน `npx prisma db push` ใหม่

