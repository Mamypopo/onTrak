@echo off
REM Build script for OnTrak MDM Android App
REM This script sets up JAVA_HOME and builds the app

echo Setting up Java environment...
set "JAVA_HOME=C:\Program Files\Android\Android Studio\jbr"
set "PATH=%JAVA_HOME%\bin;%PATH%"

echo Java version:
java -version

echo.
echo Building Android App...
echo.

call gradlew.bat assembleDebug

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo Build SUCCESS!
    echo APK location: app\build\outputs\apk\debug\app-debug.apk
    echo ========================================
) else (
    echo.
    echo ========================================
    echo Build FAILED!
    echo ========================================
)

pause

