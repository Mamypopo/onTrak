import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logAction } from '@/lib/logger'
import { z } from 'zod'

const updateExtraChargeSchema = z.object({
  name: z.string().min(1).optional(),
  price: z.number().positive().optional(),
  chargeType: z.enum(['PER_PERSON', 'PER_SESSION']).optional(),
  active: z.boolean().optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const extraChargeId = parseInt(params.id)
    const extraCharge = await prisma.extraCharge.findUnique({
      where: { id: extraChargeId },
    })

    if (!extraCharge) {
      return NextResponse.json(
        { error: 'ไม่พบค่าบริการเพิ่มเติม' },
        { status: 404 }
      )
    }

    return NextResponse.json({ extraCharge })
  } catch (error) {
    console.error('Error fetching extra charge:', error)
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
    const extraChargeId = parseInt(params.id)
    const body = await request.json()
    const data = updateExtraChargeSchema.parse(body)

    // Check if extra charge exists
    const existingExtraCharge = await prisma.extraCharge.findUnique({
      where: { id: extraChargeId },
    })

    if (!existingExtraCharge) {
      return NextResponse.json(
        { error: 'ไม่พบค่าบริการเพิ่มเติม' },
        { status: 404 }
      )
    }

    const extraCharge = await prisma.extraCharge.update({
      where: { id: extraChargeId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.price !== undefined && { price: data.price }),
        ...(data.chargeType !== undefined && { chargeType: data.chargeType }),
        ...(data.active !== undefined && { active: data.active }),
      },
    })

    await logAction(null, 'UPDATE_EXTRA_CHARGE', {
      extraChargeId,
      changes: data,
    })

    return NextResponse.json({ extraCharge })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'ข้อมูลไม่ถูกต้อง', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error updating extra charge:', error)
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
    const extraChargeId = parseInt(params.id)

    // Check if extra charge exists
    const existingExtraCharge = await prisma.extraCharge.findUnique({
      where: { id: extraChargeId },
    })

    if (!existingExtraCharge) {
      return NextResponse.json(
        { error: 'ไม่พบค่าบริการเพิ่มเติม' },
        { status: 404 }
      )
    }

    await prisma.extraCharge.delete({
      where: { id: extraChargeId },
    })

    await logAction(null, 'DELETE_EXTRA_CHARGE', {
      extraChargeId,
      name: existingExtraCharge.name,
    })

    return NextResponse.json({ message: 'ลบค่าบริการเพิ่มเติมสำเร็จ' })
  } catch (error) {
    console.error('Error deleting extra charge:', error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' },
      { status: 500 }
    )
  }
}

