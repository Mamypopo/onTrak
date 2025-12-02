import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { z } from 'zod'

const createCheckpointSchema = z.object({
  templateId: z.string(),
  name: z.string().min(1),
  ownerDeptId: z.string(),
  order: z.number().int(),
})

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
    const validated = createCheckpointSchema.parse(body)

    const checkpoint = await prisma.templateCheckpoint.create({
      data: {
        templateId: validated.templateId,
        name: validated.name,
        ownerDeptId: validated.ownerDeptId,
        order: validated.order,
      },
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
    console.error('Create checkpoint error:', error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาด' },
      { status: 500 }
    )
  }
}

