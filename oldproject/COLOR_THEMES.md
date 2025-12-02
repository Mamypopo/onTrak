# คู่มือการเปลี่ยนพาเลทสี FlowTrak

## ตำแหน่งไฟล์
สีถูกกำหนดใน `app/globals.css` โดยใช้ CSS Variables ในรูปแบบ HSL (Hue, Saturation, Lightness)

## ตัวอย่างพาเลทสี

### 1. Blue Theme (ปัจจุบัน)
```css
--primary: 221.2 83.2% 53.3%; /* น้ำเงิน */
```

### 2. Green Theme
```css
--primary: 142.1 76.2% 36.3%; /* เขียว */
```

### 3. Purple Theme
```css
--primary: 262.1 83.3% 57.8%; /* ม่วง */
```

### 4. Orange/Amber Theme
```css
--primary: 24.6 95% 53.1%; /* ส้ม */
```

### 5. Red Theme
```css
--primary: 0 72.2% 50.6%; /* แดง */
```

### 6. Teal Theme
```css
--primary: 173.4 80.4% 40%; /* เทาเขียว */
```

## วิธีเปลี่ยนสี

### วิธีที่ 1: ใช้ Color Picker
1. ไปที่ https://hslpicker.com/
2. เลือกสีที่ต้องการ
3. คัดลอกค่า HSL (เช่น `221 83% 53%`)
4. วางใน `--primary` ใน `app/globals.css`

### วิธีที่ 2: ใช้ Hex to HSL Converter
1. ไปที่ https://www.hexcolortool.com/
2. ใส่ hex color (เช่น `#3b82f6`)
3. คัดลอกค่า HSL
4. วางใน `--primary`

### วิธีที่ 3: ใช้สีจาก Tailwind
- Blue: `221.2 83.2% 53.3%` (blue-500)
- Green: `142.1 76.2% 36.3%` (green-600)
- Purple: `262.1 83.3% 57.8%` (purple-500)
- Orange: `24.6 95% 53.1%` (orange-500)
- Red: `0 72.2% 50.6%` (red-500)
- Teal: `173.4 80.4% 40%` (teal-600)

## สีที่ต้องเปลี่ยน

### สำหรับ Light Mode (`:root`):
- `--primary`: สีหลัก (ปุ่ม, ลิงก์)
- `--primary-foreground`: สีข้อความบน primary
- `--ring`: สี focus ring

### สำหรับ Dark Mode (`.dark`):
- `--primary`: สีหลัก (ควรสว่างกว่า light mode)
- `--primary-foreground`: สีข้อความบน primary
- `--ring`: สี focus ring

## ตัวอย่างการเปลี่ยนเป็น Green Theme

แก้ไขใน `app/globals.css`:

```css
:root {
  --primary: 142.1 76.2% 36.3%; /* Green */
  --ring: 142.1 76.2% 36.3%;
}

.dark {
  --primary: 142.1 70.6% 45.3%; /* Lighter Green */
  --ring: 142.1 70.6% 45.3%;
}
```

## หมายเหตุ
- หลังจากเปลี่ยนสี ต้อง refresh browser
- สีจะใช้กับปุ่ม, ลิงก์, และ UI elements ที่ใช้ `primary` color
- ควรทดสอบทั้ง Light และ Dark mode

