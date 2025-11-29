# Device Owner Setup Guide

## Overview

Device Owner mode is required for full MDM functionality including:
- Kiosk mode
- Lock/unlock device
- Disable settings
- Prevent app uninstall
- Control WiFi

## Setup Methods

### Method 1: ADB Provisioning (Development/Testing)

**Prerequisites:**
- Device must be factory reset or never had a user account
- USB debugging enabled
- ADB installed on your computer

**Steps:**

1. Factory reset the device (or use a fresh device)
2. During setup wizard, skip all steps (don't add Google account)
3. Enable Developer Options:
   - Go to Settings > About Phone
   - Tap "Build Number" 7 times
4. Enable USB Debugging:
   - Settings > Developer Options > USB Debugging
5. Connect device to computer via USB
6. Install the app:
   ```bash
   adb install app-debug.apk
   ```
7. Set as device owner:
   ```bash
   adb shell dpm set-device-owner com.ontrak.mdm/.receiver.DeviceOwnerReceiver
   ```
8. Verify:
   ```bash
   adb shell dpm list-owners
   ```
   Should show: `com.ontrak.mdm`

### Method 2: QR Code Provisioning (Production)

**Prerequisites:**
- NFC-enabled device or QR code scanner
- Provisioning QR code generated

**Steps:**

1. Factory reset the device
2. During setup wizard, when prompted for WiFi, look for "Scan QR code" option
3. Scan the provisioning QR code
4. Device will automatically install and set the app as device owner

**Generate QR Code:**

Create a JSON file with provisioning data:
```json
{
  "android.app.extra.PROVISIONING_DEVICE_ADMIN_COMPONENT_NAME": "com.ontrak.mdm/.receiver.DeviceOwnerReceiver",
  "android.app.extra.PROVISIONING_DEVICE_ADMIN_PACKAGE_NAME": "com.ontrak.mdm",
  "android.app.extra.PROVISIONING_DEVICE_ADMIN_PACKAGE_DOWNLOAD_LOCATION": "https://your-server.com/ontrak-mdm.apk",
  "android.app.extra.PROVISIONING_SKIP_ENCRYPTION": false,
  "android.app.extra.PROVISIONING_LEAVE_ALL_SYSTEM_APPS_ENABLED": true
}
```

Convert to QR code using any QR code generator.

### Method 3: NFC Provisioning

Similar to QR code, but uses NFC to transfer provisioning data.

## Verification

After setup, verify device owner status:

**Via ADB:**
```bash
adb shell dpm list-owners
```

**Via App:**
- Open the app
- Check "Device Owner Status" - should show "Enabled"

## Troubleshooting

**Error: "Not allowed to set the device owner because there are already some accounts on the device"**
- Solution: Factory reset the device

**Error: "Not allowed to set the device owner because the device has already been set up"**
- Solution: Factory reset the device

**Error: "Not allowed to set the device owner because there are already some users on the device"**
- Solution: Remove all users or factory reset

**App not appearing as device owner:**
- Check package name matches exactly
- Verify receiver class name is correct
- Check AndroidManifest.xml has correct receiver declaration

## Important Notes

- Device Owner can only be set on a fresh device (no user accounts)
- Once set, Device Owner cannot be removed without factory reset
- Device Owner mode persists across app uninstalls (app cannot be uninstalled)
- Some features require additional permissions in Device Owner mode

## Security Considerations

- Device Owner has extensive control over the device
- Only set on trusted devices
- Use strong authentication for MDM server
- Monitor device activity regularly

