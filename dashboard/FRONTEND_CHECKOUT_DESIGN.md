# Frontend Design สำหรับระบบเบิก-คืน (Checkout System)

## 📋 หน้าทั้งหมดที่ต้องมี:

### 1. **Dashboard (หน้าแรก)** - `/dashboard`
**สิ่งที่ต้องเพิ่ม:**
- ✅ แสดง Borrow Status (AVAILABLE, IN_USE, IN_MAINTENANCE) ใน device card
- ✅ Filter ตาม Borrow Status (ว่าง, ใช้งานอยู่, กำลังซ่อม)
- ✅ Stats Cards: แสดงจำนวนเครื่องว่าง, ใช้งานอยู่, กำลังซ่อม
- ✅ ปุ่ม "เบิกอุปกรณ์" (Create Checkout) - เลือกหลาย devices พร้อมกัน

### 2. **Checkout List** - `/dashboard/checkouts` (ใหม่)
**หน้าที่:**
- แสดงรายการการเบิกทั้งหมด (Checkout list)
- Filter: ACTIVE, RETURNED, CANCELLED
- Search: เลขที่การเบิก, บริษัท, ผู้เบิก
- แสดง: เลขที่, บริษัท, ผู้เบิก, จำนวน devices, สถานะ, วันที่เบิก

### 3. **Create Checkout** - `/dashboard/checkouts/new` (ใหม่)
**หน้าที่:**
- เลือกหลาย devices พร้อมกัน (multi-select)
- กรอกข้อมูล: บริษัท, ผู้เบิก, หมายเหตุ
- แสดงรายการ devices ที่เลือก
- Preview ก่อนยืนยัน

### 4. **Checkout Detail** - `/dashboard/checkouts/[id]` (ใหม่)
**หน้าที่:**
- แสดงรายละเอียดการเบิก
- รายการ devices ที่เบิก (พร้อมสถานะคืน)
- Timeline ของ events (CheckoutEvent)
- ปุ่มคืน device (ทีละตัวหรือทั้งหมด)
- รายงานปัญหาเมื่อคืน

### 5. **Device Detail** - `/dashboard/device/[id]` (อัพเดท)
**สิ่งที่ต้องเพิ่ม:**
- ✅ แสดง Borrow Status (AVAILABLE, IN_USE, IN_MAINTENANCE)
- ✅ แสดง Checkout History (แทน Borrow Records)
- ✅ ปุ่ม "เบิก" (ถ้าว่าง) หรือ "คืน" (ถ้ากำลังใช้งาน)
- ✅ แสดงข้อมูล checkout ปัจจุบัน (ถ้ามี)

## 🎨 UI Components ที่ต้องสร้าง:

### 1. **CheckoutStatusBadge**
```typescript
// แสดงสถานะการเบิก
<CheckoutStatusBadge status="ACTIVE" />
<CheckoutStatusBadge status="RETURNED" />
<CheckoutStatusBadge status="CANCELLED" />
```

### 2. **BorrowStatusBadge**
```typescript
// แสดงสถานะการยืม (computed)
<BorrowStatusBadge status="AVAILABLE" />
<BorrowStatusBadge status="IN_USE" />
<BorrowStatusBadge status="IN_MAINTENANCE" />
```

### 3. **DeviceMultiSelect**
```typescript
// เลือกหลาย devices สำหรับ checkout
<DeviceMultiSelect 
  devices={availableDevices}
  selected={selectedDevices}
  onChange={setSelectedDevices}
/>
```

### 4. **CheckoutTimeline**
```typescript
// แสดง timeline ของ events
<CheckoutTimeline events={checkoutEvents} />
```

### 5. **ReturnDeviceDialog**
```typescript
// Dialog สำหรับคืน device
<ReturnDeviceDialog
  checkoutItem={item}
  onReturn={(problem, maintenanceStatus) => {...}}
/>
```

## 📱 Flow การใช้งาน:

### Flow 1: เบิกอุปกรณ์
```
Dashboard → คลิก "เบิกอุปกรณ์" 
→ เลือก devices (หลายตัว)
→ กรอกข้อมูล (บริษัท, ผู้เบิก)
→ ยืนยัน → สร้าง Checkout
→ Redirect ไป Checkout Detail
```

### Flow 2: คืนอุปกรณ์
```
Checkout Detail → คลิก "คืน Device" 
→ เลือก device ที่จะคืน
→ กรอกข้อมูล (ปัญหา, สถานะซ่อม)
→ ยืนยัน → อัพเดท CheckoutItem
```

### Flow 3: ดูประวัติ
```
Device Detail → Tab "ประวัติการเบิก"
→ แสดง Checkout Items ทั้งหมด
→ คลิกดูรายละเอียด Checkout
```

## 🎯 สิ่งที่ต้องทำ:

### Phase 1: อัพเดท Dashboard
1. เพิ่ม Borrow Status ใน device card
2. เพิ่ม Filter ตาม Borrow Status
3. เพิ่ม Stats Cards
4. เพิ่มปุ่ม "เบิกอุปกรณ์"

### Phase 2: สร้าง Checkout Pages
1. สร้าง `/dashboard/checkouts` - Checkout List
2. สร้าง `/dashboard/checkouts/new` - Create Checkout
3. สร้าง `/dashboard/checkouts/[id]` - Checkout Detail

### Phase 3: อัพเดท Device Detail
1. แสดง Borrow Status
2. แสดง Checkout History
3. ปุ่มเบิก/คืน (ตามสถานะ)

### Phase 4: Components
1. สร้าง UI Components ทั้งหมด
2. สร้าง API hooks สำหรับ Checkout

## 💡 Best Practices:

1. **Real-time Updates** - ใช้ WebSocket อัพเดท status
2. **Optimistic Updates** - อัพเดท UI ก่อน API response
3. **Error Handling** - แสดง error message ที่ชัดเจน
4. **Loading States** - แสดง skeleton/loading
5. **Confirmation Dialogs** - ยืนยันก่อนทำ action สำคัญ

