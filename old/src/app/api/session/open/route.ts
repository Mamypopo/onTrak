import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logAction } from '@/lib/logger'
import { z } from 'zod'
import { emitSocketEvent } from '@/lib/socket'

const openSessionSchema = z.object({
  tableId: z.number().int().positive(),
  peopleCount: z.number().int().positive(),
  packageId: z.number().int().positive().optional(),
  extraChargeIds: z.array(z.number().int().positive()).optional().default([]),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = openSessionSchema.parse(body)
    const extraChargeIds = data.extraChargeIds || []

    // Check if table is available
    const table = await prisma.table.findUnique({
      where: { id: data.tableId },
    })

    if (!table) {
      return NextResponse.json(
        { error: 'ไม่พบโต๊ะ' },
        { status: 404 }
      )
    }

    if (table.status !== 'AVAILABLE') {
      return NextResponse.json(
        { error: 'โต๊ะนี้ถูกใช้งานอยู่แล้ว' },
        { status: 400 }
      )
    }

    // Calculate expire time if package has duration
    let expireTime: Date | null = null
    if (data.packageId) {
      const packageData = await prisma.package.findUnique({
        where: { id: data.packageId },
      })
      if (packageData?.durationMinutes) {
        expireTime = new Date()
        expireTime.setMinutes(
          expireTime.getMinutes() + packageData.durationMinutes
        )
      }
    }

    // Create session
    const session = await prisma.tableSession.create({
      data: {
        tableId: data.tableId,
        peopleCount: data.peopleCount,
        packageId: data.packageId,
        startTime: new Date(),
        expireTime,
        status: 'ACTIVE',
        extraChargeIds: extraChargeIds.length > 0 ? extraChargeIds : null,
      },
      include: {
        table: true,
        package: true,
      },
    })

    // Update table status
    await prisma.table.update({
      where: { id: data.tableId },
      data: { status: 'OCCUPIED' },
    })

    await logAction(null, 'OPEN_TABLE', {
      sessionId: session.id,
      tableId: data.tableId,
      peopleCount: data.peopleCount,
    })

    // Emit socket event
    emitSocketEvent('session:opened', { session })

    return NextResponse.json({ session }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'ข้อมูลไม่ถูกต้อง', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error opening session:', error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' },
      { status: 500 }
    )
  }
}
