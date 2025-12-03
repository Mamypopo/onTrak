import { Skeleton } from '@/components/ui/skeleton'

interface OrderItemSkeletonProps {
  variant?: 'kitchen' | 'runner'
}

export function OrderItemSkeleton({ variant = 'kitchen' }: OrderItemSkeletonProps) {
  if (variant === 'runner') {
    return (
      <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg animate-pulse">
        <div className="flex items-center gap-2">
          <Skeleton className="w-5 h-5 rounded-full" />
          <Skeleton className="h-5 w-32 sm:w-48" />
        </div>
        <Skeleton className="h-9 w-24 sm:w-28" />
      </div>
    )
  }

  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-start p-3 bg-muted/50 rounded-lg gap-2 animate-pulse">
      <div className="flex-1 min-w-0 w-full">
        <div className="flex items-center gap-2 mb-2">
          <Skeleton className="w-4 h-4 rounded-full" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-5 w-16" />
        </div>
        <Skeleton className="h-12 w-full mt-2" />
      </div>
      <div className="flex gap-2 w-full sm:w-auto">
        <Skeleton className="h-9 flex-1 sm:flex-initial sm:w-24" />
        <Skeleton className="h-9 flex-1 sm:flex-initial sm:w-20" />
      </div>
    </div>
  )
}

