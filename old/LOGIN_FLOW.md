# 🔐 Login Flow & Role-based Redirect

## 📋 ภาพรวม

**ใช่ครับ ระบบจะแยกหน้าจากการ login** โดยใช้หน้า login เดียวกัน แต่หลัง login สำเร็จจะ redirect ไปหน้าต่างๆ ตาม **Role** ของผู้ใช้

---

## 🔄 Flow การ Login

### 1. **หน้า Login เดียวกัน** (`/login`)

ทุกคนใช้หน้า login เดียวกัน ไม่ว่าจะเป็น:
- Admin
- Manager
- Cashier
- Kitchen
- Runner

```
┌─────────────────────────────┐
│      ระบบจัดการร้านอาหาร     │
│                             │
│  Username: [________]       │
│  Password: [________]       │
│                             │
│      [เข้าสู่ระบบ]          │
└─────────────────────────────┘
```

### 2. **หลัง Login สำเร็จ → Redirect ตาม Role**

```typescript
// จาก src/app/login/page.tsx

// Redirect based on role
if (data.user.role === 'ADMIN' || data.user.role === 'MANAGER') {
  router.push('/admin/menu')      // → หน้า Admin
} else if (data.user.role === 'KITCHEN') {
  router.push('/kitchen')         // → หน้าครัว
} else if (data.user.role === 'RUNNER') {
  router.push('/runner')          // → หน้าพนักงานเสิร์ฟ
} else if (data.user.role === 'CASHIER') {
  router.push('/admin/menu')      // → หน้า Admin (แต่จำกัดบางส่วน)
} else {
  router.push('/admin/menu')      // → Default
}
```

---

## 🎯 Redirect Table

| Role | หลัง Login → ไปที่หน้า |
|------|----------------------|
| **ADMIN** | `/admin/menu` |
| **MANAGER** | `/admin/menu` |
| **CASHIER** | `/admin/menu` |
| **KITCHEN** | `/kitchen` |
| **RUNNER** | `/runner` |

---

## 🔒 การป้องกัน (Double Check)

### 1. **Client-side Check** (ในแต่ละหน้า)

แม้จะ redirect ไปแล้ว แต่แต่ละหน้าจะตรวจสอบ role อีกครั้ง:

#### หน้า Admin (`/admin/*`)
```typescript
// src/app/admin/layout.tsx
const allowedRoles = ['ADMIN', 'MANAGER', 'CASHIER']
if (!allowedRoles.includes(user.role)) {
  router.push('/login')  // → ถ้าไม่มีสิทธิ์ → กลับไป login
  return
}
```

#### หน้าครัว (`/kitchen`)
```typescript
// src/app/kitchen/page.tsx
if (!currentUser || (currentUser.role !== 'KITCHEN' && currentUser.role !== 'ADMIN')) {
  router.push('/login')  // → ถ้าไม่มีสิทธิ์ → กลับไป login
  return
}
```

#### หน้าพนักงานเสิร์ฟ (`/runner`)
```typescript
// src/app/runner/page.tsx
if (!currentUser || (currentUser.role !== 'RUNNER' && currentUser.role !== 'ADMIN')) {
  router.push('/login')  // → ถ้าไม่มีสิทธิ์ → กลับไป login
  return
}
```

---

## 📊 Flow Diagram

```
┌─────────────┐
│   /login    │  ← ทุกคน login ที่นี่
└──────┬──────┘
       │
       │ POST /api/auth/login
       │
       ▼
┌─────────────────┐
│  Check Role     │
└──────┬──────────┘
       │
       ├─ ADMIN/MANAGER/CASHIER → /admin/menu
       ├─ KITCHEN                → /kitchen
       └─ RUNNER                 → /runner
       │
       ▼
┌─────────────────┐
│  Check Role     │  ← ตรวจสอบอีกครั้งในหน้า
│  (Double Check) │     เพื่อความปลอดภัย
└─────────────────┘
```

---

## 💡 ตัวอย่างการทำงาน

### ตัวอย่างที่ 1: Kitchen Login

```
1. Kitchen พิมพ์ username/password
   ↓
2. POST /api/auth/login
   ↓
3. ตรวจสอบ credentials
   ↓
4. Login สำเร็จ → เก็บ user data ใน localStorage
   ↓
5. Check role = 'KITCHEN'
   ↓
6. Redirect → /kitchen
   ↓
7. หน้า /kitchen ตรวจสอบ role อีกครั้ง
   ↓
8. ✅ role = 'KITCHEN' → แสดงหน้า Kitchen
```

### ตัวอย่างที่ 2: Admin Login

```
1. Admin พิมพ์ username/password
   ↓
2. POST /api/auth/login
   ↓
3. ตรวจสอบ credentials
   ↓
4. Login สำเร็จ → เก็บ user data ใน localStorage
   ↓
5. Check role = 'ADMIN'
   ↓
6. Redirect → /admin/menu
   ↓
7. หน้า /admin/layout ตรวจสอบ role อีกครั้ง
   ↓
8. ✅ role = 'ADMIN' → แสดงหน้า Admin พร้อม Sidebar
```

### ตัวอย่างที่ 3: Kitchen พยายามเข้า /admin

```
1. Kitchen login → /kitchen (ปกติ)
   ↓
2. Kitchen พยายามเข้า /admin/menu โดยตรง
   ↓
3. หน้า /admin/layout ตรวจสอบ role
   ↓
4. ❌ role = 'KITCHEN' ไม่ได้อยู่ใน allowedRoles
   ↓
5. Redirect → /login (ถูก kick ออก)
```

---

## 🔐 Security Layers

### Layer 1: Login Redirect
- Redirect ไปหน้าที่ถูกต้องตาม role

### Layer 2: Page-level Check
- แต่ละหน้าตรวจสอบ role อีกครั้ง
- ถ้าไม่มีสิทธิ์ → redirect ไป `/login`

### Layer 3: API Protection (ควรเพิ่ม)
- ตรวจสอบ token ใน API routes
- ปัจจุบันยังไม่ได้ implement

---

## ⚠️ ปัญหาที่ควรแก้ไข

### 1. **CASHIER ยัง redirect ไป /admin/menu**
- ควร redirect ไปหน้าที่เหมาะสมกว่า เช่น `/admin/close-table`

### 2. **ไม่มี Middleware Protection**
- Middleware ยังเป็น placeholder
- ควรเพิ่ม JWT verification

### 3. **localStorage ไม่ปลอดภัย**
- ควรใช้ httpOnly cookies หรือ JWT

---

## 🚀 การปรับปรุงที่แนะนำ

### 1. ปรับ Redirect สำหรับ CASHIER
```typescript
} else if (data.user.role === 'CASHIER') {
  router.push('/admin/close-table')  // → ไปหน้าที่เหมาะสม
}
```

### 2. เพิ่ม Middleware Protection
```typescript
// src/middleware.ts
export function middleware(request: NextRequest) {
  const token = request.cookies.get('token')
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  // Verify JWT token
  // Check role
}
```

### 3. เพิ่ม API Route Protection
```typescript
// ใน API routes
const user = await verifyToken(request)
if (!user || !hasPermission(user.role, ['ADMIN'])) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
}
```

---

## 📝 สรุป

**ใช่ครับ ระบบจะแยกหน้าจากการ login:**

1. ✅ **หน้า Login เดียวกัน** - ทุกคนใช้ `/login`
2. ✅ **Redirect ตาม Role** - หลัง login สำเร็จ
3. ✅ **Double Check** - แต่ละหน้าตรวจสอบ role อีกครั้ง
4. ⚠️ **ควรปรับปรุง** - Middleware และ API protection

**ข้อดี:**
- UX ดี - ไม่ต้องเลือกหน้า login
- ปลอดภัย - มี double check
- ง่ายต่อการดูแล - logic ชัดเจน

