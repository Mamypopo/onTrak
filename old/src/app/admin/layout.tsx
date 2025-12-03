'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/admin/sidebar'
import { Topbar } from '@/components/admin/topbar'
import { getUser } from '@/lib/auth-helpers'
import { useStaffLocale } from '@/lib/i18n-staff'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  useStaffLocale() // Force Thai locale for admin
  const router = useRouter()

  useEffect(() => {
    const user = getUser()
    if (!user) {
      router.push('/login')
      return
    }

    // Check if user has admin access
    const allowedRoles = ['ADMIN', 'MANAGER', 'CASHIER']
    if (!allowedRoles.includes(user.role)) {
      router.push('/login')
      return
    }
  }, [router])

  return (
    <div className="min-h-screen bg-background">
      <Topbar />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-4 sm:p-6 w-full overflow-x-auto">{children}</main>
      </div>
    </div>
  )
}

