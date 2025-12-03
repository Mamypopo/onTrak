import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logAction } from '@/lib/logger'
import { z } from 'zod'
import { emitSocketEvent } from '@/lib/socket'

const closeSessionSchema = z.object({
  sessionId: z.number().int().positive(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionId } = closeSessionSchema.parse(body)

    const session = await prisma.tableSession.findUnique({
      where: { id: sessionId },
      include: {
        table: true,
        orders: {
          where: {
            status: 'OPEN',
          },
        },
      },
    })

    if (!session) {
      return NextResponse.json(
        { error: 'ไม่พบ session' },
        { status: 404 }
      )
    }

    if (session.status === 'CLOSED') {
      return NextResponse.json(
        { error: 'Session ถูกปิดแล้ว' },
        { status: 400 }
      )
    }

    // Check if there are open orders
    if (session.orders.length > 0) {
      return NextResponse.json(
        { error: 'ไม่สามารถปิด session ที่มีออเดอร์ที่ยังเปิดอยู่ได้' },
        { status: 400 }
      )
    }

    // Close session
    await prisma.tableSession.update({
      where: { id: sessionId },
      data: { status: 'CLOSED' },
    })

    // Update table status
    await prisma.table.update({
      where: { id: session.tableId },
      data: { status: 'AVAILABLE' },
    })

    // Log as CANCEL_SESSION since there are no orders (cancelled before ordering)
    await logAction(null, 'CANCEL_SESSION', {
      sessionId,
      tableId: session.tableId,
      reason: 'No orders',
    })

    // Emit socket event
    emitSocketEvent('session:cancelled', { sessionId, tableId: session.tableId })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'ข้อมูลไม่ถูกต้อง', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error closing session:', error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' },
      { status: 500 }
    )
  }
}

