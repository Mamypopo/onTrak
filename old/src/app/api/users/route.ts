import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { logAction } from '@/lib/logger'
import bcrypt from 'bcryptjs'

const createUserSchema = z.object({
  name: z.string().min(1),
  username: z.string().min(1),
  password: z.string().min(6),
  role: z.enum(['ADMIN', 'MANAGER', 'CASHIER', 'KITCHEN', 'RUNNER', 'STAFF']),
  active: z.boolean().default(true),
})

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search') || ''
    const role = searchParams.get('role')
    const active = searchParams.get('active')
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    // Build where clause
    const where: any = {}

    // Search filter (name or username) - case-insensitive for PostgreSQL
    if (search) {
      where.OR = [
        { 
          name: { 
            contains: search,
            mode: 'insensitive',
          } 
        },
        { 
          username: { 
            contains: search,
            mode: 'insensitive',
          } 
        },
      ]
    }

    // Role filter
    if (role && role !== 'all') {
      where.role = role
    }

    // Active filter
    if (active && active !== 'all') {
      where.active = active === 'active'
    }

    // Build orderBy
    const orderBy: any = {}
    if (sortBy === 'name' || sortBy === 'username' || sortBy === 'role' || sortBy === 'createdAt') {
      orderBy[sortBy] = sortOrder
    } else {
      orderBy.createdAt = 'desc'
    }

    const users = await prisma.user.findMany({
      where,
      orderBy,
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    // Get total count for pagination (if needed in future)
    const total = await prisma.user.count({ where })

    return NextResponse.json({ users, total })
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = createUserSchema.parse(body)

    // Check if username already exists
    const existingUser = await prisma.user.findUnique({
      where: { username: data.username },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'ชื่อผู้ใช้นี้มีอยู่แล้ว' },
        { status: 400 }
      )
    }

    // Hash password
    const passwordHash = await bcrypt.hash(data.password, 10)

    const user = await prisma.user.create({
      data: {
        name: data.name,
        username: data.username,
        passwordHash,
        role: data.role,
        active: data.active,
      },
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    await logAction(null, 'CREATE_USER', {
      userId: user.id,
      username: user.username,
      role: user.role,
    })

    return NextResponse.json({ user }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'ข้อมูลไม่ถูกต้อง', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error creating user:', error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' },
      { status: 500 }
    )
  }
}

