import Swal, { SweetAlertOptions } from 'sweetalert2'

/**
 * Get SweetAlert2 configuration with dark mode support
 * Automatically detects system/theme preference
 */
export function getSwalConfig(overrides?: SweetAlertOptions): SweetAlertOptions {
  // ตรวจสอบ dark mode จาก class หรือ system preference
  const isDark = 
    document.documentElement.classList.contains('dark') ||
    (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)

  const baseConfig: SweetAlertOptions = {
    color: isDark ? '#e5e7eb' : '#1f2937',
    background: isDark ? '#1a1a1a' : '#ffffff',
    backdrop: `rgba(0, 0, 0, 0.4)`,
    confirmButtonColor: isDark ? '#a855f7' : '#9333ea', // primary color
    cancelButtonColor: isDark ? '#6b7280' : '#9ca3af',
    denyButtonColor: isDark ? '#ef4444' : '#dc2626',
    allowOutsideClick: true,
    allowEscapeKey: true,
    allowEnterKey: true,
    focusConfirm: true,
    showConfirmButton: true,
    confirmButtonText: 'OK',
    ...overrides,
  }

  return baseConfig
}

/**
 * Toast config (non-blocking) with dark mode support
 * ใช้สำหรับแจ้งเตือนเล็ก ๆ เช่น ส่งคำสั่งสำเร็จ / คัดลอกข้อมูล
 */
export function getToastConfig(overrides?: SweetAlertOptions): SweetAlertOptions {
  // ตรวจสอบ dark mode จาก class หรือ system preference
  const isDark = 
    document.documentElement.classList.contains('dark') ||
    (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)

  // ลบพารามิเตอร์ที่ไม่เข้ากันกับ toast mode ออกจาก overrides
  const { backdrop, allowOutsideClick, allowEscapeKey, allowEnterKey, focusConfirm, ...safeOverrides } = overrides || {}

  // Toast config ไม่ควรมีพารามิเตอร์ที่ไม่เข้ากันกับ toast mode
  const toastConfig: SweetAlertOptions = {
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 2000,
    timerProgressBar: true,
    // ไม่ใส่ backdrop, allowOutsideClick, allowEscapeKey, allowEnterKey, focusConfirm เพราะไม่เข้ากันกับ toast
    color: isDark ? '#e5e7eb' : '#1f2937',
    background: isDark ? '#1a1a1a' : '#ffffff',
    ...safeOverrides,
  }

  return toastConfig
}

/**
 * SweetAlert2 wrapper with dark mode support
 */
export const SwalWithTheme = {
  fire: (options: SweetAlertOptions) => {
    return Swal.fire(getSwalConfig(options))
  },
  mixin: (options: SweetAlertOptions) => {
    return Swal.mixin(getSwalConfig(options))
  },
}

