import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'

export function SessionSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-6">
        {/* Header skeleton */}
        <div className="flex justify-between items-start mb-4 sm:mb-6 gap-2">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-7 w-32 sm:w-40" />
            <Skeleton className="h-5 w-24 sm:w-32" />
            <Skeleton className="h-4 w-28 sm:w-36" />
          </div>
          <Skeleton className="h-9 w-9 rounded" />
        </div>

        {/* Navigation buttons skeleton */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4 sm:mb-6">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-16 sm:h-20 rounded-lg" />
          ))}
        </div>

        {/* Status card skeleton */}
        <Card>
          <CardContent className="p-3 sm:p-4">
            <Skeleton className="h-5 w-24 mb-2" />
            <Skeleton className="h-4 w-32" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

