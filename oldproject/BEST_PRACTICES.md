# Best Practices - FlowTrak

## 🔐 Security Best Practices

### 1. Authentication & Session Management

#### ✅ Implemented:
- **HttpOnly Cookies** - ป้องกัน XSS attacks
- **Secure Flag** - HTTPS only ใน production
- **SameSite: Lax** - ป้องกัน CSRF attacks
- **Session Validation** - ตรวจสอบ session ทุกครั้ง
- **Auto Session Cleanup** - ลบ session เมื่อ user ไม่มีใน database

#### 🔧 Configuration:
```typescript
// lib/auth.ts
SESSION_COOKIE_NAME = 'flowtrak_session'
SESSION_MAX_AGE = 7 days
BCRYPT_ROUNDS = 12 (increased from 10)
```

### 2. Password Security

#### ✅ Implemented:
- **bcrypt hashing** - 12 rounds (stronger than default 10)
- **Password validation** - Minimum 6 characters
- **Timing attack prevention** - Always verify password even if user doesn't exist

### 3. Rate Limiting

#### ✅ Implemented:
- **Login rate limiting** - 5 attempts per 15 minutes per IP
- **Prevents brute force attacks**
- **In-memory storage** (use Redis in production)

```typescript
// app/api/auth/login/route.ts
rateLimit(rateLimitKey, 5, 15 * 60 * 1000)
```

### 4. Security Headers

#### ✅ Implemented in Middleware:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Content-Security-Policy` (production only)

### 5. CORS Configuration

#### ✅ Implemented:
- **Environment-based origins** - ใช้ `ALLOWED_ORIGINS` env var
- **Credentials support** - สำหรับ cookie-based auth
- **Preflight handling** - OPTIONS requests

## 🚀 Performance Best Practices

### 1. Socket.io Optimization

#### ✅ Implemented:
- **Singleton pattern** - Connection เดียวต่อ client
- **Connection pooling** - Reuse connections
- **Auto-reconnection** - Retry forever with exponential backoff
- **Message compression** - สำหรับ messages > 1KB
- **Ping/Pong optimization** - 60s timeout, 25s interval

### 2. Database Queries

#### ✅ Best Practices:
- **Selective fields** - ใช้ `select` แทน `include` เมื่อเป็นไปได้
- **Indexes** - มี indexes บน frequently queried fields
- **Connection pooling** - Prisma handles automatically

### 3. API Response Format

#### ✅ Standardized:
```typescript
{
  success: boolean
  data?: T
  error?: string
  message?: string
  details?: any // dev only
}
```

## 📝 Code Quality Best Practices

### 1. Error Handling

#### ✅ Implemented:
- **Consistent error responses** - ใช้ `errorResponse()` helper
- **Error logging** - Log errors with context
- **Development details** - Show error details only in dev mode
- **Try-catch blocks** - ทุก API route

### 2. Input Validation

#### ✅ Implemented:
- **Zod schemas** - Type-safe validation
- **Centralized validation** - ใช้ `validateInput()` helper
- **Error messages** - ภาษาไทยที่เข้าใจง่าย

### 3. Type Safety

#### ✅ Implemented:
- **TypeScript throughout** - 100% type coverage
- **Interface definitions** - `SessionUser`, `ApiResponse`
- **Type inference** - ใช้ Zod for runtime + compile-time types

### 4. Code Organization

#### ✅ Structure:
```
lib/
  ├── auth.ts          # Authentication logic
  ├── api-helpers.ts   # Reusable API utilities
  ├── socket.ts        # Socket.io server
  └── socket-client.ts # Socket.io client hooks
```

## 🔄 Real-time Best Practices

### 1. Socket.io Architecture

#### ✅ Implemented:
- **Room-based system** - `work:${workId}` rooms
- **Event-driven** - Server emits, clients listen
- **Connection management** - Auto join/leave rooms
- **Error handling** - Comprehensive error listeners

### 2. Event Naming Convention

#### ✅ Pattern:
- `join:work` - Client joins room
- `leave:work` - Client leaves room
- `comment:new` - New comment event
- `checkpoint:updated` - Checkpoint status change
- `activity:new` - New activity log

### 3. Client-Side Hooks

#### ✅ Implemented:
- `useSocket()` - Get socket instance
- `useSocketRoom()` - Auto join/leave rooms
- `useSocketEvent()` - Listen to events
- `useSocketStatus()` - Connection status

## 🛡️ Security Checklist

### ✅ Implemented:
- [x] HttpOnly cookies
- [x] Secure flag (production)
- [x] SameSite protection
- [x] Rate limiting
- [x] Input validation
- [x] SQL injection protection (Prisma)
- [x] XSS protection headers
- [x] CSRF protection
- [x] Password hashing (bcrypt)
- [x] Session validation
- [x] Role-based access control

### 🔄 Recommended for Production:
- [ ] Redis for session storage
- [ ] Redis for rate limiting
- [ ] HTTPS enforcement
- [ ] Security audit logging
- [ ] 2FA/MFA support
- [ ] Password complexity requirements
- [ ] Account lockout after failed attempts
- [ ] Session activity monitoring

## 📊 Monitoring & Logging

### ✅ Implemented:
- **Console logging** - สำหรับ development
- **Error logging** - ทุก API errors
- **Auth logging** - Login/logout events
- **Socket logging** - Connection events

### 🔄 Recommended:
- **Structured logging** - ใช้ Winston/Pino
- **Log aggregation** - ELK stack หรือ Datadog
- **Metrics** - Prometheus + Grafana
- **Alerting** - สำหรับ security events

## 🚀 Performance Optimization

### ✅ Implemented:
- **Connection reuse** - Socket.io singleton
- **Message compression** - > 1KB messages
- **Selective queries** - Database field selection
- **Indexes** - Database optimization

### 🔄 Recommended:
- **Redis caching** - Session + rate limiting
- **CDN** - สำหรับ static assets
- **Database connection pooling** - Tuning
- **Query optimization** - Analyze slow queries

## 📚 Code Examples

### Using API Helpers:
```typescript
import { withAuth, successResponse, errorResponse } from '@/lib/api-helpers'

export const GET = withAuth(
  async (req, user) => {
    // user is guaranteed to be authenticated
    return successResponse({ data: '...' })
  },
  { requiredRole: 'ADMIN' }
)
```

### Using Socket Hooks:
```typescript
import { useSocketRoom, useSocketEvent } from '@/lib/socket-client'

// Auto join/leave room
useSocketRoom(workId)

// Listen to events
useSocketEvent('comment:new', (comment) => {
  // Handle new comment
}, [workId])
```

## 🔐 Environment Variables

### Required:
```env
DATABASE_URL="postgresql://..."
```

### Optional (with defaults):
```env
PORT=3007
HOST=0.0.0.0
OPEN=true
NEXTAUTH_URL="http://localhost:3007"
NEXT_PUBLIC_SOCKET_URL="http://localhost:3007"
NODE_ENV=development
ALLOWED_ORIGINS="http://localhost:3007,https://yourdomain.com"
```

## 📖 References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Next.js Security](https://nextjs.org/docs/app/building-your-application/configuring/security-headers)
- [Socket.io Best Practices](https://socket.io/docs/v4/performance-tuning/)
- [Prisma Security](https://www.prisma.io/docs/guides/performance-and-optimization/connection-management)

