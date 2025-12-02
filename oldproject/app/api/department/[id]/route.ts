import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { z } from 'zod'

const updateDepartmentSchema = z.object({
  name: z.string().min(1),
})

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const department = await prisma.department.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            users: true,
            checkpoints: true,
          },
        },
      },
    })

    if (!department) {
      return NextResponse.json(
        { error: 'ไม่พบแผนก' },
        { status: 404 }
      )
    }

    return NextResponse.json({ department })
  } catch (error) {
    console.error('Get department error:', error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาด' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession()
    
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validated = updateDepartmentSchema.parse(body)

    const existing = await prisma.department.findFirst({
      where: {
        name: validated.name,
        id: { not: params.id },
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'ชื่อแผนกนี้มีอยู่แล้ว' },
        { status: 400 }
      )
    }

    const department = await prisma.department.update({
      where: { id: params.id },
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
    console.error('Update department error:', error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาด' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession()
    
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    await prisma.department.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete department error:', error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาด' },
      { status: 500 }
    )
  }
}

