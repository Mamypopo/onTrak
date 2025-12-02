import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { WorkDetailClient } from '@/components/work/work-detail-client'
import { AppLayout } from '@/components/layout/app-layout'

export default async function WorkDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const session = await getSession()
  
  if (!session) {
    redirect('/login')
  }

  return (
    <AppLayout>
      <WorkDetailClient workId={params.id} />
    </AppLayout>
  )
}

