'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Receipt, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useTranslations } from '@/lib/i18n'
import { useStaffLocale } from '@/lib/i18n-staff'
import { getUser, logout } from '@/lib/auth-helpers'
import { getSocket } from '@/lib/socket-client'
import { ThemeToggle } from '@/components/theme-toggle'
import Swal from 'sweetalert2'
import { OrderCardSkeleton } from '@/components/skeletons'
import { Skeleton } from '@/components/ui/skeleton'

interface OrderItem {
  id: number
  menuItem: {
    name: string
  }
  qty: number
  status: 'WAITING' | 'COOKING' | 'DONE' | 'SERVED'
}

interface Order {
  id: number
  createdAt: string
  session: {
    table: {
      name: string
    }
  }
  items: OrderItem[]
}

export default function RunnerPage() {
  useStaffLocale() // Force Thai locale for staff
  const router = useRouter()
  const t = useTranslations()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const currentUser = getUser()
    if (!currentUser || (currentUser.role !== 'RUNNER' && currentUser.role !== 'ADMIN')) {
      router.push('/login')
      return
    }
    setUser(currentUser)

    fetchOrders()
    const socket = getSocket()

    socket.on('order:done', () => {
      fetchOrders()
    })

    socket.on('order:served', () => {
      fetchOrders()
    })

    return () => {
      socket.off('order:done')
      socket.off('order:served')
    }
  }, [router])

  const fetchOrders = async () => {
    try {
      const response = await fetch('/api/runner/orders')
      const data = await response.json()
      setOrders(data.orders || [])
    } catch (error) {
      console.error('Error fetching orders:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleMarkServed = async (itemId: number) => {
    try {
      const response = await fetch('/api/order/item-status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderItemId: itemId,
          status: 'SERVED',
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update status')
      }

      // Server already emits socket event, no need to emit from client

      Swal.fire({
        icon: 'success',
        title: 'เสิร์ฟแล้ว',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
      })

      fetchOrders()
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
      })
    }
  }

  // Skeleton component for order items

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 gap-3">
            <div className="flex items-center gap-2 sm:gap-3">
              <Skeleton className="w-6 h-6 sm:w-8 sm:h-8 rounded" />
              <Skeleton className="h-6 sm:h-7 w-32 sm:w-40" />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Skeleton className="h-9 w-9 rounded-md" />
              <Skeleton className="h-9 w-20 sm:w-24 flex-1 sm:flex-initial" />
            </div>
          </div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <OrderCardSkeleton key={i} variant="runner" itemCount={2} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 gap-3">
          <div className="flex items-center gap-2 sm:gap-3">
            <Receipt className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
            <h1 className="text-xl sm:text-2xl font-bold">{t('runner.title')}</h1>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <ThemeToggle />
            <Button onClick={logout} variant="outline" className="flex-1 sm:flex-initial text-sm">
              {t('auth.logout')}
            </Button>
          </div>
        </div>

        {orders.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-muted-foreground">{t('common.no_data')}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <Card key={order.id} className="border-l-4 border-l-success">
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>
                      {order.session.table.name} - ออเดอร์ #{order.id}
                    </CardTitle>
                    <span className="text-sm text-muted-foreground">
                      {new Date(order.createdAt).toLocaleTimeString('th-TH')}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {order.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex justify-between items-center p-3 bg-success/10 rounded-lg"
                      >
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-5 h-5 text-success" />
                          <span className="font-semibold">
                            {item.menuItem.name} x {item.qty}
                          </span>
                        </div>
                        <Button
                          onClick={() => handleMarkServed(item.id)}
                          variant="success"
                          size="sm"
                        >
                          {t('runner.mark_served')}
                        </Button>
                      </div>
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

