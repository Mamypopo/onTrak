import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { z } from 'zod'

const updateWorkOrderSchema = z.object({
  company: z.string().min(1).optional(),
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  deadline: z.string().optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const workOrder = await prisma.workOrder.findUnique({
      where: { id: params.id },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
        checkpoints: {
          include: {
            ownerDept: true,
            comments: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    username: true,
                  },
                },
              },
              orderBy: {
                createdAt: 'desc',
              },
            },
          },
          orderBy: {
            order: 'asc',
          },
        },
        attachments: {
          include: {
            uploadedBy: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    })

    if (!workOrder) {
      return NextResponse.json(
        { error: 'ไม่พบงาน' },
        { status: 404 }
      )
    }

    return NextResponse.json({ workOrder })
  } catch (error) {
    console.error('Get work order error:', error)
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
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validated = updateWorkOrderSchema.parse(body)

    // Check if work order exists
    const existingWorkOrder = await prisma.workOrder.findUnique({
      where: { id: params.id },
    })

    if (!existingWorkOrder) {
      return NextResponse.json(
        { error: 'ไม่พบงาน' },
        { status: 404 }
      )
    }

    // Update work order
    const updateData: any = {}
    if (validated.company !== undefined) updateData.company = validated.company
    if (validated.title !== undefined) updateData.title = validated.title
    if (validated.description !== undefined) updateData.description = validated.description
    if (validated.priority !== undefined) updateData.priority = validated.priority
    if (validated.deadline !== undefined) {
      updateData.deadline = validated.deadline ? new Date(validated.deadline) : null
    }

    const workOrder = await prisma.workOrder.update({
      where: { id: params.id },
      data: updateData,
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
        checkpoints: {
          include: {
            ownerDept: true,
          },
          orderBy: {
            order: 'asc',
          },
        },
      },
    })

    // Create activity log
    await prisma.activityLog.create({
      data: {
        userId: session.id,
        action: 'UPDATE_WORK_ORDER',
        details: `แก้ไขงาน: ${workOrder.title}`,
      },
    })

    return NextResponse.json({ workOrder })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'ข้อมูลไม่ถูกต้อง', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Update work order error:', error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาด' },
      { status: 500 }
    )
  }
}

