import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { DashboardClient } from '@/components/dashboard/dashboard-client'
import { AppLayout } from '@/components/layout/app-layout'

export default async function DashboardPage() {
  const session = await getSession()
  
  if (!session) {
    redirect('/login')
  }

  return (
    <AppLayout>
      <DashboardClient />
    </AppLayout>
  )
}

