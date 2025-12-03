import { Card, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export function SessionCardSkeleton() {
  return (
    <Card className="animate-pulse">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <Skeleton className="h-6 w-24 mb-2" />
            <div className="flex gap-4 mt-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
          <div className="text-right">
            <Skeleton className="h-3 w-20 mb-2" />
            <Skeleton className="h-4 w-16 mb-2" />
            <div className="flex gap-2">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-20" />
            </div>
          </div>
        </div>
      </CardHeader>
    </Card>
  )
}

