import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { z } from 'zod'

const createWorkOrderSchema = z.object({
  company: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  deadline: z.string().optional(),
  templateId: z.string(),
})

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const departmentId = searchParams.get('departmentId')
    const status = searchParams.get('status')
    const company = searchParams.get('company')
    const priority = searchParams.get('priority')

    const where: any = {}

    if (departmentId) {
      where.checkpoints = {
        some: {
          ownerDeptId: departmentId,
        },
      }
    }

    if (status) {
      where.checkpoints = {
        ...where.checkpoints,
        some: {
          status: status,
        },
      }
    }

    if (company) {
      where.company = {
        contains: company,
        mode: 'insensitive',
      }
    }

    if (priority) {
      where.priority = priority
    }

    const workOrders = await prisma.workOrder.findMany({
      where,
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
        _count: {
          select: {
            checkpoints: true,
            attachments: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json({ workOrders })
  } catch (error) {
    console.error('Get work orders error:', error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาด' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validated = createWorkOrderSchema.parse(body)

    // Get template with checkpoints
    const template = await prisma.template.findUnique({
      where: { id: validated.templateId },
      include: {
        checkpoints: {
          orderBy: {
            order: 'asc',
          },
        },
      },
    })

    if (!template) {
      return NextResponse.json(
        { error: 'ไม่พบเทมเพลต' },
        { status: 404 }
      )
    }

    // Create work order and clone checkpoints
    const workOrder = await prisma.workOrder.create({
      data: {
        company: validated.company,
        title: validated.title,
        description: validated.description,
        priority: validated.priority || 'MEDIUM',
        deadline: validated.deadline ? new Date(validated.deadline) : null,
        createdById: session.id,
        checkpoints: {
          create: template.checkpoints.map((cp) => ({
            order: cp.order,
            name: cp.name,
            ownerDeptId: cp.ownerDeptId,
            status: 'PENDING',
          })),
        },
      },
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
        action: 'CREATE_WORK_ORDER',
        details: `สร้างงาน: ${workOrder.title}`,
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
    console.error('Create work order error:', error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาด' },
      { status: 500 }
    )
  }
}

