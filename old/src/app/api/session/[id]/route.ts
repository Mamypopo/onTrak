import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionId = parseInt(params.id, 10)

    if (isNaN(sessionId)) {
      return NextResponse.json(
        { error: 'รหัส session ไม่ถูกต้อง' },
        { status: 400 }
      )
    }

    const session = await prisma.tableSession.findUnique({
      where: { id: sessionId },
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
            durationMinutes: true,
          },
        },
      },
    })

    // Fetch extra charges if session has extraChargeIds
    let extraCharges: any[] = []
    if (session?.extraChargeIds) {
      const extraChargeIds = Array.isArray(session.extraChargeIds)
        ? session.extraChargeIds.filter((id): id is number => typeof id === 'number')
        : []
      
      if (extraChargeIds.length > 0) {
        extraCharges = await prisma.extraCharge.findMany({
          where: {
            id: { in: extraChargeIds },
            active: true,
          },
          select: {
            id: true,
            name: true,
            price: true,
            chargeType: true,
          },
        })
      }
    }

    if (!session) {
      return NextResponse.json(
        { error: 'ไม่พบ session' },
        { status: 404 }
      )
    }

    // Check if session is active (แต่ยัง return session data เพื่อให้ดูออเดอร์เก่าได้)
    // ไม่ return error เพราะอาจต้องการดูออเดอร์เก่า
    const isActive = session.status === 'ACTIVE'
    const isExpired = session.expireTime && new Date(session.expireTime) < new Date()

    return NextResponse.json({ 
      session: {
        ...session,
        extraCharges,
      },
      isActive,
      isExpired,
    })
  } catch (error) {
    console.error('Error fetching session:', error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' },
      { status: 500 }
    )
  }
}

