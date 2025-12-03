'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChefHat, ArrowLeft, CheckCircle, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useTranslations } from '@/lib/i18n'
import { useStaffLocale } from '@/lib/i18n-staff'
import { getUser, logout } from '@/lib/auth-helpers'
import { getSocket } from '@/lib/socket-client'
import { ThemeToggle } from '@/components/theme-toggle'
import Swal from 'sweetalert2'
import { CategorySkeleton } from '@/components/skeletons'
import { Skeleton } from '@/components/ui/skeleton'

interface MenuItem {
  id: number
  name: string
  price: number
  imageUrl?: string | null
  isAvailable: boolean
  category: {
    id: number
    name: string
  }
}

interface Category {
  id: number
  name: string
  items: MenuItem[]
}

export default function KitchenMenuPage() {
  useStaffLocale()
  const router = useRouter()
  const t = useTranslations()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingItems, setUpdatingItems] = useState<Set<number>>(new Set())

  useEffect(() => {
    const currentUser = getUser()
    if (!currentUser || (currentUser.role !== 'KITCHEN' && currentUser.role !== 'ADMIN')) {
      router.push('/login')
      return
    }

    fetchMenu()

    const socket = getSocket()
    socket.on('menu:unavailable', () => {
      fetchMenu()
    })

    return () => {
      socket.off('menu:unavailable')
    }
  }, [router])

  const fetchMenu = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/menu/items?includeUnavailable=true')
      const data = await response.json()
      
      // Group items by category
      const categoryMap = new Map<number, Category>()
      
      data.items.forEach((item: MenuItem) => {
        if (!categoryMap.has(item.category.id)) {
          categoryMap.set(item.category.id, {
            id: item.category.id,
            name: item.category.name,
            items: [],
          })
        }
        categoryMap.get(item.category.id)!.items.push(item)
      })

      setCategories(Array.from(categoryMap.values()))
    } catch (error) {
      console.error('Error fetching menu:', error)
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: 'ไม่สามารถโหลดข้อมูลเมนูได้',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
      })
    } finally {
      setLoading(false)
    }
  }

  const toggleAvailability = async (item: MenuItem) => {
    if (updatingItems.has(item.id)) return

    setUpdatingItems((prev) => new Set(prev).add(item.id))

    try {
      const response = await fetch(`/api/menu/items/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isAvailable: !item.isAvailable }),
      })

      if (!response.ok) {
        throw new Error('Failed to update menu availability')
      }

      const socket = getSocket()
      socket.emit('menu:unavailable', { menuItemId: item.id })

      Swal.fire({
        icon: 'success',
        title: 'อัพเดทสำเร็จ',
        text: `"${item.name}" ${!item.isAvailable ? 'พร้อมให้บริการ' : 'หมด'}`,
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 2000,
        timerProgressBar: true,
      })

      fetchMenu()
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: 'ไม่สามารถอัพเดทสถานะเมนูได้',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
      })
    } finally {
      setUpdatingItems((prev) => {
        const next = new Set(prev)
        next.delete(item.id)
        return next
      })
    }
  }


  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 gap-3">
            <div className="flex items-center gap-2 sm:gap-3">
              <Skeleton className="h-10 w-10 rounded-md" />
              <Skeleton className="h-6 w-24 sm:w-32" />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Skeleton className="h-9 w-9 rounded-md" />
              <Skeleton className="h-9 w-20 sm:w-24 flex-1 sm:flex-initial" />
            </div>
          </div>
          {[...Array(3)].map((_, i) => (
            <CategorySkeleton key={i} variant="kitchen" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 gap-3">
          <div className="flex items-center gap-2 sm:gap-3">
            <Button
              onClick={() => router.push('/kitchen')}
              variant="ghost"
              size="icon"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <ChefHat className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
            <h1 className="text-xl sm:text-2xl font-bold">จัดการเมนู</h1>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <ThemeToggle />
            <Button onClick={logout} variant="outline" className="flex-1 sm:flex-initial text-sm">
              {t('auth.logout')}
            </Button>
          </div>
        </div>

        {categories.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-muted-foreground">{t('common.no_data')}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4 sm:space-y-6">
            {categories.map((category) => (
              <Card key={category.id}>
                <CardHeader className="p-4 sm:p-6">
                  <CardTitle className="text-lg sm:text-xl">{category.name}</CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                    {category.items.map((item) => (
                      <Card
                        key={item.id}
                        className={`overflow-hidden border-2 ${
                          item.isAvailable
                            ? 'border-success/20'
                            : 'border-destructive/20 opacity-60'
                        }`}
                      >
                        <div className="relative w-full h-32 sm:h-40 bg-muted">
                          {item.imageUrl ? (
                            <img
                              src={item.imageUrl}
                              alt={item.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs sm:text-sm">
                              ไม่มีรูป
                            </div>
                          )}
                        </div>
                        <CardContent className="p-3 sm:p-4">
                          <div className="flex justify-between items-start gap-2 mb-2">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-sm sm:text-base truncate">
                                {item.name}
                              </h3>
                              <p className="text-primary font-bold text-sm sm:text-base">
                                ฿{item.price.toLocaleString()}
                              </p>
                            </div>
                            {item.isAvailable ? (
                              <CheckCircle className="w-5 h-5 text-success flex-shrink-0" />
                            ) : (
                              <XCircle className="w-5 h-5 text-destructive flex-shrink-0" />
                            )}
                          </div>
                          <Button
                            onClick={() => toggleAvailability(item)}
                            variant={item.isAvailable ? 'destructive' : 'success'}
                            size="sm"
                            className="w-full text-xs sm:text-sm"
                            disabled={updatingItems.has(item.id)}
                          >
                            {updatingItems.has(item.id) ? (
                              'กำลังอัพเดท...'
                            ) : item.isAvailable ? (
                              <>
                                <XCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                                ทำเป็นหมด
                              </>
                            ) : (
                              <>
                                <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                                เติมแล้ว
                              </>
                            )}
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

