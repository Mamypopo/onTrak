import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export function ExtraChargeSkeleton() {
  return (
    <Card className="animate-pulse">
      <CardHeader>
        <div className="flex justify-between items-start">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-5 w-16" />
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div>
          <Skeleton className="h-4 w-12 mb-2" />
          <Skeleton className="h-6 w-24" />
        </div>
        <div>
          <Skeleton className="h-4 w-16 mb-2" />
          <Skeleton className="h-5 w-20" />
        </div>
        <div className="flex gap-2 pt-4">
          <Skeleton className="flex-1 h-9" />
          <Skeleton className="flex-1 h-9" />
        </div>
      </CardContent>
    </Card>
  )
}

