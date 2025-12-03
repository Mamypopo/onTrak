import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logAction } from '@/lib/logger'
import { z } from 'zod'
import { PaymentMethod } from '@prisma/client'
import { emitSocketEvent } from '@/lib/socket'

const closeBillingSchema = z.object({
  sessionId: z.number().int().positive(),
  paymentMethod: z.enum(['CASH', 'QR']),
  extraChargeIds: z.array(z.number().int().positive()).optional(),
  // Discount: either select promotion or enter manually
  promotionId: z.number().int().positive().optional().nullable(),
  discountType: z.enum(['PERCENT', 'FIXED', 'PROMOTION']).optional().nullable(),
  discountValue: z.number().nonnegative().optional().nullable(), // For manual discount
  // VAT
  vatRate: z.number().nonnegative().optional().nullable(), // VAT rate percentage (e.g., 7 for 7%)
  // Cash payment
  receivedAmount: z.number().nonnegative().optional().nullable(), // Amount received (for CASH)
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      sessionId, 
      paymentMethod, 
      extraChargeIds,
      promotionId,
      discountType,
      discountValue,
      vatRate,
      receivedAmount,
    } = closeBillingSchema.parse(body)

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
        table: true,
      },
    })

    if (!session || session.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'ไม่พบ session หรือ session ไม่ได้เปิดใช้งาน' },
        { status: 400 }
      )
    }

    // ใช้ extraChargeIds จาก request หรือจาก session (ที่เลือกตอนเปิดโต๊ะ)
    const sessionExtraChargeIds = ((session as any).extraChargeIds as number[] | null) || []
    const finalExtraChargeIds = extraChargeIds || sessionExtraChargeIds

    // Calculate subtotal from orders
    let subtotal = 0
    const billingItems: Array<{
      name: string
      qty: number | null
      unitPrice: number
      totalPrice: number
      type: 'MENU' | 'EXTRA'
    }> = []

    for (const order of session.orders) {
      for (const item of order.items) {
        // คำนวณราคาตาม itemType
        // BUFFET_INCLUDED = ฟรี (ไม่คิดเงิน)
        // A_LA_CARTE = จ่ายตามราคา
        const unitPrice = item.itemType === 'BUFFET_INCLUDED' ? 0 : item.menuItem.price
        const itemTotal = unitPrice * item.qty
        subtotal += itemTotal
        
        billingItems.push({
          name: item.menuItem.name + (item.itemType === 'BUFFET_INCLUDED' ? ' (รวมในบุฟเฟ่ต์)' : ''),
          qty: item.qty,
          unitPrice,
          totalPrice: itemTotal,
          type: 'MENU',
        })
      }
    }

    // Add package cost if exists
    if (session.package) {
      const packageTotal = session.package.pricePerPerson * session.peopleCount
      subtotal += packageTotal
      billingItems.push({
        name: session.package.name,
        qty: session.peopleCount,
        unitPrice: session.package.pricePerPerson,
        totalPrice: packageTotal,
        type: 'MENU',
      })
    }

    // Calculate extra charges (only selected ones)
    let extraChargeTotal = 0
    if (finalExtraChargeIds.length > 0) {
      const extraCharges = await prisma.extraCharge.findMany({
        where: {
          id: { in: finalExtraChargeIds },
          active: true,
        },
      })

      for (const charge of extraCharges) {
        let chargeAmount = 0
        if (charge.chargeType === 'PER_PERSON') {
          chargeAmount = charge.price * session.peopleCount
        } else {
          chargeAmount = charge.price
        }
        extraChargeTotal += chargeAmount
        billingItems.push({
          name: charge.name,
          qty: charge.chargeType === 'PER_PERSON' ? session.peopleCount : 1,
          unitPrice: charge.price,
          totalPrice: chargeAmount,
          type: 'EXTRA',
        })
      }
    }

    // Calculate discount
    let discountTotal = 0
    let finalDiscountType: 'PERCENT' | 'FIXED' | 'PROMOTION' | null = null
    let finalDiscountValue: number | null = null
    let finalPromotionId: number | null = null

    if (promotionId) {
      // Use selected promotion
      const promotion = await prisma.promotion.findUnique({
        where: { id: promotionId },
      })
      
      if (promotion && promotion.active) {
        finalPromotionId = promotionId
        finalDiscountType = 'PROMOTION'
        finalDiscountValue = promotion.value
        
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
      // Manual discount
      finalDiscountType = discountType
      finalDiscountValue = discountValue
      
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

    // Calculate change (for CASH payment)
    const finalReceivedAmount = paymentMethod === 'CASH' && receivedAmount ? receivedAmount : null
    const change = finalReceivedAmount ? Math.max(0, finalReceivedAmount - grandTotal) : null

    // Create billing summary
    const billing = await prisma.billingSummary.create({
      data: {
        sessionId,
        subtotal,
        extraCharge: extraChargeTotal,
        discount: discountTotal,
        discountType: finalDiscountType as any,
        discountValue: finalDiscountValue,
        promotionId: finalPromotionId,
        vat: vatAmount,
        vatRate: finalVatRate > 0 ? finalVatRate : null,
        grandTotal,
        paymentMethod: paymentMethod as PaymentMethod,
        receivedAmount: finalReceivedAmount,
        change,
        items: {
          create: billingItems,
        },
      } as any,
      include: {
        items: true,
      },
    })

    // Mark all orders as served
    await prisma.order.updateMany({
      where: {
        tableSessionId: sessionId,
        status: 'OPEN',
      },
      data: {
        status: 'SERVED',
      },
    })

    // Mark all order items as served
    await prisma.orderItem.updateMany({
      where: {
        order: {
          tableSessionId: sessionId,
        },
      },
      data: {
        status: 'SERVED',
      },
    })

    // Close session
    await prisma.tableSession.update({
      where: { id: sessionId },
      data: { status: 'CLOSED' },
    })

    // Update table status
    await prisma.table.update({
      where: { id: session.tableId },
      data: { status: 'AVAILABLE' },
    })

    await logAction(null, 'CLOSE_BILLING', {
      sessionId,
      billingId: billing.id,
      grandTotal,
      paymentMethod,
    })

    // Emit socket event
    emitSocketEvent('billing:closed', { billing })

    return NextResponse.json({ billing }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'ข้อมูลไม่ถูกต้อง', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error closing billing:', error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' },
      { status: 500 }
    )
  }
}
