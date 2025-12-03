/**
 * Helper function เพื่อกำหนด itemType ตาม session type และ menu item properties
 * 
 * Logic:
 * - ถ้าเป็นบุฟเฟ่ต์ และ item.isFreeInBuffet = true → ฟรี (BUFFET_INCLUDED)
 * - ถ้าเป็นบุฟเฟ่ต์ และ item.isFreeInBuffet = false → จ่ายเพิ่ม (A_LA_CARTE)
 * - ถ้าเป็น à la carte → จ่ายตามราคาทุกอย่าง (A_LA_CARTE)
 * 
 * Note: isBuffetItem/isALaCarteItem ใช้สำหรับ filtering เท่านั้น
 *       isFreeInBuffet ใช้สำหรับการคิดเงิน
 */
export function determineItemType(
  sessionType: 'buffet' | 'a_la_carte',
  menuItem: { isFreeInBuffet?: boolean }
): 'BUFFET_INCLUDED' | 'A_LA_CARTE' {
  if (sessionType === 'buffet' && menuItem.isFreeInBuffet) {
    return 'BUFFET_INCLUDED'
  }
  return 'A_LA_CARTE'
}

