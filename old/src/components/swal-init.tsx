'use client'

import { useEffect } from 'react'
import '@/lib/swal-config'

// This component ensures SweetAlert2 dark mode styles are initialized
export function SwalInit() {
  useEffect(() => {
    // Styles are already injected by swal-config.ts
    // This component just ensures it runs on client side
  }, [])
  
  return null
}

