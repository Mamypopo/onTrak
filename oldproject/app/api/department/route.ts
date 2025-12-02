import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { z } from 'zod'

const createDepartmentSchema = z.object({
  name: z.string().min(1),
})

export async function GET() {
  try {
    const departments = await prisma.department.findMany({
      include: {
        _count: {
          select: {
            users: true,
            checkpoints: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    })

    return NextResponse.json({ departments })
  } catch (error) {
    console.error('Get departments error:', error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาด' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validated = createDepartmentSchema.parse(body)

    const existing = await prisma.department.findUnique({
      where: { name: validated.name },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'ชื่อแผนกนี้มีอยู่แล้ว' },
        { status: 400 }
      )
    }

    const department = await prisma.department.create({
      data: {
        name: validated.name,
      },
    })

    return NextResponse.json({ department })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'ข้อมูลไม่ถูกต้อง', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Create department error:', error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาด' },
      { status: 500 }
    )
  }
}

