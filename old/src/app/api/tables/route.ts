import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logAction } from '@/lib/logger'
import { z } from 'zod'

// GET - ดึงรายการโต๊ะทั้งหมด
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    const where: any = {}
    if (status && (status === 'AVAILABLE' || status === 'OCCUPIED')) {
      where.status = status
    }

    const tables = await prisma.table.findMany({
      where,
      include: {
        sessions: {
          where: {
            status: 'ACTIVE',
          },
          take: 1,
          orderBy: {
            startTime: 'desc',
          },
          select: {
            id: true,
            peopleCount: true,
            startTime: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    })

    return NextResponse.json({ tables })
  } catch (error) {
    console.error('Error fetching tables:', error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' },
      { status: 500 }
    )
  }
}

// POST - สร้างโต๊ะใหม่
const createTableSchema = z.object({
  name: z.string().min(1),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = createTableSchema.parse(body)

    // Check if table name already exists
    const existingTable = await prisma.table.findFirst({
      where: {
        name: data.name,
      },
    })

    if (existingTable) {
      return NextResponse.json(
        { error: 'ชื่อโต๊ะนี้มีอยู่แล้ว' },
        { status: 400 }
      )
    }

    const table = await prisma.table.create({
      data: {
        name: data.name,
        status: 'AVAILABLE',
      },
    })

    await logAction(null, 'CREATE_TABLE', {
      tableId: table.id,
      name: data.name,
    })

    return NextResponse.json({ table }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'ข้อมูลไม่ถูกต้อง', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error creating table:', error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' },
      { status: 500 }
    )
  }
}

