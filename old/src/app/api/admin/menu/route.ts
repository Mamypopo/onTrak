import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search') || ''

    // Filter menu items ตาม search เท่านั้น (ไม่ filter ตาม session type)
    const where: any = {}
    
    if (search) {
      where.name = {
        contains: search,
        mode: 'insensitive',
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
    })
  } catch (error) {
    console.error('Error fetching menu:', error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' },
      { status: 500 }
    )
  }
}

