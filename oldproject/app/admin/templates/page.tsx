import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { TemplatesClient } from '@/components/admin/templates-client'
import { AppLayout } from '@/components/layout/app-layout'

export default async function TemplatesPage() {
  const session = await getSession()
  
  if (!session) {
    redirect('/login')
  }

  return (
    <AppLayout>
      <TemplatesClient />
    </AppLayout>
  )
}

