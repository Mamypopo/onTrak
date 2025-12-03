import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export function MenuItemSkeleton() {
  return (
    <Card className="overflow-hidden animate-pulse">
      <CardContent className="p-3 sm:p-4">
        <div className="flex gap-3 sm:gap-4">
          {/* รูปภาพด้านซ้าย - เหมือนเมนูจริง */}
          <Skeleton className="w-24 h-24 sm:w-28 sm:h-28 flex-shrink-0 rounded-lg" />
          
          {/* เนื้อหาด้านขวา */}
          <div className="flex-1 min-w-0 flex flex-col justify-between">
            <div className="flex-1">
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <Skeleton className="h-4 w-3/4" />
                {/* Badge skeleton (อาจมีหรือไม่มี) */}
              </div>
              <Skeleton className="h-4 w-20 mb-2 sm:mb-3" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

