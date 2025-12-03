import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export function CartItemSkeleton() {
  return (
    <Card>
      <CardContent className="p-4 sm:p-6">
        <div className="flex gap-4">
          {/* Image skeleton */}
          <Skeleton className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg flex-shrink-0" />
          
          {/* Content skeleton */}
          <div className="flex-1 space-y-3">
            <div className="space-y-2">
              <Skeleton className="h-5 w-32 sm:w-40" />
              <Skeleton className="h-4 w-20" />
            </div>
            
            {/* Quantity controls skeleton */}
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-8 rounded" />
              <Skeleton className="h-6 w-8" />
              <Skeleton className="h-8 w-8 rounded" />
            </div>
            
            {/* Note input skeleton */}
            <Skeleton className="h-9 w-full" />
          </div>
          
          {/* Delete button skeleton */}
          <Skeleton className="h-9 w-9 rounded flex-shrink-0" />
        </div>
      </CardContent>
    </Card>
  )
}

