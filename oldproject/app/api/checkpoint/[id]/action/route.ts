import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { emitToWork } from '@/lib/socket'
import { z } from 'zod'

const actionSchema = z.object({
  action: z.enum(['start', 'complete', 'return', 'problem']),
})

export async function POST(
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
    const validated = actionSchema.parse(body)

    const checkpoint = await prisma.checkpoint.findUnique({
      where: { id: params.id },
      include: {
        work: {
          include: {
            checkpoints: {
              orderBy: { order: 'asc' },
            },
          },
        },
        ownerDept: true,
      },
    })

    if (!checkpoint) {
      return NextResponse.json(
        { error: 'ไม่พบ checkpoint' },
        { status: 404 }
      )
    }

    // Validation: Check if user has permission (must be in owner department or ADMIN)
    const isAdmin = session.role === 'ADMIN'
    const isOwnerDept = session.departmentId === checkpoint.ownerDeptId
    if (!isAdmin && !isOwnerDept) {
      return NextResponse.json(
        { error: 'คุณไม่มีสิทธิ์ดำเนินการ checkpoint นี้ (ต้องเป็นสมาชิกของแผนกที่รับผิดชอบ)' },
        { status: 403 }
      )
    }

    // Validation: Check status is appropriate for action
    if (validated.action === 'start' && checkpoint.status !== 'PENDING') {
      return NextResponse.json(
        { error: `ไม่สามารถเริ่ม checkpoint ที่มีสถานะ "${checkpoint.status}" ได้` },
        { status: 400 }
      )
    }

    if (validated.action === 'complete' && checkpoint.status !== 'PROCESSING') {
      return NextResponse.json(
        { error: `ไม่สามารถเสร็จสิ้น checkpoint ที่มีสถานะ "${checkpoint.status}" ได้` },
        { status: 400 }
      )
    }

    if ((validated.action === 'return' || validated.action === 'problem') && checkpoint.status !== 'PROCESSING') {
      return NextResponse.json(
        { error: `ไม่สามารถ${validated.action === 'return' ? 'ส่งกลับ' : 'รายงานปัญหา'} checkpoint ที่มีสถานะ "${checkpoint.status}" ได้` },
        { status: 400 }
      )
    }

    // Validation: For 'start' action, check if previous checkpoints are completed
    if (validated.action === 'start') {
      const currentIndex = checkpoint.work.checkpoints.findIndex(cp => cp.id === checkpoint.id)
      if (currentIndex > 0) {
        const previousCheckpoints = checkpoint.work.checkpoints.slice(0, currentIndex)
        const incompletePrevious = previousCheckpoints.find(cp => cp.status !== 'COMPLETED')
        if (incompletePrevious) {
          return NextResponse.json(
            { error: `ไม่สามารถเริ่ม checkpoint นี้ได้ เนื่องจาก checkpoint ก่อนหน้านี้ "${incompletePrevious.name}" ยังไม่เสร็จสิ้น` },
            { status: 400 }
          )
        }
      }
    }

    let newStatus: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'RETURNED' | 'PROBLEM'
    let updateData: any = {}

    switch (validated.action) {
      case 'start':
        newStatus = 'PROCESSING'
        updateData.startedAt = new Date()
        break
      case 'complete':
        newStatus = 'COMPLETED'
        updateData.endedAt = new Date()
        if (!checkpoint.startedAt) {
          updateData.startedAt = new Date()
        }
        break
      case 'return':
        newStatus = 'RETURNED'
        break
      case 'problem':
        newStatus = 'PROBLEM'
        break
    }

    const updated = await prisma.checkpoint.update({
      where: { id: params.id },
      data: {
        status: newStatus,
        ...updateData,
      },
      include: {
        work: true,
        ownerDept: true,
      },
    })

    // Create activity log
    await prisma.activityLog.create({
      data: {
        userId: session.id,
        action: `CHECKPOINT_${validated.action.toUpperCase()}`,
        details: `${checkpoint.work.title} - ${checkpoint.name}: ${validated.action}`,
      },
    })

    // Emit real-time event
    emitToWork(checkpoint.workId, 'checkpoint:updated', updated)
    emitToWork(checkpoint.workId, 'activity:new', {
      id: `temp-${Date.now()}`,
      userId: session.id,
      user: {
        id: session.id,
        name: session.name || 'User',
        username: session.username || '',
      },
      action: `CHECKPOINT_${validated.action.toUpperCase()}`,
      details: `${checkpoint.work.title} - ${checkpoint.name}: ${validated.action}`,
      createdAt: new Date().toISOString(),
    })

    return NextResponse.json({ checkpoint: updated })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'ข้อมูลไม่ถูกต้อง', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Checkpoint action error:', error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาด' },
      { status: 500 }
    )
  }
}

