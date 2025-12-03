import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export function KitchenMenuItemSkeleton() {
  return (
    <Card className="overflow-hidden animate-pulse">
      <Skeleton className="w-full h-32 sm:h-40" />
      <CardContent className="p-3 sm:p-4">
        <div className="flex justify-between items-start gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <Skeleton className="h-4 w-3/4 mb-2" />
            <Skeleton className="h-4 w-1/2" />
          </div>
          <Skeleton className="w-5 h-5 rounded-full" />
        </div>
        <Skeleton className="h-9 w-full rounded-md" />
      </CardContent>
    </Card>
  )
}

