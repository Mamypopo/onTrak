'use client'

import Swal from 'sweetalert2'

export function getUser() {
  if (typeof window === 'undefined') return null
  const userStr = localStorage.getItem('user')
  if (!userStr) return null
  try {
    return JSON.parse(userStr)
  } catch {
    return null
  }
}

export function getToken() {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('token')
}

export async function logout() {
  if (typeof window === 'undefined') return

  const result = await Swal.fire({
    title: 'ยืนยันการออกจากระบบ',
    text: 'คุณต้องการออกจากระบบหรือไม่?',
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'ออกจากระบบ',
    cancelButtonText: 'ยกเลิก',
    confirmButtonColor: '#FF6A8B',
  })

  if (!result.isConfirmed) return

  localStorage.removeItem('user')
  localStorage.removeItem('token')
  // Clear theme preference
  localStorage.removeItem('theme')
  
  Swal.fire({
    icon: 'success',
    title: 'ออกจากระบบสำเร็จ',
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 2000,
    timerProgressBar: true,
  }).then(() => {
    window.location.href = '/login'
  })
}

export function hasRole(userRole: string, requiredRoles: string[]): boolean {
  return requiredRoles.includes(userRole)
}

