import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const previewBillingSchema = z.object({
  sessionId: z.number().int().positive(),
  extraChargeIds: z.array(z.number().int().positive()).optional(),
  promotionId: z.number().int().positive().optional().nullable(),
  discountType: z.enum(['PERCENT', 'FIXED', 'PROMOTION']).optional().nullable(),
  discountValue: z.number().nonnegative().optional().nullable(),
  vatRate: z.number().nonnegative().optional().nullable(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      sessionId, 
      extraChargeIds,
      promotionId,
      discountType,
      discountValue,
      vatRate,
    } = previewBillingSchema.parse(body)

    const session = await prisma.tableSession.findUnique({
      where: { id: sessionId },
      include: {
        orders: {
          where: {
            status: 'OPEN',
          },
          include: {
            items: {
              include: {
                menuItem: true,
              },
            },
          },
        },
        package: true,
      },
    })

    if (!session || session.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'ไม่พบ session หรือ session ไม่ได้เปิดใช้งาน' },
        { status: 400 }
      )
    }

    // Calculate subtotal
    let subtotal = 0
    for (const order of session.orders) {
      for (const item of order.items) {
        const unitPrice = item.itemType === 'BUFFET_INCLUDED' ? 0 : item.menuItem.price
        subtotal += unitPrice * item.qty
      }
    }

    // Add package cost
    if (session.package) {
      subtotal += session.package.pricePerPerson * session.peopleCount
    }

    // Calculate extra charges
    const sessionExtraChargeIds = ((session as any).extraChargeIds as number[] | null) || []
    const finalExtraChargeIds = extraChargeIds || sessionExtraChargeIds
    let extraChargeTotal = 0
    
    if (finalExtraChargeIds.length > 0) {
      const extraCharges = await prisma.extraCharge.findMany({
        where: {
          id: { in: finalExtraChargeIds },
          active: true,
        },
      })

      for (const charge of extraCharges) {
        if (charge.chargeType === 'PER_PERSON') {
          extraChargeTotal += charge.price * session.peopleCount
        } else {
          extraChargeTotal += charge.price
        }
      }
    }

    // Calculate discount
    let discountTotal = 0
    if (promotionId) {
      const promotion = await prisma.promotion.findUnique({
        where: { id: promotionId },
      })
      
      if (promotion && promotion.active) {
        const condition = promotion.condition as any || {}
        const promoType = promotion.type as 'PERCENT' | 'FIXED' | 'PER_PERSON' | 'MIN_PEOPLE' | 'MIN_AMOUNT'
        
        if (promoType === 'PERCENT') {
          discountTotal = (subtotal * promotion.value) / 100
        } else if (promoType === 'FIXED') {
          discountTotal = promotion.value
        } else if (promoType === 'PER_PERSON') {
          // ลดรายคน: มา X จ่าย Y (ใช้กับ package price)
          if (session.package && condition.buy && condition.pay) {
            const freePeople = condition.buy - condition.pay
            discountTotal = session.package.pricePerPerson * freePeople
          }
        } else if (promoType === 'MIN_PEOPLE') {
          // ลดเมื่อมีคนขั้นต่ำ
          if (condition.minPeople && session.peopleCount >= condition.minPeople) {
            // ถ้า value <= 100 ให้คิดเป็น % ไม่งั้นคิดเป็นบาท
            if (promotion.value <= 100) {
              discountTotal = (subtotal * promotion.value) / 100
            } else {
              discountTotal = promotion.value
            }
          }
        } else if (promoType === 'MIN_AMOUNT') {
          // ลดเมื่อยอดขั้นต่ำ
          if (condition.minAmount && subtotal >= condition.minAmount) {
            // ถ้า value <= 100 ให้คิดเป็น % ไม่งั้นคิดเป็นบาท
            if (promotion.value <= 100) {
              discountTotal = (subtotal * promotion.value) / 100
            } else {
              discountTotal = promotion.value
            }
          }
        }
      }
    } else if (discountType && discountValue !== null && discountValue !== undefined) {
      if (discountType === 'PERCENT') {
        discountTotal = (subtotal * discountValue) / 100
      } else if (discountType === 'FIXED') {
        discountTotal = discountValue
      }
    }

    // Calculate VAT
    const finalVatRate = vatRate || 0
    const amountBeforeVat = subtotal + extraChargeTotal - discountTotal
    const vatAmount = (amountBeforeVat * finalVatRate) / 100

    // Calculate grand total
    const grandTotal = amountBeforeVat + vatAmount

    return NextResponse.json({
      subtotal,
      extraCharge: extraChargeTotal,
      discount: discountTotal,
      vat: vatAmount,
      vatRate: finalVatRate,
      grandTotal,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'ข้อมูลไม่ถูกต้อง', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error previewing billing:', error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' },
      { status: 500 }
    )
  }
}

