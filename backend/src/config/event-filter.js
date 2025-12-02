/**
 * Event Filter Configuration
 * 
 * กำหนด Event ที่สำคัญที่ควรเก็บใน DeviceActionLog
 * Events ที่ไม่อยู่ในรายการนี้จะไม่ถูกบันทึก
 */

// Events ที่สำคัญ - ควรเก็บ log
export const IMPORTANT_EVENTS = [
  'BOOT',          // Device เปิดเครื่อง (เก็บแค่ครั้งแรกของวัน)
  'SHUTDOWN',      // Device ปิดเครื่อง
  'LOCK',          // Device ถูกล็อค
  'UNLOCK',        // Device ถูกปลดล็อค
  'KIOSK_ENABLED', // เปิด Kiosk Mode
  'KIOSK_DISABLED', // ปิด Kiosk Mode
  'ERROR',         // เกิดข้อผิดพลาด
];

// Events ที่ไม่สำคัญ - ไม่เก็บ log
export const IGNORED_EVENTS = [
  'APP_OPENED',    // เปิดแอป (บ่อยเกินไป)
  'APP_CLOSED',    // ปิดแอป (บ่อยเกินไป)
  'HEARTBEAT',     // Status update (ไม่ใช่ event)
];

/**
 * ตรวจสอบว่า Event นี้ควรเก็บ log หรือไม่
 * @param {string} eventType - ประเภทของ event
 * @returns {boolean} true ถ้าควรเก็บ log
 */
export function shouldLogEvent(eventType) {
  if (!eventType) return false;
  
  // ไม่เก็บ event ที่อยู่ใน ignore list
  if (IGNORED_EVENTS.includes(eventType)) {
    return false;
  }
  
  // เก็บ event ที่อยู่ใน important list
  return IMPORTANT_EVENTS.includes(eventType);
}

/**
 * ตรวจสอบว่า BOOT event ควรเก็บ log หรือไม่
 * 
 * Best Practice:
 * - เก็บแค่ครั้งแรกของวัน (ไม่เก็บ Heartbeat ที่ส่ง BOOT event ทุก 10 วินาที)
 * - ถ้า message เป็น "Heartbeat" ให้ข้าม (ไม่ใช่การบูตจริง)
 * 
 * @param {string} deviceId - Device ID
 * @param {Date} eventTime - เวลาที่เกิด event
 * @param {object} eventData - ข้อมูล event (อาจมี message field)
 * @returns {Promise<boolean>} true ถ้าควรเก็บ log
 */
export async function shouldLogBootEvent(deviceId, eventTime, eventData = {}) {
  // กรอง Heartbeat ออก (message = "Heartbeat" ไม่ใช่การบูตจริง)
  if (eventData.message === 'Heartbeat') {
    return false;
  }
  
  // สำหรับ BOOT event จริง - เก็บแค่ครั้งแรกของวัน
  const today = new Date(eventTime);
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  // ตรวจสอบว่ามี BOOT event จริงในวันนี้แล้วหรือยัง (ไม่นับ Heartbeat)
  // 
  // Performance Optimization:
  // - ใช้ findFirst แทน findMany (หยุดทันทีที่เจอ record แรก)
  // - ใช้ select เพื่อเลือกเฉพาะ field ที่ต้องการ (ลด data transfer)
  // - ใช้ index ที่มีอยู่แล้ว: deviceId, action, createdAt
  // - เนื่องจาก Android code ไม่ส่ง Heartbeat แล้ว การ query จะเจอแค่ BOOT จริงๆ
  const prisma = (await import('../db/client.js')).default;
  
  // Query แค่ record แรกที่เจอ (มี index อยู่แล้ว: deviceId, action, createdAt)
  const existingBoot = await prisma.deviceActionLog.findFirst({
    where: {
      deviceId,
      action: 'BOOT',
      createdAt: {
        gte: today,
        lt: tomorrow,
      },
    },
    select: {
      id: true,
      payload: true, // ต้องการแค่ payload เพื่อตรวจสอบ Heartbeat
    },
    orderBy: {
      createdAt: 'desc', // เอา record ล่าสุดก่อน
    },
  });
  
  // ถ้าไม่มี BOOT event ในวันนี้เลย ให้เก็บ log
  if (!existingBoot) {
    return true;
  }
  
  // ตรวจสอบว่าเป็น Heartbeat หรือไม่ (สำหรับข้อมูลเก่าที่อาจมี Heartbeat หลุดเข้ามา)
  try {
    const payload = existingBoot.payload;
    if (payload && typeof payload === 'object' && payload.message === 'Heartbeat') {
      // ถ้าเป็น Heartbeat ให้เก็บ log (เพราะยังไม่มี BOOT จริงในวันนี้)
      return true;
    }
    // ถ้าเป็น BOOT จริงแล้ว ให้ไม่เก็บ log
    return false;
  } catch (e) {
    // ถ้า parse ไม่ได้ให้ถือว่าเป็น BOOT จริง (ไม่เก็บ log)
    return false;
  }
}

