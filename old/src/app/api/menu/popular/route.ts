import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '6', 10)
    const sessionId = searchParams.get('sessionId')

    // Fetch session เพื่อดูว่าเป็นบุฟเฟ่ต์หรือ à la carte
    let isBuffet = false
    if (sessionId) {
      try {
        const sessionIdNum = parseInt(sessionId, 10)
        if (!isNaN(sessionIdNum)) {
          const session = await prisma.tableSession.findUnique({
            where: { id: sessionIdNum },
            select: { packageId: true },
          })
          isBuffet = session?.packageId !== null
        }
      } catch (error) {
        console.error('Error fetching session:', error)
      }
    }

    // Build session type conditions
    const sessionConditions: any[] = []
    if (isBuffet) {
      sessionConditions.push(
        { isBuffetItem: true },
        { isALaCarteItem: true }
      )
    } else {
      sessionConditions.push({ isALaCarteItem: true })
    }

    // Get popular items - ใช้ isPopular = true (กำหนดเอง) หรือ order count (fallback)
    const whereCondition: any = {
      isAvailable: true,
      OR: sessionConditions.length > 1 ? sessionConditions : undefined,
      ...(sessionConditions.length === 1 ? sessionConditions[0] : {}),
    }

    // ดึงเมนูที่ isPopular = true เท่านั้น (ไม่มี fallback)
    const popularItems = await prisma.menuItem.findMany({
      where: {
        ...whereCondition,
        isPopular: true,
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      take: limit,
    })

    const sortedItems = popularItems.map(item => ({
      id: item.id,
      name: item.name,
      price: item.price,
      imageUrl: item.imageUrl,
      isAvailable: item.isAvailable,
      isBuffetItem: item.isBuffetItem,
      isALaCarteItem: item.isALaCarteItem,
      category: item.category,
    }))

    return NextResponse.json({ items: sortedItems })
  } catch (error) {
    console.error('Error fetching popular items:', error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' },
      { status: 500 }
    )
  }
}

