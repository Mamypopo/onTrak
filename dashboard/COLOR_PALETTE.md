# พาเลทสี onTrak MDM

## หลักการออกแบบสี

### สีควรต่างจาก Background
- **Secondary**: ควรต่างจาก background เพื่อให้เห็นชัดเจนเมื่อใช้เป็น button หรือ background
- **Accent**: ควรเป็นสีที่โดดเด่นสำหรับ highlights และ hover states

---

## พาเลทสีปัจจุบัน (Purple Theme)

### Light Mode
```css
--background: 0 0% 100%;           /* ขาว */
--primary: 262.1 83.3% 57.8%;      /* Purple - สีหลัก */
--secondary: 217.2 32.6% 17.5%;    /* Slate - สีรอง (ต่างจาก background) */
--accent: 280 70% 70%;             /* Lighter Purple - สีเน้น */
--muted: 210 40% 96.1%;            /* Light gray - สำหรับ backgrounds */
```

### Dark Mode
```css
--background: 0 0% 11%;             /* macOS dark gray */
--primary: 262.1 83.3% 57.8%;      /* Purple - สีหลัก */
--secondary: 217.2 32.6% 25%;      /* Slate - สีรอง (ต่างจาก background 11%) */
--accent: 280 70% 75%;             /* Lighter Purple - สีเน้น */
--muted: 0 0% 18%;                 /* Dark gray - สำหรับ backgrounds */
```

---

## พาเลทสีที่แนะนำ

### Option 1: Purple Theme (ปัจจุบัน) ✅
**เหมาะกับ**: Creative apps, Modern UI
```css
Primary:   262.1 83.3% 57.8%  /* Purple */
Secondary: 217.2 32.6% 17.5%  /* Slate */
Accent:    280 70% 70%        /* Lighter Purple */
```

### Option 2: Blue Theme
**เหมาะกับ**: Professional apps, Business
```css
Primary:   217.2 91.2% 59.8%  /* Blue */
Secondary: 215 25% 20%         /* Slate Blue */
Accent:    200 80% 65%         /* Cyan */
```

### Option 3: Teal Theme
**เหมาะกับ**: Tech apps, Modern
```css
Primary:   188.7 85.7% 53.3%   /* Teal */
Secondary: 200 30% 18%         /* Dark Teal */
Accent:    175 70% 60%         /* Light Teal */
```

### Option 4: Green Theme
**เหมาะกับ**: Productivity apps, Nature
```css
Primary:   142.1 70.6% 45.3%   /* Green */
Secondary: 150 25% 18%         /* Dark Green */
Accent:    130 60% 55%         /* Light Green */
```

### Option 5: Orange/Amber Theme
**เหมาะกับ**: Energetic apps, Warm
```css
Primary:   24.6 95% 53.1%      /* Orange */
Secondary: 30 20% 20%          /* Dark Orange */
Accent:    35 80% 60%          /* Light Orange */
```

---

## หลักการเลือกสี

### 1. Contrast Ratio
- **Secondary vs Background**: ควรมี contrast ratio อย่างน้อย 3:1
- **Primary vs Background**: ควรมี contrast ratio อย่างน้อย 4.5:1

### 2. Color Harmony
- **Monochromatic**: ใช้สีเดียวกันแต่ต่างความเข้ม (เช่น Purple Theme)
- **Analogous**: ใช้สีที่อยู่ใกล้กันใน color wheel
- **Complementary**: ใช้สีตรงข้ามใน color wheel

### 3. Usage Guidelines

| สี | ใช้สำหรับ | ตัวอย่าง |
|---|---|---|
| **Primary** | Actions หลัก, CTA buttons | "บันทึก", "ยืนยัน", Links |
| **Secondary** | Actions รอง, Backgrounds | "ยกเลิก", "กลับ", Card backgrounds |
| **Accent** | Hover states, Highlights | Hover effects, Active states, Badges |
| **Muted** | Backgrounds, Borders | Card backgrounds, Input borders |

---

## วิธีเปลี่ยนพาเลทสี

1. เปิดไฟล์ `dashboard/src/app/globals.css`
2. แก้ไขค่าสีใน `:root` (Light Mode) และ `.dark` (Dark Mode)
3. ตรวจสอบ contrast ratio ด้วย [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
4. ทดสอบทั้ง Light และ Dark mode

---

## ตัวอย่างการเปลี่ยนเป็น Blue Theme

```css
:root {
  --primary: 217.2 91.2% 59.8%;    /* Blue */
  --secondary: 215 25% 20%;        /* Slate Blue */
  --accent: 200 80% 65%;           /* Cyan */
  --ring: 217.2 91.2% 59.8%;       /* Match primary */
}

.dark {
  --primary: 217.2 91.2% 59.8%;    /* Blue */
  --secondary: 215 25% 30%;        /* Lighter Slate Blue */
  --accent: 200 80% 70%;           /* Lighter Cyan */
  --ring: 217.2 91.2% 59.8%;       /* Match primary */
}
```

---

## Best Practices

✅ **ควรทำ**:
- Secondary ควรต่างจาก background อย่างชัดเจน
- Accent ควรโดดเด่นสำหรับ highlights
- ใช้สีที่สอดคล้องกัน (monochromatic หรือ analogous)
- ทดสอบ contrast ratio

❌ **ไม่ควรทำ**:
- ใช้ Secondary ที่เหมือนกับ background
- ใช้ Accent ที่เหมือนกับ Primary (ควรต่างกัน)
- ใช้สีที่ contrast ต่ำเกินไป

