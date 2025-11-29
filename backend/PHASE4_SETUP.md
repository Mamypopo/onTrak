# Phase 4 Setup Guide - User / Auth / RBAC

## สิ่งที่เพิ่มเข้ามา

### 1. User Management System
- User model พร้อม roles (ADMIN, MANAGER, USER, VIEWER)
- Password hashing และ verification
- User CRUD operations

### 2. Role-Based Access Control (RBAC)
- Middleware สำหรับตรวจสอบ roles
- API routes ที่มี permission checks

### 3. Audit Logs
- บันทึกทุก action ที่สำคัญ
- เก็บ IP address และ user agent
- Query และ filter logs

## ขั้นตอน Setup

### 1. Update Database Schema

```bash
cd backend
npm run db:generate
npm run db:push
```

### 2. Seed Default Users

```bash
npm run db:seed
```

จะสร้าง users:
- **admin** / admin123 (ADMIN)
- **manager** / manager123 (MANAGER)
- **user** / user123 (USER)

### 3. Test Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

### 4. Test User Management

```bash
# Get all users (ต้อง login เป็น ADMIN หรือ MANAGER)
curl -X GET http://localhost:3000/api/user \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login (ใช้ username/password)
- `GET /api/auth/verify` - Verify token
- `GET /api/auth/me` - Get current user profile

### User Management (Admin/Manager only)
- `GET /api/user` - Get all users
- `GET /api/user/:id` - Get user by ID
- `POST /api/user` - Create user (Admin only)
- `PUT /api/user/:id` - Update user
- `POST /api/user/:id/change-password` - Change password
- `DELETE /api/user/:id` - Delete user (Admin only)
- `GET /api/user/audit-logs` - Get audit logs (Admin only)

## Roles และ Permissions

### ADMIN
- Full access to everything
- Can manage users
- Can view audit logs
- Can change any user's role

### MANAGER
- Can view users
- Can manage devices
- Can view audit logs
- Cannot change roles

### USER
- Can view and manage devices
- Can borrow/return devices
- Cannot view users
- Cannot view audit logs

### VIEWER
- Read-only access
- Can view devices only
- Cannot perform actions

## Default Users

หลังจากรัน `npm run db:seed`:

| Username | Password | Role |
|----------|----------|------|
| admin | admin123 | ADMIN |
| manager | manager123 | MANAGER |
| user | user123 | USER |

## Security Notes

- Passwords are hashed using SHA-256 (simple for demo)
- In production, use bcrypt or argon2
- JWT tokens include user role
- All sensitive operations are logged in audit logs
- RBAC middleware checks permissions on every request

## Next Steps

- Phase 5: Deployment (Docker Compose)

