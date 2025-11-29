# วิธีตรวจสอบว่า MDM Service ทำงานอยู่

## วิธีที่ 1: ดู Notification (ง่ายที่สุด)

**Service ทำงานอยู่ถ้าเห็น:**
- Notification ที่มีข้อความ: **"OnTrak MDM Service"**
- ข้อความ: **"Tracking device status..."**
- Icon: ⓘ (info icon)

**ถ้าเห็น notification = Service ทำงานอยู่ ✅**

---

## วิธีที่ 2: ตรวจสอบผ่าน ADB

### ตรวจสอบว่า Service ทำงานอยู่:
```cmd
adb shell dumpsys activity services | findstr MDMService
```

### ตรวจสอบ Foreground Services:
```cmd
adb shell dumpsys activity services | findstr "Foreground"
```

### ดู Logs:
```cmd
adb logcat | findstr MDMService
```

ควรเห็น logs แบบนี้:
```
D/MDMService: MDMService onCreate
D/MDMService: MDMService onStartCommand
D/MDMService: Published to tablet/xxx/status
```

---

## วิธีที่ 3: ตรวจสอบใน Settings

1. **Settings → Apps → OnTrak MDM**
2. **ดู "Running services"** หรือ **"Active services"**
3. ควรเห็น **MDMService** ทำงานอยู่

---

## วิธีที่ 4: ดูใน MainActivity

เปิดแอปอีกครั้ง:
- ถ้า Service ทำงานอยู่ → จะเห็น notification
- ถ้า Service ไม่ทำงาน → กด "Start MDM Service" อีกครั้ง

---

## พฤติกรรมปกติ

### ✅ ปกติ:
- Service start แล้ว → แอปอาจปิด UI ไป
- Service ทำงานใน background
- เห็น notification "OnTrak MDM Service"
- Service ทำงานต่อเนื่อง 24/7

### ❌ ไม่ปกติ:
- Service start แล้ว → notification หายไปทันที
- Service หยุดทำงานเอง
- ไม่เห็น notification เลย

---

## Troubleshooting

### Service หยุดทำงานเอง:

**1. ตรวจสอบ Battery Optimization:**
- Settings → Apps → OnTrak MDM → Battery
- ตั้งค่าเป็น "Unrestricted" หรือ "Not optimized"

**2. ตรวจสอบ Auto-start:**
- Settings → Apps → OnTrak MDM → Auto-start
- เปิด Auto-start

**3. ตรวจสอบ Background App Refresh:**
- Settings → Apps → OnTrak MDM
- เปิด "Allow background activity"

**4. ตรวจสอบ Logs:**
```cmd
adb logcat | findstr -i "mdmservice\|error\|exception"
```

### Service ไม่ start:

**1. ตรวจสอบ Permissions:**
- Settings → Apps → OnTrak MDM → Permissions
- ตรวจสอบว่า Location, WiFi permissions ถูก grant แล้ว

**2. ตรวจสอบ Device Owner:**
- เปิดแอป → ดู "Device Owner Status"
- ควรเป็น "Enabled"

**3. Restart Service:**
```cmd
adb shell am force-stop com.ontrak.mdm
adb shell am start -n com.ontrak.mdm/.ui.MainActivity
```

---

## หมายเหตุ

- **Foreground Service** ต้องแสดง notification เสมอ
- Service จะทำงานต่อเนื่องแม้แอปปิด UI
- Service จะ auto-restart ถ้าถูก kill (START_STICKY)
- Service จะ start อัตโนมัติเมื่อ device boot (BootReceiver)

