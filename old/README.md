# Mooprompt Restaurant System

ระบบสั่งอาหารร้านหมูกระทะ/ชาบู แบบ Real-time

## เทคโนโลยีที่ใช้

- Next.js 14 (App Router)
- TypeScript
- Prisma ORM
- PostgreSQL
- Socket.IO
- Tailwind CSS + shadcn/ui
- SweetAlert2
- Tippy.js

## การติดตั้ง

```bash
# ติดตั้ง dependencies
npm install

# ตั้งค่า database
cp .env.example .env
# แก้ไข DATABASE_URL ใน .env

# สร้าง database schema
npx prisma db push

# Seed ข้อมูลเริ่มต้น
npm run db:seed

# รัน development server
npm run dev
```

## Default Login

- Username: `admin`
- Password: `123456`
- Role: `ADMIN`

## โครงสร้างโปรเจกต์

```
src/
├── app/              # Next.js App Router pages
├── components/       # React components
├── lib/             # Utilities, helpers
├── i18n/            # Translation files
├── hooks/           # Custom React hooks
├── store/           # Zustand state management
└── types/           # TypeScript types
```

## Features

- ✅ QR Code สแกนโต๊ะ
- ✅ สั่งอาหาร Real-time
- ✅ ครัวดูออเดอร์ Real-time
- ✅ พนักงานเสิร์ฟจัดการออเดอร์
- ✅ แคชเชียร์ปิดโต๊ะ
- ✅ Admin จัดการระบบ

