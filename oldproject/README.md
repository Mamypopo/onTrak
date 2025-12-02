# FlowTrak - Corporate Workflow Tracking System

ระบบติดตามงานในองค์กรที่สร้างด้วย Next.js 14, TypeScript, PostgreSQL, Prisma, และ Socket.io

## เทคโนโลยีที่ใช้

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL
- **Real-time**: Socket.io
- **UI Libraries**: SweetAlert2, Tippy.js, lucide-react
- **Form Validation**: react-hook-form + Zod

## คุณสมบัติหลัก

- ✅ ระบบ Login/Authentication
- ✅ CRUD: Department, Template, TemplateCheckpoint
- ✅ สร้าง WorkOrder จาก Template (clone checkpoints)
- ✅ Checkpoint Workflow Actions (start, complete, return, problem)
- ✅ ระบบคอมเมนต์แบบ Real-time
- ✅ Dashboard แบบ Real-time พร้อม Filter
- ✅ Activity Log
- ✅ Dark Mode UI
- ✅ Responsive Layout (Mobile, Tablet, Desktop)
- ✅ SweetAlert2 สำหรับ confirm และ success popup
- ✅ Tippy.js สำหรับ tooltip

## การติดตั้ง

1. ติดตั้ง dependencies:
```bash
npm install
```

2. ตั้งค่า environment variables:
สร้างไฟล์ `.env` และเพิ่ม:
```
DATABASE_URL="postgresql://user:password@localhost:5432/flowtrak"
JWT_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:3001"
NEXT_PUBLIC_SOCKET_URL="http://localhost:3001"
PORT=3001
HOST=0.0.0.0
OPEN=true
```

**Environment Variables:**
- `PORT`: Port ที่จะรัน server (default: 3001)
- `HOST`: Host address (default: 0.0.0.0 เพื่อให้เข้าถึงจากภายนอกได้)
- `OPEN`: เปิด browser อัตโนมัติเมื่อรัน (default: true)

3. ตั้งค่า database:
```bash
npx prisma db push
```

4. (Optional) Seed ข้อมูลตัวอย่าง:
```bash
npm run db:seed
```

5. รัน development server:
```bash
npm run dev
```

## ข้อมูล Login เริ่มต้น (หลัง seed)

- **Admin**: 
  - Username: `admin`
  - Password: `admin123`

- **Staff**: 
  - Username: `staff1` / `staff2`
  - Password: `staff123`

## โครงสร้างโปรเจกต์

```
├── app/                    # Next.js App Router
│   ├── api/               # API Routes
│   ├── admin/             # Admin pages
│   ├── dashboard/         # Dashboard page
│   ├── login/             # Login page
│   └── work/              # Work detail pages
├── components/            # React Components
│   ├── admin/             # Admin components
│   ├── dashboard/         # Dashboard components
│   ├── layout/            # Layout components
│   ├── work/              # Work-related components
│   └── ui/                # shadcn/ui components
├── lib/                   # Utilities
│   ├── auth.ts           # Authentication helpers
│   ├── prisma.ts         # Prisma client
│   ├── socket.ts         # Socket.io server
│   └── utils.ts          # Utility functions
├── prisma/                # Prisma schema
└── types/                 # TypeScript types
```

## API Routes

- `/api/auth/login` - Login
- `/api/auth/logout` - Logout
- `/api/auth/me` - Get current user
- `/api/admin/user` - User CRUD
- `/api/department` - Department CRUD
- `/api/template` - Template CRUD
- `/api/template/checkpoint` - TemplateCheckpoint CRUD
- `/api/template/checkpoint/reorder` - Reorder checkpoints
- `/api/work` - WorkOrder CRUD
- `/api/work/create` - Create WorkOrder from Template
- `/api/checkpoint/[id]/action` - Checkpoint workflow actions
- `/api/comment` - Comment CRUD
- `/api/activity` - Activity Log

## Layout Structure

```
NAV (fixed top)
──────────────────────────────
TIMELINE (บน)
──────────────────────────────
SIDEBAR | COMMENTS | INFO
```

- **Mobile**: Stack ทั้งหมด
- **Tablet**: 1/2/1 หรือ collapse sidebar เป็น drawer
- **Desktop**: 3 column layout

## การใช้งาน

1. **Login** ด้วยบัญชี Admin
2. **สร้าง Department** ในหน้า Admin > Departments
3. **สร้าง Template** ในหน้า Admin > Templates
4. **เพิ่ม TemplateCheckpoint** ใน Template ที่สร้าง
5. **สร้าง WorkOrder** จาก Template ในหน้า Dashboard
6. **ดำเนินการ Checkpoint** โดยใช้ Actions (start, complete, return, problem)
7. **คอมเมนต์** ในแต่ละ Checkpoint
8. **ดู Activity Log** ใน Info Panel

## Scripts

- `npm run dev` - รัน development server (with Socket.io)
- `npm run build` - Build สำหรับ production
- `npm run start` - รัน production server
- `npm run db:push` - Push Prisma schema to database
- `npm run db:migrate` - Create migration
- `npm run db:studio` - เปิด Prisma Studio
- `npm run db:seed` - Seed ข้อมูลตัวอย่าง

## หมายเหตุ

- ระบบใช้ Cookie-based authentication (session)
- Socket.io ใช้สำหรับ real-time updates
- File upload ใน Comment ยังเป็นแบบ simplified (ควรใช้ S3/Cloudinary ใน production)
- ใช้ `tsx` สำหรับรัน custom server (server.ts)

## License

MIT

