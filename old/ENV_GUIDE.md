# คู่มือการตั้งค่า Environment Variables

## 📋 Environment Variables ที่จำเป็น

### 1. DATABASE_URL (จำเป็น)
Connection string สำหรับ PostgreSQL database

**รูปแบบ:**
```
DATABASE_URL="postgresql://[username]:[password]@[host]:[port]/[database]?schema=[schema]"
```

**ตัวอย่าง:**
```env
# Local Development
DATABASE_URL="postgresql://postgres:password@localhost:5432/mooprompt?schema=public"

# Production (ตัวอย่าง)
DATABASE_URL="postgresql://user:pass@db.example.com:5432/mooprompt?schema=public"
```

**วิธีสร้าง Database:**
```sql
-- สร้าง database ใน PostgreSQL
CREATE DATABASE mooprompt;

-- หรือใช้ psql
psql -U postgres
CREATE DATABASE mooprompt;
```

---

## 🔧 Environment Variables ที่ไม่จำเป็น (มีค่า default)

### 2. NODE_ENV (แนะนำ)
ระบุสภาพแวดล้อมของแอปพลิเคชัน

**ค่า:**
- `development` - สำหรับ development
- `production` - สำหรับ production
- `test` - สำหรับ testing

**Default:** ไม่มี (จะใช้ `development` ใน server.js)

**ตัวอย่าง:**
```env
NODE_ENV="development"
```

---

### 3. PORT (ไม่จำเป็น)
Port ที่ server จะรัน

**Default:** `3001`

**ตัวอย่าง:**
```env
PORT=3001
```

**หมายเหตุ:** หากไม่ระบุ จะใช้ port 3001 ตามที่ตั้งค่าไว้ใน `server.js`

---

### 4. NEXT_PUBLIC_BASE_URL (แนะนำสำหรับ Mobile Access)
Base URL สำหรับสร้าง QR Code และ API calls

**Default:** ใช้ `request.headers.get('host')` (อาจเป็น localhost)

**ตัวอย่าง:**
```env
# สำหรับเข้าถึงจากมือถือ (ใช้ IP address)
NEXT_PUBLIC_BASE_URL="http://192.168.1.75:3001"

# สำหรับ Production (ใช้ domain)
NEXT_PUBLIC_BASE_URL="https://yourdomain.com"
```

**หมายเหตุ:** 
- ใช้ `NEXT_PUBLIC_` prefix เพื่อให้ client-side เข้าถึงได้
- ถ้าไม่ระบุ จะใช้ host จาก request header (อาจเป็น localhost)
- สำหรับ mobile access ควรระบุ IP address

---

## 📝 ตัวอย่างไฟล์ .env

### สำหรับ Development
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/mooprompt?schema=public"
NODE_ENV="development"
PORT=3001
# สำหรับ mobile access (เปลี่ยน IP เป็น IP address ของคุณ)
NEXT_PUBLIC_BASE_URL="http://192.168.1.75:3001"
```

### สำหรับ Production
```env
DATABASE_URL="postgresql://prod_user:secure_password@prod-db.example.com:5432/mooprompt?schema=public"
NODE_ENV="production"
PORT=3001
```

---

## 🚀 วิธีใช้งาน

### 1. สร้างไฟล์ .env
```bash
# คัดลอกจาก .env.example
cp .env.example .env
```

### 2. แก้ไขค่าใน .env
แก้ไข `DATABASE_URL` ให้ตรงกับ database ของคุณ

### 3. ตรวจสอบการเชื่อมต่อ
```bash
# ทดสอบการเชื่อมต่อ database
npx prisma db push
```

---

## ⚠️ ข้อควรระวัง

1. **อย่า commit ไฟล์ .env** - ไฟล์ `.env` อยู่ใน `.gitignore` แล้ว
2. **ใช้ .env.example** - สำหรับเก็บ template ของ environment variables
3. **Production** - ใช้ environment variables จาก hosting provider (Vercel, Railway, etc.)
4. **Security** - อย่าเปิดเผย `DATABASE_URL` ที่มี password

---

## 🔍 ตรวจสอบ Environment Variables

### ใน Development
```bash
# ดู environment variables ที่โหลด
node -e "console.log(process.env.DATABASE_URL)"
```

### ใน Code
```typescript
// ตรวจสอบใน TypeScript/JavaScript
console.log(process.env.DATABASE_URL)
console.log(process.env.NODE_ENV)
console.log(process.env.PORT)
```

---

## 📚 เอกสารเพิ่มเติม

- [Prisma Environment Variables](https://www.prisma.io/docs/concepts/components/prisma-schema/data-sources#environment-variables)
- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)

