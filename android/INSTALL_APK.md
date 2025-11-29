# คู่มือ Install APK ด้วย Android Studio

## วิธีที่ 1: Run/Debug จาก Android Studio (แนะนำ - ง่ายที่สุด)

### ขั้นตอน:
1. **เปิด Android Studio**
2. **File → Open** → เลือกโฟลเดอร์ `android`
3. **รอ Gradle sync** (ครั้งแรกอาจใช้เวลา 2-3 นาที)
4. **เชื่อมต่อ Device/Emulator:**
   - เชื่อมต่อ Android device ผ่าน USB
   - หรือสร้าง/เปิด Android Emulator
5. **เลือก Device:**
   - ดูที่ dropdown ด้านบน (ข้างๆ Run button)
   - เลือก device ที่ต้องการ
6. **กด Run:**
   - กด **Run** (Shift+F10) หรือ **Debug** (Shift+F9)
   - Android Studio จะ:
     - Build project (ถ้ายังไม่ได้ build)
     - Install APK อัตโนมัติ
     - เปิดแอปให้ทันที

### ข้อดี:
- ✅ ง่ายที่สุด
- ✅ Install และเปิดแอปอัตโนมัติ
- ✅ Debug ได้ทันที
- ✅ Hot reload/reinstall เมื่อแก้ไขโค้ด

---

## วิธีที่ 2: Install APK ที่ Build แล้ว (ผ่าน Device Manager)

### ขั้นตอน:
1. **เปิด Android Studio**
2. **เชื่อมต่อ Device/Emulator**
3. **เปิด Device Manager:**
   - **View → Tool Windows → Device Manager**
   - หรือกด **Shift+Shift** แล้วพิมพ์ "Device Manager"
4. **Install APK:**
   - **วิธี A:** ลากไฟล์ `app-debug.apk` จาก File Explorer ไปวางที่ device ใน Device Manager
   - **วิธี B:** คลิกขวาที่ device → **Install APK** → เลือกไฟล์ APK
   - **วิธี C:** ใช้ปุ่ม **Install APK** ใน Device Manager

### ข้อดี:
- ✅ ไม่ต้อง build ใหม่
- ✅ Install APK ที่ build แล้วได้เลย
- ✅ เหมาะสำหรับทดสอบ APK ที่ build ไว้แล้ว

---

## วิธีที่ 3: ใช้ Terminal ใน Android Studio

### ขั้นตอน:
1. **เปิด Android Studio**
2. **เปิด Terminal:**
   - **View → Tool Windows → Terminal**
   - หรือกด **Alt+F12**
3. **รันคำสั่ง:**
   ```cmd
   cd android
   adb install app\build\outputs\apk\debug\app-debug.apk
   ```
4. **ถ้า device ต่ออยู่แล้ว:**
   ```cmd
   adb devices  # ตรวจสอบ device
   adb install app\build\outputs\apk\debug\app-debug.apk
   ```

### ข้อดี:
- ✅ ใช้ command line ได้
- ✅ เหมาะสำหรับ automation
- ✅ เห็น output ชัดเจน

---

## วิธีที่ 4: ใช้ Run Configuration

### ขั้นตอน:
1. **เปิด Android Studio**
2. **Run → Edit Configurations**
3. **สร้าง Android App configuration:**
   - กด **+** → เลือก **Android App**
   - Name: `OnTrak MDM`
   - Module: `app`
   - Launch: `Default Activity`
4. **เลือก Device:**
   - ใน dropdown ด้านบน
5. **กด Run**

---

## วิธีที่ 5: Drag & Drop APK ไปที่ Device

### ขั้นตอน:
1. **เปิด Android Studio**
2. **เชื่อมต่อ Device/Emulator**
3. **เปิด Device File Explorer:**
   - **View → Tool Windows → Device File Explorer**
4. **ลาก APK:**
   - ลากไฟล์ `app-debug.apk` จาก File Explorer
   - วางที่ `/sdcard/Download/` ใน Device File Explorer
5. **Install บน Device:**
   - เปิด File Manager บน device
   - ไปที่ Downloads
   - Tap ที่ APK file
   - Tap Install

---

## Troubleshooting

### Device ไม่แสดงใน Android Studio:
1. **ตรวจสอบ USB Debugging:**
   - Settings → Developer Options → USB Debugging (เปิด)
2. **ตรวจสอบ USB Connection:**
   - ใช้ USB cable ที่รองรับ data transfer
   - เปลี่ยน USB port
3. **ตรวจสอบ ADB:**
   ```cmd
   adb devices
   ```
   - ถ้าไม่เห็น device → restart ADB:
   ```cmd
   adb kill-server
   adb start-server
   adb devices
   ```

### Error: "INSTALL_FAILED_UPDATE_INCOMPATIBLE"
- Uninstall แอปเก่าก่อน:
  ```cmd
  adb uninstall com.ontrak.mdm
  ```
- หรือ Settings → Apps → OnTrak MDM → Uninstall

### Error: "INSTALL_FAILED_INSUFFICIENT_STORAGE"
- ลบแอปอื่นๆ หรือไฟล์ที่ไม่ใช้
- ตรวจสอบ storage: Settings → Storage

### Device ไม่แสดงใน Run Configuration:
- ตรวจสอบว่า device ต่ออยู่: `adb devices`
- Restart Android Studio
- Reconnect device

---

## คำแนะนำ

**สำหรับ Development:**
- ใช้ **วิธีที่ 1 (Run/Debug)** เพราะสะดวกที่สุด
- Android Studio จะ rebuild และ reinstall อัตโนมัติเมื่อแก้ไขโค้ด

**สำหรับ Testing:**
- ใช้ **วิธีที่ 2 (Device Manager)** สำหรับทดสอบ APK ที่ build แล้ว
- ใช้ **วิธีที่ 3 (Terminal)** สำหรับ automation

**สำหรับ Production:**
- Build release APK ก่อน
- Install ผ่าน Device Manager หรือ Terminal

---

## หมายเหตุ

- APK location: `android\app\build\outputs\apk\debug\app-debug.apk`
- Package name: `com.ontrak.mdm`
- ต้อง setup Device Owner Mode หลังจาก install (ดู `DEVICE_OWNER_SETUP.md`)

