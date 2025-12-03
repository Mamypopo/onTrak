import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const sessions = await prisma.tableSession.findMany({
      where: {
        status: 'ACTIVE',
      },
      include: {
        table: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
        package: {
          select: {
            id: true,
            name: true,
            pricePerPerson: true,
          },
        },
        orders: {
          where: {
            status: 'OPEN',
          },
          select: {
            id: true,
          },
        },
        _count: {
          select: {
            orders: true,
          },
        },
      },
      orderBy: {
        startTime: 'desc',
      },
    })

    // Parse extraChargeIds from JSON (Prisma returns JSON as object/array, normalize to array)
    const sessionsWithParsedExtraCharges = sessions.map(session => {
      let extraChargeIds: number[] | null = null
      if (session.extraChargeIds) {
        if (Array.isArray(session.extraChargeIds)) {
          extraChargeIds = session.extraChargeIds.filter((id): id is number => typeof id === 'number')
        }
      }
      return {
        ...session,
        extraChargeIds,
      }
    })

    return NextResponse.json({ sessions: sessionsWithParsedExtraCharges })
  } catch (error) {
    console.error('Error fetching active sessions:', error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' },
      { status: 500 }
    )
  }
}

