import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { logAction } from '@/lib/logger'

// Custom validator for logoUrl (only relative path, no external URLs)
const logoUrlSchema = z.preprocess(
  (val) => {
    // Normalize empty string to null
    if (val === '' || val === undefined) return null
    return val
  },
  z.union([
    z.null(),
    z.string().refine(
      (val) => val.startsWith('/'),
      { message: 'logoUrl must be a relative path starting with /' }
    ),
  ])
)

const updateRestaurantInfoSchema = z.object({
  name: z.string().min(1).optional(),
  address: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  logoUrl: logoUrlSchema.optional().nullable(),
  wifiName: z.string().optional().nullable(),
  wifiPassword: z.string().optional().nullable(),
  openTime: z.string().optional().nullable(),
  closeTime: z.string().optional().nullable(),
})

export async function GET() {
  try {
    let info = await prisma.restaurantInfo.findFirst()

    if (!info) {
      // Create default info if not exists
      info = await prisma.restaurantInfo.create({
        data: {
          name: 'Mooprompt Restaurant',
          address: '',
          phone: '',
        },
      })
    }

    return NextResponse.json({ info })
  } catch (error) {
    console.error('Error fetching restaurant info:', error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const data = updateRestaurantInfoSchema.parse(body)

    // Get existing info or create if not exists
    let info = await prisma.restaurantInfo.findFirst()

    if (!info) {
      info = await prisma.restaurantInfo.create({
        data: {
          name: data.name || 'Mooprompt Restaurant',
          address: data.address || null,
          phone: data.phone || null,
          logoUrl: data.logoUrl || null,
          wifiName: data.wifiName || null,
          wifiPassword: data.wifiPassword || null,
          openTime: data.openTime || null,
          closeTime: data.closeTime || null,
        },
      })
    } else {
      // Update existing info
      info = await prisma.restaurantInfo.update({
        where: { id: info.id },
        data: {
          ...(data.name !== undefined && { name: data.name }),
          ...(data.address !== undefined && { address: data.address || null }),
          ...(data.phone !== undefined && { phone: data.phone || null }),
          ...(data.logoUrl !== undefined && { logoUrl: data.logoUrl || null }),
          ...(data.wifiName !== undefined && { wifiName: data.wifiName || null }),
          ...(data.wifiPassword !== undefined && { wifiPassword: data.wifiPassword || null }),
          ...(data.openTime !== undefined && { openTime: data.openTime || null }),
          ...(data.closeTime !== undefined && { closeTime: data.closeTime || null }),
        },
      })
    }

    await logAction(null, 'UPDATE_RESTAURANT_INFO', {
      restaurantId: info.id,
      changes: data,
    })

    return NextResponse.json({ info })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'ข้อมูลไม่ถูกต้อง', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error updating restaurant info:', error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' },
      { status: 500 }
    )
  }
}

