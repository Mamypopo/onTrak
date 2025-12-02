# ตัวเลือกสี Primary สำหรับ macOS Dark Mode

## สีพื้นหลัง (Background)
✅ **ตั้งค่าแล้ว** - macOS style dark gray (`0 0% 11%`)

## ตัวเลือกสี Primary (สีหลัก)

### Option 1: Blue (macOS Default) - **ปัจจุบัน**
```css
--primary: 217.2 91.2% 59.8%;
--ring: 217.2 91.2% 59.8%;
```
- สีฟ้าแบบ macOS
- ดูเป็นมืออาชีพ
- ใช้งานได้ดีกับ dark mode

### Option 2: Purple (ม่วง)
```css
--primary: 262.1 83.3% 57.8%;
--ring: 262.1 83.3% 57.8%;
```
- สีม่วงสวยงาม
- ดูทันสมัย
- เหมาะกับ creative apps

### Option 3: Teal/Cyan (เทาเขียว)
```css
--primary: 188.7 85.7% 53.3%;
--ring: 188.7 85.7% 53.3%;
```
- สีเทาเขียว/ฟ้าอมเขียว
- ดูทันสมัย
- เหมาะกับ tech apps

### Option 4: Green (เขียว)
```css
--primary: 142.1 70.6% 45.3%;
--ring: 142.1 70.6% 45.3%;
```
- สีเขียวธรรมชาติ
- ดูสบายตา
- เหมาะกับ productivity apps

### Option 5: Orange/Amber (ส้ม)
```css
--primary: 24.6 95% 53.1%;
--ring: 24.6 95% 53.1%;
```
- สีส้มสดใส
- ดูอบอุ่น
- เหมาะกับ energetic apps

## วิธีเปลี่ยนสี

1. เปิดไฟล์ `app/globals.css`
2. ไปที่ส่วน `.dark`
3. หา `--primary` และ `--ring`
4. Uncomment สีที่ต้องการ (ลบ `/* */`)
5. Comment สีเดิม (ใส่ `/* */`)
6. Save และ refresh browser

## ตัวอย่างการเปลี่ยนเป็น Purple

แก้ไขใน `app/globals.css`:

```css
.dark {
  /* Comment Blue */
  /* --primary: 217.2 91.2% 59.8%; */
  
  /* Uncomment Purple */
  --primary: 262.1 83.3% 57.8%;
  --ring: 262.1 83.3% 57.8%;
}
```

## หมายเหตุ

- สีพื้นหลังเป็น macOS style แล้ว (มืดนุ่มนวล)
- สี primary จะใช้กับปุ่ม, ลิงก์, และ UI elements หลัก
- ควรทดสอบทั้ง Light และ Dark mode
- สามารถเปลี่ยนสีได้ตลอดเวลา

