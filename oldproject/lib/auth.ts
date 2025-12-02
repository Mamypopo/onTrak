import { prisma } from './prisma'
import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'

export interface SessionUser {
  id: string
  username: string
  name: string
  role: 'ADMIN' | 'STAFF' | 'MANAGER'
  departmentId: string | null
}

// Password hashing with best practices
const BCRYPT_ROUNDS = 12 // Increased from 10 for better security

export async function hashPassword(password: string): Promise<string> {
  // Validate password strength
  if (password.length < 6) {
    throw new Error('Password must be at least 6 characters')
  }
  return bcrypt.hash(password, BCRYPT_ROUNDS)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

// Session configuration
const SESSION_COOKIE_NAME = 'flowtrak_session'
const SESSION_MAX_AGE = 60 * 60 * 24 * 7 // 7 days
const SESSION_SECURE = process.env.NODE_ENV === 'production'

export async function createSession(userId: string) {
  const cookieStore = await cookies()
  
  // Set session cookie with security best practices
  cookieStore.set(SESSION_COOKIE_NAME, userId, {
    httpOnly: true, // Prevent XSS attacks
    secure: SESSION_SECURE, // HTTPS only in production
    sameSite: 'lax', // CSRF protection
    maxAge: SESSION_MAX_AGE,
    path: '/', // Available site-wide
  })
}

export async function getSession(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies()
    const session = cookieStore.get(SESSION_COOKIE_NAME)
    
    if (!session?.value) {
      return null
    }

    // Validate session value format (UUID)
    const userId = session.value
    if (!userId || typeof userId !== 'string' || userId.length < 36) {
      return null
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        departmentId: true,
      },
    })

    // If user not found, session is invalid
    if (!user) {
      await deleteSession()
      return null
    }

    return user as SessionUser | null
  } catch (error) {
    console.error('Get session error:', error)
    return null
  }
}

export async function deleteSession() {
  try {
    const cookieStore = await cookies()
    cookieStore.delete(SESSION_COOKIE_NAME)
  } catch (error) {
    console.error('Delete session error:', error)
  }
}

// Helper function to check if user has required role
export function hasRole(user: SessionUser | null, requiredRole: 'ADMIN' | 'STAFF' | 'MANAGER'): boolean {
  if (!user) return false
  
  const roleHierarchy: Record<string, number> = {
    'ADMIN': 3,
    'MANAGER': 2,
    'STAFF': 1,
  }
  
  return roleHierarchy[user.role] >= roleHierarchy[requiredRole]
}

// Helper function to check if user is admin
export function isAdmin(user: SessionUser | null): boolean {
  return user?.role === 'ADMIN'
}
