import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { OrderItemSkeleton } from './order-item-skeleton'

interface OrderCardSkeletonProps {
  variant?: 'kitchen' | 'runner'
  itemCount?: number
}

export function OrderCardSkeleton({ variant = 'kitchen', itemCount = 3 }: OrderCardSkeletonProps) {
  const borderColor = variant === 'runner' ? 'border-l-success' : 'border-l-primary'
  
  return (
    <Card className={`border-l-4 ${borderColor} animate-pulse`}>
      <CardHeader className={variant === 'runner' ? '' : 'p-4 sm:p-6'}>
        <div className={`flex ${variant === 'runner' ? 'justify-between' : 'flex-col sm:flex-row justify-between items-start sm:items-center'} items-center gap-2`}>
          <Skeleton className={`h-6 ${variant === 'runner' ? 'w-48 sm:w-64' : 'w-48'}`} />
          <Skeleton className={`h-4 ${variant === 'runner' ? 'w-20 sm:w-24' : 'w-24'}`} />
        </div>
      </CardHeader>
      <CardContent className={variant === 'runner' ? '' : 'p-4 sm:p-6 pt-0'}>
        <div className={variant === 'runner' ? 'space-y-3' : 'space-y-2 sm:space-y-3'}>
          {[...Array(itemCount)].map((_, i) => (
            <OrderItemSkeleton key={i} variant={variant} />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

