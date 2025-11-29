# คู่มือ Build Android App

## ปัญหาที่พบ

คุณพยายามรัน `./gradlew assembleDebug` แต่เกิด error เพราะ:

1. ❌ Windows CMD ไม่รู้จัก `./` syntax (ต้องใช้ `gradlew.bat`)
2. ❌ ยังไม่มี Java JDK ติดตั้ง

## วิธีแก้ไข

### 1. ติดตั้ง Java JDK

**ตัวเลือก A: ติดตั้ง Android Studio (แนะนำ)**
- Android Studio มี Java JDK และ Gradle มาด้วย
- ดาวน์โหลด: https://developer.android.com/studio
- ติดตั้งแล้วเปิด Android Studio → Open Project → เลือกโฟลเดอร์ `android`

**ตัวเลือก B: ติดตั้ง Java JDK แยก**
- ดาวน์โหลด JDK 17: https://adoptium.net/
- ติดตั้งแล้วตั้งค่า JAVA_HOME:
  ```cmd
  setx JAVA_HOME "C:\Program Files\Java\jdk-17"
  setx PATH "%PATH%;%JAVA_HOME%\bin"
  ```
- Restart Command Prompt

### 2. ใช้คำสั่งที่ถูกต้อง

**Windows CMD:**
```cmd
cd android
gradlew.bat assembleDebug
```

**PowerShell:**
```powershell
cd android
.\gradlew.bat assembleDebug
```

**Git Bash / WSL:**
```bash
cd android
./gradlew assembleDebug
```

## Build App

หลังจากติดตั้ง Java แล้ว:

```cmd
cd android
gradlew.bat assembleDebug
```

APK จะอยู่ที่: `app\build\outputs\apk\debug\app-debug.apk`

## Install App

```cmd
adb install app\build\outputs\apk\debug\app-debug.apk
```

## ตรวจสอบ Java

```cmd
java -version
```

ควรเห็น:
```
java version "17.0.x"
```

## ตรวจสอบ JAVA_HOME

```cmd
echo %JAVA_HOME%
```

ควรเห็น path ของ Java เช่น:
```
C:\Program Files\Java\jdk-17
```

## Troubleshooting

**Error: JAVA_HOME is not set**
- ติดตั้ง Java JDK
- ตั้งค่า JAVA_HOME environment variable
- Restart Command Prompt

**Error: 'gradlew' is not recognized**
- ใช้ `gradlew.bat` แทน `./gradlew`
- หรือ `.\gradlew.bat` ใน PowerShell

**Error: Build failed**
- ตรวจสอบ Android SDK installed
- ตรวจสอบ internet connection (Gradle จะดาวน์โหลด dependencies)
- ดู error message ใน terminal

## วิธีที่ง่ายที่สุด

**ใช้ Android Studio:**
1. ติดตั้ง Android Studio
2. เปิด Android Studio
3. File → Open → เลือกโฟลเดอร์ `android`
4. รอ Gradle sync เสร็จ
5. Build → Make Project (Ctrl+F9)
6. Run → Run 'app' (Shift+F10)

Android Studio จะจัดการทุกอย่างให้อัตโนมัติ!

