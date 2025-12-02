import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { z } from 'zod'

const updateCheckpointSchema = z.object({
  name: z.string().min(1).optional(),
  ownerDeptId: z.string().optional(),
  order: z.number().int().optional(),
})

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
    const validated = updateCheckpointSchema.parse(body)

    const updateData: any = {}
    if (validated.name) updateData.name = validated.name
    if (validated.ownerDeptId) updateData.ownerDeptId = validated.ownerDeptId
    if (validated.order !== undefined) updateData.order = validated.order

    const checkpoint = await prisma.templateCheckpoint.update({
      where: { id: params.id },
      data: updateData,
      include: {
        ownerDept: true,
      },
    })

    return NextResponse.json({ checkpoint })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'ข้อมูลไม่ถูกต้อง', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Update checkpoint error:', error)
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

    await prisma.templateCheckpoint.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete checkpoint error:', error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาด' },
      { status: 500 }
    )
  }
}

