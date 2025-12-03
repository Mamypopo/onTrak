import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { logAction } from '@/lib/logger'
import { emitSocketEvent } from '@/lib/socket'

// Custom validator for imageUrl (only relative path, no external URLs)
const imageUrlSchema = z.preprocess(
  (val) => {
    // Normalize empty string to null
    if (val === '' || val === undefined) return null
    return val
  },
  z.union([
    z.null(),
    z.string().refine(
      (val) => val.startsWith('/'),
      { message: 'imageUrl must be a relative path starting with /' }
    ),
  ])
)

const updateMenuItemSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  price: z.number().positive().optional(),
  imageUrl: imageUrlSchema.optional().nullable(),
  isAvailable: z.boolean().optional(),
  menuCategoryId: z.number().int().positive().optional(),
  isBuffetItem: z.boolean().optional(),
  isALaCarteItem: z.boolean().optional(),
  isFreeInBuffet: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  isPopular: z.boolean().optional(),
})

// GET - Get single menu item
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const itemId = parseInt(params.id, 10)

    if (isNaN(itemId)) {
      return NextResponse.json(
        { error: 'รหัสเมนูไม่ถูกต้อง' },
        { status: 400 }
      )
    }

    const item = await prisma.menuItem.findUnique({
      where: { id: itemId },
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    if (!item) {
      return NextResponse.json(
        { error: 'ไม่พบเมนู' },
        { status: 404 }
      )
    }

    return NextResponse.json({ item })
  } catch (error) {
    console.error('Error fetching menu item:', error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' },
      { status: 500 }
    )
  }
}

// PATCH - Update menu item
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const itemId = parseInt(params.id, 10)

    if (isNaN(itemId)) {
      return NextResponse.json(
        { error: 'รหัสเมนูไม่ถูกต้อง' },
        { status: 400 }
      )
    }

    const body = await request.json()
    
    // Log for debugging
    console.log('Update menu item payload:', JSON.stringify(body, null, 2))
    
    // Pre-process body to handle edge cases before validation
    const processedBody: any = { ...body }
    
    // Only normalize imageUrl if it's explicitly provided in the request
    // If imageUrl is not in the request body, don't touch it
    if ('imageUrl' in processedBody) {
      // Normalize imageUrl: convert empty string to null
      if (processedBody.imageUrl === '' || processedBody.imageUrl === undefined) {
        processedBody.imageUrl = null
      }
    }
    
    // Remove undefined values to avoid validation issues
    Object.keys(processedBody).forEach(key => {
      if (processedBody[key] === undefined && key !== 'imageUrl') {
        delete processedBody[key]
      }
    })
    
    const data = updateMenuItemSchema.parse(processedBody)

    // Only normalize imageUrl if it was explicitly provided
    const normalizedImageUrl = 'imageUrl' in data 
      ? (data.imageUrl === '' || data.imageUrl === undefined ? null : data.imageUrl)
      : undefined
    
    // Normalize description: convert empty string to null
    const normalizedDescription = 'description' in data
      ? (data.description === '' || data.description === undefined ? null : data.description)
      : undefined

    const item = await prisma.menuItem.update({
      where: { id: itemId },
      data: {
        ...(data.name && { name: data.name }),
        ...('description' in data && { description: normalizedDescription }),
        ...(data.price !== undefined && { price: data.price }),
        // Only update imageUrl if it was explicitly provided in the request
        ...('imageUrl' in data && { imageUrl: normalizedImageUrl }),
        ...(data.isAvailable !== undefined && { isAvailable: data.isAvailable }),
        ...(data.menuCategoryId && { menuCategoryId: data.menuCategoryId }),
        ...(data.isBuffetItem !== undefined && { isBuffetItem: data.isBuffetItem }),
        ...(data.isALaCarteItem !== undefined && { isALaCarteItem: data.isALaCarteItem }),
        ...(data.isFreeInBuffet !== undefined && { isFreeInBuffet: data.isFreeInBuffet }),
        ...(data.isFeatured !== undefined && { isFeatured: data.isFeatured }),
        ...(data.isPopular !== undefined && { isPopular: data.isPopular }),
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    await logAction(null, 'UPDATE_MENU_ITEM', {
      itemId: item.id,
      name: item.name,
    })

    // Emit socket event when availability changes
    if (data.isAvailable !== undefined) {
      emitSocketEvent('menu:unavailable', {
        menuItemId: item.id,
        isAvailable: item.isAvailable,
      })
    }

    return NextResponse.json({ item })
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Zod validation error:', error.errors)
      return NextResponse.json(
        { error: 'ข้อมูลไม่ถูกต้อง', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error updating menu item:', error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' },
      { status: 500 }
    )
  }
}

// DELETE - Delete menu item
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const itemId = parseInt(params.id, 10)

    if (isNaN(itemId)) {
      return NextResponse.json(
        { error: 'รหัสเมนูไม่ถูกต้อง' },
        { status: 400 }
      )
    }

    const item = await prisma.menuItem.findUnique({
      where: { id: itemId },
    })

    if (!item) {
      return NextResponse.json(
        { error: 'ไม่พบเมนู' },
        { status: 404 }
      )
    }

    await prisma.menuItem.delete({
      where: { id: itemId },
    })

    await logAction(null, 'DELETE_MENU_ITEM', {
      itemId: item.id,
      name: item.name,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting menu item:', error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' },
      { status: 500 }
    )
  }
}

