import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyPassword, createSession } from '@/lib/auth'
import { rateLimit, getClientIP, validateInput } from '@/lib/api-helpers'
import { z } from 'zod'

const loginSchema = z.object({
  username: z.string().min(1, 'กรุณากรอก username'),
  password: z.string().min(1, 'กรุณากรอก password'),
})

export async function POST(request: NextRequest) {
  try {
    // Rate limiting - prevent brute force attacks
    const clientIP = getClientIP(request)
    const rateLimitKey = `login:${clientIP}`
    
    if (!rateLimit(rateLimitKey, 5, 15 * 60 * 1000)) { // 5 attempts per 15 minutes
      return NextResponse.json(
        { error: 'Too many login attempts. Please try again later.' },
        { status: 429 }
      )
    }

    // Parse and validate input
    const body = await request.json()
    const validation = validateInput(loginSchema, body)
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.errors },
        { status: 400 }
      )
    }

    const { username, password } = validation.data

    // Find user (don't reveal if user exists or not - security best practice)
    const user = await prisma.user.findUnique({
      where: { username },
    })

    // Always perform password verification (even if user doesn't exist)
    // This prevents timing attacks
    const isValid = user 
      ? await verifyPassword(password, user.passwordHash)
      : false

    if (!user || !isValid) {
      // Generic error message - don't reveal which field is wrong
      return NextResponse.json(
        { error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' },
        { status: 401 }
      )
    }

    // Create session
    await createSession(user.id)

    // Log successful login (for security audit)
    console.log(`[AUTH] User ${user.username} (${user.id}) logged in from ${clientIP}`)

    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        departmentId: user.departmentId,
      },
    })
  } catch (error) {
    console.error('[AUTH] Login error:', error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ' },
      { status: 500 }
    )
  }
}
