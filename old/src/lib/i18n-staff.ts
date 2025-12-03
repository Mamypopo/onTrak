'use client'

import { useEffect } from 'react'
import { useLocaleStore } from '@/store/locale-store'

/**
 * Hook สำหรับ staff/admin pages ที่ต้องการใช้ภาษาไทยเสมอ
 * จะ force locale เป็น 'th' เมื่อ component mount
 */
export function useStaffLocale() {
  const setLocale = useLocaleStore((state) => state.setLocale)

  useEffect(() => {
    // Force locale to Thai for staff/admin pages
    setLocale('th')
  }, [setLocale])
}

