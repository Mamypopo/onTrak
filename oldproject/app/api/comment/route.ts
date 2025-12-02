import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { emitToWork } from '@/lib/socket'
import { z } from 'zod'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'

const createCommentSchema = z.object({
  checkpointId: z.string().optional(),
  workId: z.string().optional(),
  message: z.string().optional(),
  fileUrl: z.string().optional(),
  parentId: z.string().optional(),
  mentionedUserIds: z.array(z.string()).optional(),
})

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const checkpointId = searchParams.get('checkpointId')
    const workId = searchParams.get('workId')

    if (!checkpointId && !workId) {
      return NextResponse.json(
        { error: 'กรุณาระบุ checkpointId หรือ workId' },
        { status: 400 }
      )
    }

    const where: any = {}
    if (checkpointId) {
      where.checkpointId = checkpointId
    }
    if (workId) {
      where.workId = workId
    }
    // Only get top-level comments (no parent)
    where.parentId = null

    const comments = await prisma.comment.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
        checkpoint: {
          select: {
            id: true,
            name: true,
          },
        },
        work: {
          select: {
            id: true,
            title: true,
          },
        },
        replies: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                username: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    })

    return NextResponse.json({ comments })
  } catch (error: any) {
    console.error('Get comments error:', error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาด', details: error?.message || 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const formData = await request.formData()
    const checkpointId = formData.get('checkpointId') as string | null
    const workId = formData.get('workId') as string | null
    const message = formData.get('message') as string | null
    const file = formData.get('file') as File | null
    const parentId = formData.get('parentId') as string | null
    const mentionedUserIdsStr = formData.get('mentionedUserIds') as string | null
    const mentionedUserIds = mentionedUserIdsStr ? JSON.parse(mentionedUserIdsStr) : []

    if (!checkpointId && !workId) {
      return NextResponse.json(
        { error: 'กรุณาระบุ checkpointId หรือ workId' },
        { status: 400 }
      )
    }

    if (!message?.trim() && !file) {
      return NextResponse.json(
        { error: 'กรุณากรอกข้อความหรืออัปโหลดไฟล์' },
        { status: 400 }
      )
    }

    let fileUrl: string | undefined

    // Handle file upload
    if (file) {
      try {
        // Create uploads directory if it doesn't exist
        const uploadsDir = join(process.cwd(), 'uploads')
        await mkdir(uploadsDir, { recursive: true })

        // Generate unique filename
        const timestamp = Date.now()
        const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
        const fileName = `${timestamp}-${sanitizedFileName}`
        const filePath = join(uploadsDir, fileName)

        // Convert File to Buffer and save
        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)
        await writeFile(filePath, buffer)

        // Store URL for database
        fileUrl = `/api/uploads/${fileName}`
      } catch (error) {
        console.error('File upload error:', error)
        return NextResponse.json(
          { error: 'ไม่สามารถอัปโหลดไฟล์ได้' },
          { status: 500 }
        )
      }
    }

    // If replying, get parent comment's workId/checkpointId
    let finalWorkId = workId || null
    let finalCheckpointId = checkpointId || null
    
    if (parentId) {
      const parentComment = await prisma.comment.findUnique({
        where: { id: parentId },
        select: {
          workId: true,
          checkpointId: true,
        },
      })
      if (parentComment) {
        finalWorkId = parentComment.workId || finalWorkId
        finalCheckpointId = parentComment.checkpointId || finalCheckpointId
      }
    }

    const commentData: any = {
      userId: session.id,
      message: message?.trim() || undefined,
      fileUrl,
      mentionedUserIds: mentionedUserIds.length > 0 ? mentionedUserIds : [],
    }

    if (finalCheckpointId) {
      commentData.checkpointId = finalCheckpointId
    }
    if (finalWorkId) {
      commentData.workId = finalWorkId
    }
    if (parentId) {
      commentData.parentId = parentId
    }

    const comment = await prisma.comment.create({
      data: commentData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
        checkpoint: {
          select: {
            id: true,
            name: true,
            work: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
        work: {
          select: {
            id: true,
            title: true,
          },
        },
        parent: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                username: true,
              },
            },
          },
        },
      },
    })

    // Create activity log - fetch work and checkpoint separately if needed
    let workTitle = ''
    let checkpointName = ''
    
    if (finalWorkId) {
      const work = await prisma.workOrder.findUnique({
        where: { id: finalWorkId },
        select: { title: true },
      })
      workTitle = work?.title || ''
    }
    
    if (finalCheckpointId) {
      const checkpoint = await prisma.checkpoint.findUnique({
        where: { id: finalCheckpointId },
        select: { name: true },
      })
      checkpointName = checkpoint?.name || ''
    }
    
    const logDetails = finalCheckpointId 
      ? `คอมเมนต์ใน: ${workTitle} - ${checkpointName}`
      : `คอมเมนต์ในงาน: ${workTitle}`
    
    await prisma.activityLog.create({
      data: {
        userId: session.id,
        action: 'ADD_COMMENT',
        details: logDetails,
      },
    })

    // Emit real-time event
    if (workId) {
      emitToWork(workId, 'comment:new', comment)
    } else if (checkpointId) {
      // Get workId from checkpoint
      const checkpoint = await prisma.checkpoint.findUnique({
        where: { id: checkpointId },
        select: { workId: true },
      })
      if (checkpoint) {
        emitToWork(checkpoint.workId, 'comment:new', comment)
      }
    }

    return NextResponse.json({ comment })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'ข้อมูลไม่ถูกต้อง', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Create comment error:', error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาด' },
      { status: 500 }
    )
  }
}

