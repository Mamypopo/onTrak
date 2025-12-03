import { NextRequest, NextResponse } from 'next/server'
import QRCode from 'qrcode'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json(
        { error: 'กรุณาระบุ Session ID' },
        { status: 400 }
      )
    }

    // Get the base URL
    // Use NEXT_PUBLIC_BASE_URL from env if available, otherwise use request host
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
                    (() => {
                      const protocol = request.headers.get('x-forwarded-proto') || 'http'
                      const host = request.headers.get('host') || 'localhost:3001'
                      return `${protocol}://${host}`
                    })()

    // Generate QR code URL
    const qrUrl = `${baseUrl}/session/${sessionId}`

    // Generate QR code as data URL
    const qrDataUrl = await QRCode.toDataURL(qrUrl, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    })

    return NextResponse.json({ qrCodeUrl: qrDataUrl })
  } catch (error) {
    console.error('Error generating QR code:', error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' },
      { status: 500 }
    )
  }
}

