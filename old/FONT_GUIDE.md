# 📝 คู่มือการใช้งาน Font กับ PDFKit

## 🎯 Standard Fonts (ไม่ต้องโหลดไฟล์)

PDFKit มี **Standard Fonts** ที่ใช้ได้ทันทีโดยไม่ต้องโหลดไฟล์ font:

- `Helvetica` / `Helvetica-Bold` / `Helvetica-Oblique` / `Helvetica-BoldOblique`
- `Courier` / `Courier-Bold` / `Courier-Oblique` / `Courier-BoldOblique`
- `Times-Roman` / `Times-Bold` / `Times-Italic` / `Times-BoldItalic`

**ข้อจำกัด:** Standard fonts ไม่รองรับภาษาไทย (จะแสดงเป็นกล่อง)

---

## 🇹🇭 Custom Fonts (สำหรับภาษาไทย)

ถ้าต้องการใช้ font ภาษาไทย ต้องโหลดไฟล์ font มาไว้ในโปรเจกต์

### 1. ตำแหน่งที่เก็บไฟล์ Font

สร้างโฟลเดอร์ `public/fonts` หรือ `src/fonts`:

```
Mooprompt/
├── public/
│   └── fonts/          ← เก็บไฟล์ font ไว้ที่นี่
│       ├── Prompt-Regular.ttf
│       ├── Prompt-Bold.ttf
│       └── ...
└── src/
    └── app/
        └── api/
            └── qr/
                └── pdf/
                    └── route.ts
```

### 2. วิธีใช้ Custom Font

```typescript
import path from 'path'
import fs from 'fs'

// ลงทะเบียน font
const fontPath = path.join(process.cwd(), 'public', 'fonts', 'Prompt-Regular.ttf')
doc.registerFont('Prompt', fontPath)

// ใช้ font
doc.font('Prompt').fontSize(14).text('ข้อความภาษาไทย')
```

### 3. ตัวอย่างโค้ดเต็ม

```typescript
import { NextRequest, NextResponse } from 'next/server'
import PDFDocument from 'pdfkit'
import path from 'path'
import fs from 'fs'

export async function GET(request: NextRequest) {
  const doc = new PDFDocument({
    size: [226.77, 1000],
    margins: { top: 20, bottom: 20, left: 15, right: 15 },
  })

  // ลงทะเบียน font ภาษาไทย
  const fontRegular = path.join(process.cwd(), 'public', 'fonts', 'Prompt-Regular.ttf')
  const fontBold = path.join(process.cwd(), 'public', 'fonts', 'Prompt-Bold.ttf')
  
  if (fs.existsSync(fontRegular)) {
    doc.registerFont('Prompt', fontRegular)
    doc.registerFont('Prompt-Bold', fontBold)
  }

  // ใช้ font
  doc.font('Prompt-Bold').fontSize(14).text('ชื่อร้าน', { align: 'center' })
  doc.font('Prompt').fontSize(8).text('ที่อยู่', { align: 'center' })

  // ... rest of code
}
```

---

## 📥 วิธีดาวน์โหลด Font ภาษาไทย

### 1. Google Fonts (แนะนำ)

1. ไปที่ [Google Fonts](https://fonts.google.com/)
2. ค้นหา "Prompt" หรือ "Sarabun"
3. Download font files (.ttf)
4. วางไว้ใน `public/fonts/`

### 2. Font ที่แนะนำสำหรับภาษาไทย

- **Prompt** - สวยงาม อ่านง่าย
- **Sarabun** - เรียบง่าย เหมาะกับ Thermal Printer
- **Kanit** - สมัยใหม่

---

## ⚠️ หมายเหตุ

1. **Thermal Printer** มักจะใช้ **Standard Fonts** ก็พอ (Helvetica, Courier)
2. ถ้าไม่จำเป็นต้องใช้ภาษาไทยใน PDF ไม่ต้องโหลด font เพิ่ม
3. ไฟล์ font จะเพิ่มขนาดของโปรเจกต์
4. สำหรับ Thermal Printer ขนาด 80mm มักจะใช้ **Courier** (monospace) ดีกว่า

---

## 🔧 การแก้ปัญหา Font ไม่เจอ

ถ้ายังเจอปัญหา font ไม่เจอ:

1. ตรวจสอบว่าไฟล์ font อยู่ในตำแหน่งที่ถูกต้อง
2. ใช้ `path.join(process.cwd(), ...)` แทน relative path
3. ตรวจสอบว่าไฟล์ font มีอยู่จริงด้วย `fs.existsSync()`
4. ใช้ `require('pdfkit')` แทน `import` เพื่อหลีกเลี่ยง bundling issues

