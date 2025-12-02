import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { getSession } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    // Check authentication
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get file path - join all path segments
    const fileName = params.path.join('/')
    
    // Security: Prevent directory traversal
    if (fileName.includes('..') || fileName.startsWith('/')) {
      return NextResponse.json(
        { error: 'Invalid file path' },
        { status: 400 }
      )
    }

    // Construct file path
    const filePath = join(process.cwd(), 'uploads', fileName)

    try {
      // Read file
      const fileBuffer = await readFile(filePath)
      
      // Determine content type
      const ext = fileName.split('.').pop()?.toLowerCase()
      const contentType = getContentType(ext || '')

      // Return file with appropriate headers
      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `inline; filename="${fileName}"`,
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      })
    } catch (error) {
      console.error('File read error:', error)
      return NextResponse.json(
        { error: 'ไฟล์ไม่พบ' },
        { status: 404 }
      )
    }
  } catch (error) {
    console.error('Get file error:', error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาด' },
      { status: 500 }
    )
  }
}

function getContentType(ext: string): string {
  const contentTypes: Record<string, string> = {
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    txt: 'text/plain',
    zip: 'application/zip',
    rar: 'application/x-rar-compressed',
  }
  return contentTypes[ext] || 'application/octet-stream'
}

