import { NextRequest, NextResponse } from 'next/server'
import QRCode from 'qrcode'
import { prisma } from '@/lib/prisma'
import path from 'path'
import fs from 'fs'

export async function GET(request: NextRequest) {
  try {
    // Dynamic import PDFKit to avoid bundling issues
    const PDFDocument = (await import('pdfkit')).default

    const searchParams = request.nextUrl.searchParams
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json(
        { error: 'กรุณาระบุ Session ID' },
        { status: 400 }
      )
    }

    // Fetch session data
    const session = await prisma.tableSession.findUnique({
      where: { id: parseInt(sessionId, 10) },
      include: {
        table: true,
        package: true,
      },
    })

    // Fetch extra charges if session has extraChargeIds
    let extraCharges: any[] = []
    if (session?.extraChargeIds) {
      const extraChargeIds = Array.isArray(session.extraChargeIds)
        ? session.extraChargeIds.filter((id): id is number => typeof id === 'number')
        : []
      
      if (extraChargeIds.length > 0) {
        extraCharges = await prisma.extraCharge.findMany({
          where: {
            id: { in: extraChargeIds },
            active: true,
          },
          select: {
            id: true,
            name: true,
            price: true,
            chargeType: true,
          },
        })
      }
    }

    if (!session || session.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'ไม่พบ session หรือ session ไม่ได้เปิดใช้งาน' },
        { status: 404 }
      )
    }

    // Fetch restaurant info
    let restaurantInfo = await prisma.restaurantInfo.findFirst()
    if (!restaurantInfo) {
      restaurantInfo = await prisma.restaurantInfo.create({
        data: {
          name: 'Mooprompt Restaurant',
          address: '',
          phone: '',
        },
      })
    }

    // Generate QR Code
    // Use NEXT_PUBLIC_BASE_URL from env if available, otherwise use request host
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
                    (() => {
                      const protocol = request.headers.get('x-forwarded-proto') || 'http'
                      const host = request.headers.get('host') || 'localhost:3001'
                      return `${protocol}://${host}`
                    })()
    const qrUrl = `${baseUrl}/session/${sessionId}`
    const qrCodeBuffer = await QRCode.toBuffer(qrUrl, {
      width: 200,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    })

    // Create PDF for Thermal Printer (80mm width)
    // Use a large height initially, PDFKit will auto-adjust
    const doc = new PDFDocument({
      size: [226.77, 1000], // 80mm width, large height (will be trimmed)
      margins: {
        top: 20,
        bottom: 20,
        left: 15,
        right: 15,
      },
    })

    // Register Thai fonts (Prompt)
    const fontRegularPath = path.join(process.cwd(), 'public', 'fonts', 'Prompt-Regular.ttf')
    const fontBoldPath = path.join(process.cwd(), 'public', 'fonts', 'Prompt-Bold.ttf')
    
    if (fs.existsSync(fontRegularPath)) {
      doc.registerFont('Prompt', fontRegularPath)
    }
    if (fs.existsSync(fontBoldPath)) {
      doc.registerFont('Prompt-Bold', fontBoldPath)
    }

    // Set up Promise to collect PDF data
    const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
      const buffers: Buffer[] = []
      doc.on('data', (chunk: Buffer) => buffers.push(chunk))
      doc.on('end', () => resolve(Buffer.concat(buffers)))
      doc.on('error', (err: Error) => reject(err))

    // Header - Restaurant Info
    // Use Prompt font for Thai language support
    const usePromptFont = fs.existsSync(fontRegularPath)
    const titleFont = usePromptFont ? 'Prompt-Bold' : 'Helvetica-Bold'
    const bodyFont = usePromptFont ? 'Prompt' : 'Helvetica'

    doc.fontSize(14).font(titleFont).text(restaurantInfo.name, {
      align: 'center',
    })

    if (restaurantInfo.address) {
      doc.fontSize(8).font(bodyFont).text(restaurantInfo.address, {
        align: 'center',
      })
    }

    if (restaurantInfo.phone) {
      doc.fontSize(8).font(bodyFont).text(`โทร: ${restaurantInfo.phone}`, {
        align: 'center',
      })
    }

    if (restaurantInfo.openTime || restaurantInfo.closeTime) {
      doc.fontSize(8).font(bodyFont).text(
        `เปิดบริการ: ${restaurantInfo.openTime || '-'} - ${restaurantInfo.closeTime || '-'}`,
        {
          align: 'center',
        }
      )
    }

    // WiFi Info in header
    if (restaurantInfo.wifiName || restaurantInfo.wifiPassword) {
      doc.moveDown(0.3)
      if (restaurantInfo.wifiName) {
        doc.fontSize(8).font(bodyFont).text(`WiFi: ${restaurantInfo.wifiName}`, {
          align: 'center',
        })
      }
      if (restaurantInfo.wifiPassword) {
        doc.fontSize(8).font(bodyFont).text(`รหัสผ่าน: ${restaurantInfo.wifiPassword}`, {
          align: 'center',
        })
      }
    }

    // Divider
    doc.moveDown(0.5)
    doc.moveTo(15, doc.y).lineTo(211.77, doc.y).stroke()
    doc.moveDown(0.5)

    // Table Name
    doc.fontSize(12).font(titleFont).text(`${session.table.name}`, {
      align: 'center',
    })

    // QR Code - Center it properly
    doc.moveDown(0.5)
    const qrSize = 120
    const pageWidth = 226.77 // 80mm in points
    const qrX = (pageWidth - qrSize) / 2
    doc.image(qrCodeBuffer, qrX, doc.y, {
      fit: [qrSize, qrSize],
    })
    doc.y += qrSize

    doc.moveDown(0.5)
    doc.fontSize(8).font(bodyFont).text('สแกน QR Code เพื่อเข้าสู่ระบบสั่งอาหาร', {
      align: 'center',
    })

    doc.fontSize(6).font(bodyFont).text(qrUrl, {
      align: 'center',
      width: 196.77,
    })

    // Divider
    doc.moveDown(0.5)
    doc.moveTo(15, doc.y).lineTo(211.77, doc.y).stroke()
    doc.moveDown(0.5)

    // Session Details
    doc.fontSize(8).font(bodyFont)
    const details = [
      { label: 'จำนวนคน:', value: `${session.peopleCount} คน` },
    ]

    if (session.package) {
      details.push(
        { label: 'แพ็กเกจ:', value: session.package.name },
        {
          label: 'ราคา/คน:',
          value: `${session.package.pricePerPerson.toFixed(2)} บาท`,
        }
      )
      if (session.package.durationMinutes) {
        details.push({
          label: 'ระยะเวลา:',
          value: `${session.package.durationMinutes} นาที`,
        })
      }
    }

    details.push({
      label: 'เวลาเริ่ม:',
      value: new Date(session.startTime).toLocaleTimeString('th-TH', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    })

    // Add extra charges if any (before other details)
    if (extraCharges.length > 0) {
      doc.moveDown(0.2)
      doc.fontSize(8).font(titleFont).text('ค่าบริการเพิ่มเติม:', 15, doc.y)
      doc.moveDown(0.2)
      
      extraCharges.forEach((charge) => {
        const chargeAmount = charge.chargeType === 'PER_PERSON' 
          ? charge.price * session.peopleCount 
          : charge.price
        const chargeLabel = `• ${charge.name}${charge.chargeType === 'PER_PERSON' ? ` (${charge.price.toFixed(2)} บาท/คน)` : ''}`
        
        doc.fontSize(8).font(bodyFont)
        doc.text(chargeLabel, 15, doc.y, {
          width: 140,
          continued: true,
        })
        doc.text(`${chargeAmount.toFixed(2)} บาท`, {
          width: 56.77,
          align: 'right',
        })
        doc.moveDown(0.3)
      })
      doc.moveDown(0.2)
    }

    details.forEach((detail) => {
      // Label on left, value on right (same line)
      const pageWidth = 226.77
      const margin = 15
      const rightMargin = 15
      
      // Get current Y position to ensure same line
      const currentY = doc.y
      
      // Write label first (left aligned, fixed width)
      const labelWidth = 100
      doc.text(detail.label, margin, currentY, {
        width: labelWidth,
      })
      
      // Calculate value width and position for right alignment
      const valueWidth = pageWidth - margin - labelWidth - rightMargin // ~96.77
      const valueTextWidth = doc.widthOfString(detail.value)
      const valueX = pageWidth - rightMargin - valueTextWidth
      
      // Write value on the same Y position, right aligned
      doc.text(detail.value, valueX, currentY)
      
      doc.moveDown(0.3)
    })


    // Footer
    doc.moveDown(1)
    doc.moveTo(15, doc.y).lineTo(211.77, doc.y).stroke()
    doc.moveDown(0.5)

    // Center footer text properly
    // Reset X position to left margin before centering
    doc.x = 15
    doc.fontSize(8).font(bodyFont).text('ขอบคุณที่ใช้บริการ', {
      align: 'center',
    })

    doc.moveDown(0.2)
    doc.x = 15 // Reset X position again
    doc.fontSize(6).font(bodyFont).text(`Session: ${session.id}`, {
      align: 'center',
    })

    // Finalize PDF
    doc.end()
    })

    // Return PDF as response
    // Convert Buffer to Uint8Array for NextResponse
    // Use 'inline' to open in browser instead of downloading
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="qr-table-${session.table.name.replace(/[^a-zA-Z0-9]/g, '-')}-${sessionId}.pdf"`,
      },
    })
  } catch (error) {
    console.error('Error generating PDF:', error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' },
      { status: 500 }
    )
  }
}

