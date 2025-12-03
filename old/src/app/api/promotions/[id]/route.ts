import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logAction } from '@/lib/logger'
import { z } from 'zod'

const updatePromotionSchema = z.object({
  name: z.string().min(1).optional(),
  type: z.enum(['PERCENT', 'FIXED', 'PER_PERSON', 'MIN_PEOPLE', 'MIN_AMOUNT']).optional(),
  value: z.number().min(0).optional(), // PER_PERSON can be 0
  condition: z.any().optional().nullable(),
  active: z.boolean().optional(),
}).refine((data) => {
  // If value is provided and type is not PER_PERSON, it must be positive
  if (data.value !== undefined && data.type !== undefined && data.type !== 'PER_PERSON') {
    return data.value > 0
  }
  // If value is provided but type is PER_PERSON, 0 is allowed
  if (data.value !== undefined && data.type === 'PER_PERSON') {
    return data.value >= 0
  }
  // If only value is provided without type, check if it's positive
  if (data.value !== undefined && data.type === undefined) {
    return data.value > 0
  }
  return true
}, {
  message: 'ค่าส่วนลดต้องมากกว่า 0',
  path: ['value'],
})

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const promotionId = parseInt(params.id, 10)
    
    if (isNaN(promotionId)) {
      return NextResponse.json(
        { error: 'รหัสโปรโมชั่นไม่ถูกต้อง' },
        { status: 400 }
      )
    }

    const promotion = await prisma.promotion.findUnique({
      where: { id: promotionId },
    })

    if (!promotion) {
      return NextResponse.json(
        { error: 'ไม่พบโปรโมชั่น' },
        { status: 404 }
      )
    }

    return NextResponse.json({ promotion })
  } catch (error) {
    console.error('Error fetching promotion:', error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const promotionId = parseInt(params.id, 10)
    
    if (isNaN(promotionId)) {
      return NextResponse.json(
        { error: 'รหัสโปรโมชั่นไม่ถูกต้อง' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const data = updatePromotionSchema.parse(body)

    // Check if promotion exists
    const existingPromotion = await prisma.promotion.findUnique({
      where: { id: promotionId },
    })

    if (!existingPromotion) {
      return NextResponse.json(
        { error: 'ไม่พบโปรโมชั่น' },
        { status: 404 }
      )
    }

    const promotion = await prisma.promotion.update({
      where: { id: promotionId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.type !== undefined && { type: data.type as any }), // Type assertion for PromoType enum
        ...(data.value !== undefined && { value: data.value }),
        ...(data.condition !== undefined && { condition: data.condition || null }),
        ...(data.active !== undefined && { active: data.active }),
      },
    })

    await logAction(null, 'UPDATE_PROMOTION', {
      promotionId,
      changes: data,
    })

    return NextResponse.json({ promotion })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'ข้อมูลไม่ถูกต้อง', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error updating promotion:', error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const promotionId = parseInt(params.id, 10)
    
    if (isNaN(promotionId)) {
      return NextResponse.json(
        { error: 'รหัสโปรโมชั่นไม่ถูกต้อง' },
        { status: 400 }
      )
    }

    // Check if promotion exists
    const existingPromotion = await prisma.promotion.findUnique({
      where: { id: promotionId },
    })

    if (!existingPromotion) {
      return NextResponse.json(
        { error: 'ไม่พบโปรโมชั่น' },
        { status: 404 }
      )
    }

    await prisma.promotion.delete({
      where: { id: promotionId },
    })

    await logAction(null, 'DELETE_PROMOTION', {
      promotionId,
      name: existingPromotion.name,
    })

    return NextResponse.json({ message: 'ลบโปรโมชั่นสำเร็จ' })
  } catch (error) {
    console.error('Error deleting promotion:', error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' },
      { status: 500 }
    )
  }
}

