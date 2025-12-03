import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logAction } from '@/lib/logger'
import { z } from 'zod'
import { emitSocketEvent } from '@/lib/socket'
import { determineItemType } from '@/lib/menu-item-type'

const createOrderSchema = z.object({
  tableSessionId: z.number().int().positive(),
  items: z.array(
    z.object({
      menuItemId: z.number().int().positive(),
      qty: z.number().int().positive(),
      note: z.string().optional(),
      itemType: z.enum(['BUFFET_INCLUDED', 'A_LA_CARTE']).optional(), // เพิ่ม itemType
    })
  ),
  note: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = createOrderSchema.parse(body)

    // Verify session exists and is active
    const session = await prisma.tableSession.findUnique({
      where: { id: data.tableSessionId },
      include: {
        package: true,
      },
    })

    if (!session || session.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'ไม่พบ session หรือ session ไม่ได้เปิดใช้งาน' },
        { status: 400 }
      )
    }

    // Check if session has expired
    if (session.expireTime && new Date(session.expireTime) < new Date()) {
      return NextResponse.json(
        { error: 'Session หมดอายุแล้ว ไม่สามารถสั่งอาหารได้' },
        { status: 400 }
      )
    }

    // ตรวจสอบว่าเป็น buffet หรือ à la carte
    const isBuffet = session.packageId !== null

    // Fetch menu items เพื่อตรวจสอบ properties
    const menuItemIds = data.items.map(item => item.menuItemId)
    const menuItems = await prisma.menuItem.findMany({
      where: { id: { in: menuItemIds } },
    })

    const menuItemMap = new Map(menuItems.map(item => [item.id, item]))

    // Create order with items
    const order = await prisma.order.create({
      data: {
        tableSessionId: data.tableSessionId,
        note: data.note,
        status: 'OPEN',
        items: {
          create: data.items.map((item) => {
            // กำหนด itemType: ใช้ที่ส่งมา หรือคำนวณใหม่ตาม logic
            let itemType: 'BUFFET_INCLUDED' | 'A_LA_CARTE' = item.itemType || 'A_LA_CARTE'
            
            // ถ้าไม่ได้ส่ง itemType มา ให้คำนวณตาม logic
            if (!item.itemType) {
              const menuItem = menuItemMap.get(item.menuItemId)
              if (menuItem) {
                const sessionType = isBuffet ? 'buffet' : 'a_la_carte'
                // determineItemType ต้องการ isFreeInBuffet แต่ถ้ายังไม่มีใน DB ให้ใช้ default
                itemType = determineItemType(sessionType, {
                  isFreeInBuffet: (menuItem as any).isFreeInBuffet ?? true,
                })
              }
            }
            
            return {
              menuItemId: item.menuItemId,
              qty: item.qty,
              note: item.note,
              status: 'WAITING',
              itemType,
            }
          }),
        },
      },
      include: {
        items: {
          include: {
            menuItem: true,
          },
        },
      },
    })

    await logAction(null, 'ORDER_CREATE', {
      orderId: order.id,
      tableSessionId: data.tableSessionId,
      itemCount: data.items.length,
    })

    // Emit socket event
    emitSocketEvent('order:new', { order })

    return NextResponse.json({ order }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'ข้อมูลไม่ถูกต้อง', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error creating order:', error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' },
      { status: 500 }
    )
  }
}
