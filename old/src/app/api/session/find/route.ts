import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const tableName = searchParams.get('tableName')

    if (!tableName) {
      return NextResponse.json(
        { error: 'กรุณาระบุชื่อโต๊ะ' },
        { status: 400 }
      )
    }

    // Find active session by table name
    const session = await prisma.tableSession.findFirst({
      where: {
        status: 'ACTIVE',
        table: {
          name: {
            contains: tableName,
            mode: 'insensitive', // Case-insensitive search for PostgreSQL
          },
        },
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
      },
      orderBy: {
        startTime: 'desc', // Get the most recent session
      },
    })

    if (!session) {
      return NextResponse.json(
        { error: 'ไม่พบ session ที่เปิดใช้งานสำหรับโต๊ะนี้' },
        { status: 404 }
      )
    }

    // Check if session has expired
    if (session.expireTime && new Date(session.expireTime) < new Date()) {
      return NextResponse.json(
        { error: 'Session หมดอายุแล้ว' },
        { status: 400 }
      )
    }

    return NextResponse.json({ session })
  } catch (error) {
    console.error('Error finding session:', error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' },
      { status: 500 }
    )
  }
}

