import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logAction } from '@/lib/logger'
import { z } from 'zod'

const updatePackageSchema = z.object({
  name: z.string().min(1).optional(),
  pricePerPerson: z.number().positive().optional(),
  durationMinutes: z.number().int().positive().optional().nullable(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const packageId = parseInt(params.id)
    const packageData = await prisma.package.findUnique({
      where: { id: packageId },
    })

    if (!packageData) {
      return NextResponse.json(
        { error: 'ไม่พบแพ็กเกจ' },
        { status: 404 }
      )
    }

    return NextResponse.json({ package: packageData })
  } catch (error) {
    console.error('Error fetching package:', error)
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
    const packageId = parseInt(params.id)
    const body = await request.json()
    const data = updatePackageSchema.parse(body)

    // Check if package exists
    const existingPackage = await prisma.package.findUnique({
      where: { id: packageId },
    })

    if (!existingPackage) {
      return NextResponse.json(
        { error: 'ไม่พบแพ็กเกจ' },
        { status: 404 }
      )
    }

    const packageData = await prisma.package.update({
      where: { id: packageId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.pricePerPerson !== undefined && { pricePerPerson: data.pricePerPerson }),
        ...(data.durationMinutes !== undefined && { durationMinutes: data.durationMinutes || null }),
      },
    })

    await logAction(null, 'UPDATE_PACKAGE', {
      packageId,
      changes: data,
    })

    return NextResponse.json({ package: packageData })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'ข้อมูลไม่ถูกต้อง', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error updating package:', error)
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
    const packageId = parseInt(params.id)

    // Check if package exists
    const existingPackage = await prisma.package.findUnique({
      where: { id: packageId },
      include: {
        sessions: true,
      },
    })

    if (!existingPackage) {
      return NextResponse.json(
        { error: 'ไม่พบแพ็กเกจ' },
        { status: 404 }
      )
    }

    // Check if package is being used in active sessions
    if (existingPackage.sessions.length > 0) {
      return NextResponse.json(
        { error: 'ไม่สามารถลบแพ็กเกจได้ เนื่องจากยังมีการใช้งานอยู่' },
        { status: 400 }
      )
    }

    await prisma.package.delete({
      where: { id: packageId },
    })

    await logAction(null, 'DELETE_PACKAGE', {
      packageId,
      name: existingPackage.name,
    })

    return NextResponse.json({ message: 'ลบแพ็กเกจสำเร็จ' })
  } catch (error) {
    console.error('Error deleting package:', error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' },
      { status: 500 }
    )
  }
}

