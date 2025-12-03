import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { MenuItemSkeleton } from './menu-item-skeleton'
import { KitchenMenuItemSkeleton } from './kitchen-menu-item-skeleton'

interface CategorySkeletonProps {
  variant?: 'menu' | 'kitchen'
  itemCount?: number
}

export function CategorySkeleton({ variant = 'menu', itemCount = 6 }: CategorySkeletonProps) {
  if (variant === 'kitchen') {
    return (
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {[...Array(itemCount)].map((_, i) => (
              <KitchenMenuItemSkeleton key={i} />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="mb-6 sm:mb-8">
      <Skeleton className="h-6 w-32 mb-3 sm:mb-4" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {[...Array(itemCount)].map((_, i) => (
          <MenuItemSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}

