import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { logAction } from '@/lib/logger'

const createExtraChargeSchema = z.object({
  name: z.string().min(1),
  price: z.number().positive(),
  chargeType: z.enum(['PER_PERSON', 'PER_SESSION']),
  active: z.boolean().default(true),
})

export async function GET() {
  try {
    const extraCharges = await prisma.extraCharge.findMany({
      orderBy: {
        name: 'asc',
      },
    })

    return NextResponse.json({ extraCharges })
  } catch (error) {
    console.error('Error fetching extra charges:', error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = createExtraChargeSchema.parse(body)

    const extraCharge = await prisma.extraCharge.create({
      data: {
        name: data.name,
        price: data.price,
        chargeType: data.chargeType,
        active: data.active,
      },
    })

    await logAction(null, 'CREATE_EXTRA_CHARGE', {
      extraChargeId: extraCharge.id,
      name: extraCharge.name,
    })

    return NextResponse.json({ extraCharge }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'ข้อมูลไม่ถูกต้อง', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error creating extra charge:', error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' },
      { status: 500 }
    )
  }
}

