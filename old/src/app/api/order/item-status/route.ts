import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logAction } from '@/lib/logger'
import { z } from 'zod'
import { KitchenStatus } from '@prisma/client'
import { emitSocketEvent } from '@/lib/socket'

const updateItemStatusSchema = z.object({
  orderItemId: z.number().int().positive(),
  status: z.enum(['WAITING', 'COOKING', 'DONE', 'SERVED']),
})

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { orderItemId, status } = updateItemStatusSchema.parse(body)

    const orderItem = await prisma.orderItem.findUnique({
      where: { id: orderItemId },
      include: {
        order: true,
      },
    })

    if (!orderItem) {
      return NextResponse.json(
        { error: 'ไม่พบรายการออเดอร์' },
        { status: 404 }
      )
    }

    const updatedItem = await prisma.orderItem.update({
      where: { id: orderItemId },
      data: { status: status as KitchenStatus },
      include: {
        menuItem: true,
        order: {
          include: {
            session: {
              include: {
                table: true,
              },
            },
          },
        },
      },
    })

    const actionMap: Record<KitchenStatus, string> = {
      WAITING: 'ORDER_WAITING',
      COOKING: 'ORDER_COOKING',
      DONE: 'ORDER_DONE',
      SERVED: 'ORDER_SERVED',
    }

    await logAction(null, actionMap[status as KitchenStatus], {
      orderItemId,
      orderId: orderItem.orderId,
      status,
    })

    // Emit socket event
    emitSocketEvent(`order:${status.toLowerCase()}`, {
      orderItemId,
      orderItem: updatedItem,
    })

    return NextResponse.json({ orderItem: updatedItem })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'ข้อมูลไม่ถูกต้อง', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error updating order item status:', error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' },
      { status: 500 }
    )
  }
}
