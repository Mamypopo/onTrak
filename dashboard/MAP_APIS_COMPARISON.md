# Map APIs Comparison - สำหรับ GPS Tracking

## 🎯 คำตอบสั้นๆ

### ✅ **ทำเส้นทางได้แน่นอน!**
- ใช้ `Polyline` component จาก react-leaflet
- แสดงเส้นทางจาก location history
- เหมือน GPS tracker แมว/สุนัข

---

## 📊 เปรียบเทียบ Map APIs

### 1. **OpenStreetMap + Leaflet** (ใช้อยู่ตอนนี้)
**✅ ข้อดี:**
- ✅ **ฟรี 100%** (ไม่มีค่าใช้จ่าย)
- ✅ Open Source
- ✅ ใช้งานง่าย
- ✅ ข้อมูลแผนที่ทั่วโลก

**❌ ข้อเสีย:**
- ❌ ภาพถ่ายดาวเทียมไม่ละเอียด (บางพื้นที่)
- ❌ ไม่มี Street View
- ❌ ไม่มี Traffic data
- ❌ ภาพอาจไม่สวยเท่า Mapbox/Google

**💰 ราคา:** ฟรี

---

### 2. **Mapbox** ⭐ **แนะนำสำหรับ Tracking!**
**✅ ข้อดี:**
- ✅ **ภาพสวยมาก** (Customizable styles)
- ✅ **เหมาะกับ GPS Tracking** (มีตัวอย่างเยอะ)
- ✅ Performance ดี
- ✅ มี Free tier 50,000 requests/เดือน
- ✅ ภาพถ่ายดาวเทียมละเอียด
- ✅ 3D buildings, terrain

**❌ ข้อเสีย:**
- ❌ ต้องสมัคร account (ฟรี)
- ❌ เกิน free tier ต้องจ่าย (~$0.50/1,000 requests)

**💰 ราคา:**
- Free: 50,000 map loads/เดือน
- Paid: $0.50/1,000 requests

**📦 Package:**
```bash
npm install react-map-gl mapbox-gl
```

---

### 3. **Google Maps**
**✅ ข้อดี:**
- ✅ ภาพถ่ายดาวเทียมละเอียดที่สุด
- ✅ Street View
- ✅ Traffic data
- ✅ Places API (ค้นหาสถานที่)
- ✅ ข้อมูลครบถ้วน

**❌ ข้อเสีย:**
- ❌ ราคาแพง ($7/1,000 requests)
- ❌ ต้องใช้ API Key
- ❌ Credit card required

**💰 ราคา:**
- Free: $200 credit/เดือน (≈ 28,000 requests)
- Paid: $7/1,000 requests

**📦 Package:**
```bash
npm install @react-google-maps/api
```

---

### 4. **MapLibre** (Open Source แบบ Mapbox)
**✅ ข้อดี:**
- ✅ ฟรี 100% (Open Source)
- ✅ ใช้ style เหมือน Mapbox
- ✅ Performance ดี
- ✅ ไม่ต้อง API Key

**❌ ข้อเสีย:**
- ❌ ต้องหา tile server เอง (หรือใช้ public tiles)
- ❌ ภาพอาจไม่ละเอียดเท่า Mapbox

**💰 ราคา:** ฟรี

**📦 Package:**
```bash
npm install maplibre-gl react-map-gl
```

---

## 🏆 คำแนะนำ

### สำหรับ GPS Tracking (แนะนำ)

#### **Option 1: Mapbox** ⭐ **Best Choice**
- ✅ ภาพสวย + เหมาะกับ tracking
- ✅ Free tier เพียงพอสำหรับเริ่มต้น
- ✅ มีตัวอย่าง GPS tracking เยอะ

#### **Option 2: OpenStreetMap + Leaflet** (ใช้อยู่)
- ✅ ฟรี 100%
- ✅ ใช้งานได้ดี
- ✅ เพียงพอสำหรับ internal use

#### **Option 3: Google Maps**
- ✅ ถ้าต้องการภาพถ่ายดาวเทียมละเอียด
- ✅ ถ้ามี budget

---

## 🛣️ วิธีทำเส้นทาง (Route/Polyline)

### ใช้ react-leaflet (ปัจจุบัน)

```tsx
import { Polyline } from "react-leaflet";

// Location history array
const locationHistory = [
  [13.7563, 100.5018], // [lat, lng]
  [13.7573, 100.5028],
  [13.7583, 100.5038],
];

<MapContainer>
  <TileLayer />
  
  {/* เส้นทาง */}
  <Polyline
    positions={locationHistory}
    color="blue"
    weight={4}
    opacity={0.7}
  />
  
  {/* จุดเริ่มต้น */}
  <Marker position={locationHistory[0]}>
    <Popup>Start</Popup>
  </Marker>
  
  {/* จุดปัจจุบัน */}
  <Marker position={locationHistory[locationHistory.length - 1]}>
    <Popup>Current</Popup>
  </Marker>
</MapContainer>
```

### ใช้ Mapbox (ถ้าอยากเปลี่ยน)

```tsx
import Map, { Source, Layer } from 'react-map-gl';

const routeData = {
  type: 'Feature',
  geometry: {
    type: 'LineString',
    coordinates: locationHistory.map(([lat, lng]) => [lng, lat]) // [lng, lat]
  }
};

<Map>
  <Source id="route" type="geojson" data={routeData}>
    <Layer
      id="route"
      type="line"
      paint={{
        'line-color': '#3887be',
        'line-width': 4,
        'line-opacity': 0.7
      }}
    />
  </Source>
</Map>
```

---

## 📈 ตัวอย่างการใช้งาน

### 1. แสดงเส้นทาง 24 ชั่วโมงล่าสุด
```tsx
// ดึง location history จาก API
const [route, setRoute] = useState([]);

useEffect(() => {
  fetch(`/api/devices/${deviceId}/location-history?hours=24`)
    .then(res => res.json())
    .then(data => {
      setRoute(data.map(loc => [loc.latitude, loc.longitude]));
    });
}, [deviceId]);
```

### 2. แสดงเส้นทางตามวันที่เลือก
```tsx
const [selectedDate, setSelectedDate] = useState(new Date());

// Filter location history by date
const route = locationHistory
  .filter(loc => isSameDay(new Date(loc.createdAt), selectedDate))
  .map(loc => [loc.latitude, loc.longitude]);
```

### 3. แสดงหลายเส้นทาง (หลายวัน)
```tsx
// แสดงเส้นทาง 7 วันล่าสุด (แต่ละวันเป็นสีต่างกัน)
const colors = ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500'];

{days.map((day, index) => (
  <Polyline
    key={day}
    positions={getRouteForDay(day)}
    color={colors[index]}
    weight={3}
  />
))}
```

---

## 🎨 Features ที่ควรมี

### Basic
- ✅ แสดงเส้นทาง (Polyline)
- ✅ Marker จุดเริ่มต้น/สิ้นสุด
- ✅ Popup แสดงเวลา

### Advanced
- ⏳ Animation (เส้นทางเคลื่อนที่)
- ⏳ Speed indicator (สีตามความเร็ว)
- ⏳ Time slider (ดูเส้นทางตามเวลา)
- ⏳ Heatmap (จุดที่ไปบ่อย)

---

## 💡 สรุป

### ตอนนี้ (OpenStreetMap + Leaflet)
- ✅ ฟรี 100%
- ✅ ทำเส้นทางได้
- ✅ เพียงพอสำหรับ internal use

### ถ้าอยากอัพเกรด
- ⭐ **Mapbox** - ภาพสวย + เหมาะกับ tracking
- Google Maps - ถ้าต้องการภาพถ่ายดาวเทียมละเอียด

### การทำเส้นทาง
- ✅ ใช้ `Polyline` component
- ✅ ดึง location history จาก API
- ✅ แสดงเป็นเส้นสีบนแผนที่

---

## 🚀 Next Steps

1. ✅ สร้าง API endpoint `/api/devices/:id/location-history`
2. ✅ แก้ `DeviceMap` component ให้รับ `locationHistory` prop
3. ✅ เพิ่ม `Polyline` component
4. ✅ (Optional) เปลี่ยนไปใช้ Mapbox

