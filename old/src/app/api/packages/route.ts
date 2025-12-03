import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { logAction } from '@/lib/logger'

const createPackageSchema = z.object({
  name: z.string().min(1),
  pricePerPerson: z.number().positive(),
  durationMinutes: z.number().int().positive().optional().nullable(),
})

export async function GET() {
  try {
    const packages = await prisma.package.findMany({
      orderBy: {
        name: 'asc',
      },
    })

    return NextResponse.json({ packages })
  } catch (error) {
    console.error('Error fetching packages:', error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = createPackageSchema.parse(body)

    const packageData = await prisma.package.create({
      data: {
        name: data.name,
        pricePerPerson: data.pricePerPerson,
        durationMinutes: data.durationMinutes || null,
      },
    })

    await logAction(null, 'CREATE_PACKAGE', {
      packageId: packageData.id,
      name: packageData.name,
    })

    return NextResponse.json({ package: packageData }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'ข้อมูลไม่ถูกต้อง', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error creating package:', error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' },
      { status: 500 }
    )
  }
}

