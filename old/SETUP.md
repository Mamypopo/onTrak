# คู่มือการติดตั้งและใช้งานระบบ Mooprompt Restaurant

## 📋 ความต้องการของระบบ

- Node.js 18+ 
- PostgreSQL 14+
- npm หรือ yarn

## 🚀 การติดตั้ง

### 1. ติดตั้ง Dependencies

```bash
npm install
```

### 2. ตั้งค่า Database

สร้างไฟล์ `.env` ใน root directory:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/mooprompt?schema=public"
NODE_ENV="development"
```

### 3. สร้าง Database Schema

```bash
# สร้าง schema
npx prisma db push

# หรือใช้ migration
npx prisma migrate dev --name init
```

### 4. Seed ข้อมูลเริ่มต้น

```bash
npm run db:seed
```

ข้อมูลที่ถูก seed:
- Admin user: `admin` / `123456`
- หมวดหมู่เมนูและรายการเมนูตัวอย่าง
- 10 โต๊ะ
- แพ็กเกจบุฟเฟต์
- ค่าบริการเพิ่มเติม

### 5. รัน Development Server

```bash
npm run dev
```

ระบบจะรันที่ `http://localhost:3001`

## 🔐 การเข้าสู่ระบบ

### Admin Login
- Username: `admin`
- Password: `123456`
- Role: `ADMIN`

## 📱 ฟีเจอร์หลัก

### ฝั่งลูกค้า
1. **หน้าแรก** (`/`) - สแกน QR Code หรือกรอกหมายเลขโต๊ะ
2. **Session** (`/session/[id]`) - หน้าหลักของโต๊ะ
3. **เมนู** (`/menu?session=[id]`) - ดูเมนูและเพิ่มลงตะกร้า
4. **ตะกร้า** (`/cart?session=[id]`) - จัดการตะกร้าและสั่งอาหาร
5. **ออเดอร์** (`/orders?session=[id]`) - ดูสถานะออเดอร์แบบ Real-time

### ฝั่งครัว
- **Kitchen** (`/kitchen`) - ดูออเดอร์แบบ Real-time, เปลี่ยนสถานะเป็น COOKING/DONE

### ฝั่งพนักงานเสิร์ฟ
- **Runner** (`/runner`) - ดูออเดอร์ที่พร้อมเสิร์ฟ (DONE), กด SERVED

### ฝั่ง Admin
- `/admin/menu` - จัดการเมนู
- `/admin/categories` - จัดการหมวดหมู่
- `/admin/tables` - จัดการโต๊ะ
- `/admin/packages` - จัดการแพ็กเกจ
- `/admin/extra-charges` - จัดการค่าบริการเพิ่มเติม
- `/admin/promotions` - จัดการโปรโมชั่น
- `/admin/settings` - ตั้งค่าร้าน
- `/admin/users` - จัดการผู้ใช้
- `/admin/open-table` - เปิดโต๊ะ
- `/admin/close-table` - ปิดโต๊ะ

## 🔌 Socket.IO Events

### Events ที่ส่งออก (Emit)
- `order:new` - เมื่อมีออเดอร์ใหม่
- `order:cooking` - เมื่อออเดอร์กำลังทำ
- `order:done` - เมื่อออเดอร์พร้อมเสิร์ฟ
- `order:served` - เมื่อออเดอร์เสิร์ฟแล้ว
- `billing:closed` - เมื่อปิดบิล

### Events ที่รับ (Listen)
- `order:new` - รับออเดอร์ใหม่
- `order:cooking` - อัพเดทสถานะกำลังทำ
- `order:done` - อัพเดทสถานะพร้อมเสิร์ฟ
- `order:served` - อัพเดทสถานะเสิร์ฟแล้ว

## 📊 API Routes

### Session
- `POST /api/session/open` - เปิดโต๊ะ
- `POST /api/session/close` - ปิดโต๊ะ
- `GET /api/session/[id]/orders` - ดึงออเดอร์ของ session

### Menu
- `GET /api/menu` - ดึงเมนูทั้งหมด

### Order
- `POST /api/order/create` - สร้างออเดอร์
- `PATCH /api/order/item-status` - อัพเดทสถานะรายการออเดอร์

### Kitchen
- `GET /api/kitchen/orders` - ดึงออเดอร์สำหรับครัว

### Runner
- `GET /api/runner/orders` - ดึงออเดอร์ที่พร้อมเสิร์ฟ

### Billing
- `POST /api/billing/close` - ปิดบิล

### Restaurant Info
- `GET /api/restaurant-info` - ดึงข้อมูลร้าน

### Auth
- `POST /api/auth/login` - เข้าสู่ระบบ

## 🎨 UI Components

ใช้ shadcn/ui components:
- Button
- Input
- Card
- Select
- DropdownMenu
- และอื่นๆ

## 🌐 Multi-language

รองรับ 2 ภาษา:
- ไทย (TH) - Default
- อังกฤษ (EN)

ใช้ hook `useTranslations()` เพื่อแปลข้อความ

## 🎯 Color System

- Primary: #FF6A8B
- Secondary: #8ED7FF
- Accent: #FFEA80
- Success: #55DD9A
- Error: #FF7A7A
- LightBG: #FFF6F9
- DarkSurface: #1D1D1D

## 📝 System Logs

ระบบบันทึก log ทุก action สำคัญ:
- LOGIN, LOGOUT
- OPEN_TABLE, CLOSE_TABLE
- ORDER_CREATE
- ORDER_COOKING
- ORDER_DONE
- ORDER_SERVED
- CLOSE_BILLING
- และอื่นๆ

ดู logs ได้ที่ `SystemLog` table ใน database

## 🔧 Development Commands

```bash
# Development
npm run dev

# Build
npm run build

# Start production
npm start

# Database
npm run db:push      # Push schema to database
npm run db:migrate   # Create migration
npm run db:studio    # Open Prisma Studio
npm run db:seed      # Seed data

# Lint
npm run lint
```

## 📦 Production Deployment

1. Build project:
```bash
npm run build
```

2. Start production server:
```bash
npm start
```

3. ตั้งค่า environment variables ใน production:
- `DATABASE_URL`
- `NODE_ENV=production`

## 🐛 Troubleshooting

### Socket.IO ไม่ทำงาน
- ตรวจสอบว่าใช้ `node server.js` แทน `next dev`
- ตรวจสอบว่า Socket.IO server ถูก initialize ใน `server.js`

### Database Connection Error
- ตรวจสอบ `DATABASE_URL` ใน `.env`
- ตรวจสอบว่า PostgreSQL กำลังรันอยู่

### Prisma Client Error
- รัน `npx prisma generate` เพื่อ generate Prisma Client

## 📚 เอกสารเพิ่มเติม

- [Next.js 14 Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Socket.IO Documentation](https://socket.io/docs)
- [shadcn/ui Documentation](https://ui.shadcn.com)

