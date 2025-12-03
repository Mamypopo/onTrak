import { NextRequest, NextResponse } from 'next/server'
import { authenticateUser } from '@/lib/auth'
import { logAction } from '@/lib/logger'
import { z } from 'zod'

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, password } = loginSchema.parse(body)

    const user = await authenticateUser(username, password)

    if (!user) {
      await logAction(null, 'LOGIN_FAILED', {
        username,
        ipAddress: request.headers.get('x-forwarded-for') || undefined,
      })

      return NextResponse.json(
        { error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' },
        { status: 401 }
      )
    }

    await logAction(user.id, 'LOGIN', {
      username,
      role: user.role,
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    })

    // In production, use JWT or session management
    // For now, return user data with a simple token
    return NextResponse.json({
      user,
      token: 'dummy-token', // Replace with JWT in production
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'ข้อมูลไม่ถูกต้อง', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error during login:', error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' },
      { status: 500 }
    )
  }
}

