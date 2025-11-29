# Quick Start Guide - Build Android App

## ✅ สิ่งที่ต้องมี

- ✅ Android Studio ติดตั้งแล้ว
- ✅ Android SDK ติดตั้งแล้ว
- ✅ Java JDK (มาพร้อม Android Studio)

## 🚀 วิธี Build

### วิธีที่ 1: ใช้ build.bat (แนะนำ)

```cmd
cd android
build.bat
```

Script นี้จะ:
- ตั้งค่า JAVA_HOME อัตโนมัติ
- Build APK
- แสดงตำแหน่ง APK เมื่อเสร็จ

### วิธีที่ 2: ใช้ gradlew.bat โดยตรง

```cmd
cd android
set "JAVA_HOME=C:\Program Files\Android\Android Studio\jbr"
set "PATH=%JAVA_HOME%\bin;%PATH%"
gradlew.bat assembleDebug
```

### วิธีที่ 3: ใช้ Android Studio (ง่ายที่สุด)

1. เปิด Android Studio
2. File → Open → เลือกโฟลเดอร์ `android`
3. รอ Gradle sync
4. Build → Make Project (Ctrl+F9)
5. APK จะอยู่ที่: `app\build\outputs\apk\debug\app-debug.apk`

## 📦 Install APK

```cmd
adb install app\build\outputs\apk\debug\app-debug.apk
```

## ⚙️ ตั้งค่า JAVA_HOME แบบถาวร (Optional)

ถ้าต้องการตั้งค่า JAVA_HOME แบบถาวร:

1. กด `Win + R` → พิมพ์ `sysdm.cpl` → Enter
2. Advanced → Environment Variables
3. System variables → New
4. Variable name: `JAVA_HOME`
5. Variable value: `C:\Program Files\Android\Android Studio\jbr`
6. OK → OK → OK

หลังจากนั้นสามารถรัน `gradlew.bat assembleDebug` ได้โดยไม่ต้องตั้งค่า JAVA_HOME ทุกครั้ง

## 📝 หมายเหตุ

- `local.properties` ถูกสร้างแล้ว (มี Android SDK path)
- `build.bat` ตั้งค่า JAVA_HOME อัตโนมัติ
- Build ครั้งแรกจะใช้เวลานาน (ดาวน์โหลด dependencies)
- Build ครั้งต่อไปจะเร็วขึ้น

## 🔧 Troubleshooting

**Error: JAVA_HOME is not set**
- ใช้ `build.bat` แทน
- หรือตั้งค่า JAVA_HOME ตามวิธีที่ 2

**Error: SDK location not found**
- ตรวจสอบ `local.properties` มี sdk.dir ถูกต้อง
- หรือตั้งค่า ANDROID_HOME environment variable

**Build ช้า**
- Build ครั้งแรกจะช้า (ดาวน์โหลด dependencies)
- ตรวจสอบ internet connection
- Build ครั้งต่อไปจะเร็วขึ้น

