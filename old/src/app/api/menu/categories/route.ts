import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { logAction } from '@/lib/logger'

const createCategorySchema = z.object({
  name: z.string().min(1),
})

const updateCategorySchema = z.object({
  name: z.string().min(1),
})

// GET - Get all categories
export async function GET() {
  try {
    const categories = await prisma.menuCategory.findMany({
      include: {
        items: {
          orderBy: {
            name: 'asc',
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    })

    return NextResponse.json({ categories })
  } catch (error) {
    console.error('Error fetching categories:', error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' },
      { status: 500 }
    )
  }
}

// POST - Create category
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = createCategorySchema.parse(body)

    const category = await prisma.menuCategory.create({
      data: {
        name: data.name,
      },
    })

    await logAction(null, 'CREATE_MENU_CATEGORY', {
      categoryId: category.id,
      name: category.name,
    })

    return NextResponse.json({ category }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'ข้อมูลไม่ถูกต้อง', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error creating category:', error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' },
      { status: 500 }
    )
  }
}

