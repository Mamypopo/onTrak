import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const orders = await prisma.order.findMany({
      where: {
        status: 'OPEN',
        items: {
          some: {
            status: {
              in: ['WAITING', 'COOKING', 'DONE'],
            },
          },
        },
      },
      include: {
        session: {
          include: {
            table: true,
          },
        },
        items: {
          where: {
            status: {
              in: ['WAITING', 'COOKING', 'DONE'],
            },
          },
          include: {
            menuItem: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json({ orders })
  } catch (error) {
    console.error('Error fetching kitchen orders:', error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' },
      { status: 500 }
    )
  }
}

