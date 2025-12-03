import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const sessionId = searchParams.get('sessionId')
    const search = searchParams.get('search') || ''

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId is required' },
        { status: 400 }
      )
    }

    // Fetch session เพื่อดูว่าเป็นบุฟเฟ่ต์หรือ à la carte และเช็คว่าหมดอายุหรือไม่
    let isBuffet = false
    let isExpired = false
    try {
      const sessionIdNum = parseInt(sessionId, 10)
      if (!isNaN(sessionIdNum)) {
        const session = await prisma.tableSession.findUnique({
          where: { id: sessionIdNum },
          select: { 
            packageId: true,
            expireTime: true,
            status: true,
          },
        })
        isBuffet = session?.packageId !== null
        // Check if session is expired
        if (session?.expireTime && new Date(session.expireTime) < new Date()) {
          isExpired = true
        }
      }
    } catch (error) {
      // ถ้า session ไม่พบหรือ error ก็ไม่เป็นไร (ใช้ default = à la carte)
      console.error('Error fetching session:', error)
    }

    // Build session type conditions
    const sessionConditions: any[] = []
    if (isBuffet) {
      // บุฟเฟ่ต์: แสดง item ที่ isBuffetItem = true หรือ isALaCarteItem = true
      sessionConditions.push(
        { isBuffetItem: true },
        { isALaCarteItem: true }
      )
    } else {
      // à la carte: แสดงแค่ item ที่ isALaCarteItem = true
      sessionConditions.push({ isALaCarteItem: true })
    }

    // Filter menu items ตาม session type และ search
    const where: any = {}
    
    // Combine session type with search
    if (search) {
      // If searching, combine search with session conditions using AND
      where.AND = [
        {
          OR: sessionConditions,
        },
        {
          name: {
            contains: search,
            mode: 'insensitive',
          },
        },
      ]
    } else {
      // If not searching, just use session conditions
      if (sessionConditions.length > 1) {
        where.OR = sessionConditions
      } else {
        Object.assign(where, sessionConditions[0])
      }
    }

    const categories = await prisma.menuCategory.findMany({
      include: {
        items: {
          where,
          orderBy: {
            name: 'asc',
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    })

    return NextResponse.json({
      categories,
      sessionType: isBuffet ? 'buffet' : 'a_la_carte',
      isExpired,
    })
  } catch (error) {
    console.error('Error fetching menu:', error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' },
      { status: 500 }
    )
  }
}

