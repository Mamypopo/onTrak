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
    backdrop: `
      rgba(0, 0, 0, 0.4)
    `,
    confirmButtonColor: isDark ? '#a855f7' : '#9333ea', // primary color
    cancelButtonColor: isDark ? '#6b7280' : '#9ca3af',
    denyButtonColor: isDark ? '#ef4444' : '#dc2626',
    ...overrides,
  }

  return baseConfig
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

