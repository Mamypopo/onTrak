'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { ArrowLeft, Clock, CheckCircle, ChefHat, Utensils, FileText, StickyNote } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useTranslations } from '@/lib/i18n'
import { getSocket } from '@/lib/socket-client'
import { LanguageSwitcher } from '@/components/language-switcher'
import { ThemeToggle } from '@/components/theme-toggle'
import { OrderCardSkeleton } from '@/components/skeletons'
import { Skeleton } from '@/components/ui/skeleton'

interface OrderItem {
  id: number
  menuItem: {
    name: string
    price: number
    imageUrl?: string | null
    isBuffetItem?: boolean
    isALaCarteItem?: boolean
  }
  qty: number
  note?: string | null
  status: 'WAITING' | 'COOKING' | 'DONE' | 'SERVED'
  itemType?: 'BUFFET_INCLUDED' | 'A_LA_CARTE'
}

interface Order {
  id: number
  createdAt: string
  status: string
  note?: string | null
  items: OrderItem[]
}

export default function OrdersPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const t = useTranslations()
  const sessionId = searchParams.get('session')
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [isBuffet, setIsBuffet] = useState<boolean | null>(null) // null = ยังไม่รู้
  const [isBuffetLoading, setIsBuffetLoading] = useState(true)
  
  // ใช้ ref เพื่อป้องกันการเรียก API ซ้ำ
  const fetchingOrdersRef = useRef(false)
  const fetchingSessionRef = useRef(false)
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Wrap fetchOrders ใน useCallback เพื่อป้องกันการสร้าง function ใหม่ทุกครั้ง
  const fetchOrders = useCallback(async () => {
    if (!sessionId || fetchingOrdersRef.current) return
    
    try {
      fetchingOrdersRef.current = true
      setLoading(true)
      const response = await fetch(`/api/session/${sessionId}/orders`)
      if (response.ok) {
        const data = await response.json()
        setOrders(data.orders || [])
      }
    } catch (error) {
      console.error('Error fetching orders:', error)
    } finally {
      setLoading(false)
      fetchingOrdersRef.current = false
    }
  }, [sessionId])

  // Debounced version สำหรับ socket events
  const debouncedFetchOrders = useCallback(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }
    debounceTimeoutRef.current = setTimeout(() => {
      fetchOrders()
    }, 300) // Debounce 300ms
  }, [fetchOrders])

  useEffect(() => {
    if (!sessionId) {
      router.push('/')
      return
    }

    fetchOrders()
    const socket = getSocket()

    socket.on('order:new', debouncedFetchOrders)
    socket.on('order:cooking', debouncedFetchOrders)
    socket.on('order:done', debouncedFetchOrders)
    socket.on('order:served', debouncedFetchOrders)

    return () => {
      socket.off('order:new')
      socket.off('order:cooking')
      socket.off('order:done')
      socket.off('order:served')
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
    }
  }, [sessionId, router, fetchOrders, debouncedFetchOrders])

  // Fetch session info to check if it's buffet
  // เรียกแค่ครั้งเดียวเมื่อ sessionId เปลี่ยน (ไม่ต้อง depend on orders)
  useEffect(() => {
    if (!sessionId || fetchingSessionRef.current) return

    const fetchSessionInfo = async () => {
      try {
        fetchingSessionRef.current = true
        setIsBuffetLoading(true)
        const sessionIdNum = parseInt(sessionId, 10)
        if (isNaN(sessionIdNum)) {
          setIsBuffetLoading(false)
          fetchingSessionRef.current = false
          return
        }

        const response = await fetch(`/api/session/${sessionIdNum}`)
        if (response.ok) {
          const data = await response.json()
          const hasPackage = data.session?.packageId !== null && data.session?.packageId !== undefined
          setIsBuffet(hasPackage)
        } else {
          // ถ้า response ไม่ ok → default = false (à la carte)
          // ไม่ต้องเช็คจาก orders เพราะจะทำให้เกิด loop
          setIsBuffet(false)
        }
      } catch (error) {
        console.error('Error fetching session info:', error)
        setIsBuffet(false)
      } finally {
        setIsBuffetLoading(false)
        fetchingSessionRef.current = false
      }
    }

    fetchSessionInfo()
  }, [sessionId])
  
  // Fallback: ถ้า session API ไม่ได้ข้อมูล ให้เช็คจาก orders (แค่ครั้งเดียว)
  useEffect(() => {
    // ถ้ายังไม่รู้ว่าเป็น buffet และมี orders แล้ว → ลองเช็คจาก orders
    if (isBuffet === null && orders.length > 0 && !fetchingSessionRef.current) {
      const hasBuffetItems = orders.some(order => 
        order.items.some(item => item.itemType === 'BUFFET_INCLUDED')
      )
      setIsBuffet(hasBuffetItems)
    }
  }, [orders, isBuffet])

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'WAITING':
        return {
          icon: Clock,
          color: 'text-yellow-500',
          bgColor: 'bg-yellow-500/10',
          borderColor: 'border-yellow-500',
          badgeVariant: 'warning' as const,
        }
      case 'COOKING':
        return {
          icon: ChefHat,
          color: 'text-orange-500',
          bgColor: 'bg-orange-500/10',
          borderColor: 'border-orange-500',
          badgeVariant: 'accent' as const,
        }
      case 'DONE':
        return {
          icon: Utensils,
          color: 'text-green-500',
          bgColor: 'bg-green-500/10',
          borderColor: 'border-green-500',
          badgeVariant: 'success' as const,
        }
      case 'SERVED':
        return {
          icon: CheckCircle,
          color: 'text-blue-500',
          bgColor: 'bg-blue-500/10',
          borderColor: 'border-blue-500',
          badgeVariant: 'secondary' as const, // ใช้ secondary (สีน้ำเงิน) แทน default (สีแดง)
        }
      default:
        return {
          icon: Clock,
          color: 'text-muted-foreground',
          bgColor: 'bg-muted',
          borderColor: 'border-border',
          badgeVariant: 'outline' as const,
        }
    }
  }

  const getStatusText = (status: string) => {
    return t(`order.status.${status.toLowerCase()}`)
  }

  const getOrderTotal = (order: Order) => {
    // ถ้ายังไม่รู้ว่าเป็น buffet หรือไม่ → return 0 (รอให้ state พร้อม)
    if (isBuffet === null) {
      return 0
    }
    
    if (isBuffet) {
      // สำหรับบุฟเฟ่ต์: คำนวณแค่ A_LA_CARTE items (ยอดเพิ่มเติม)
      // ไม่รวม BUFFET_INCLUDED items (ฟรี)
      return order.items.reduce((total, item) => {
        // ตรวจสอบ itemType ก่อน (ถ้ามี)
        if (item.itemType === 'A_LA_CARTE') {
          return total + (item.menuItem.price * item.qty)
        } else if (item.itemType === 'BUFFET_INCLUDED') {
          // ฟรี (ไม่รวม)
          return total
        }
        
        // ถ้า itemType ไม่มีหรือไม่ชัดเจน (null, undefined, หรือค่าอื่น) 
        // ให้เช็คจาก menuItem properties (fallback logic)
        const isALaCarte = item.menuItem.isALaCarteItem ?? false
        const isBuffetItem = item.menuItem.isBuffetItem ?? false
        
        // ถ้าเป็น à la carte item (ไม่ใช่ buffet item เท่านั้น) → จ่ายเพิ่ม
        if (isALaCarte && !isBuffetItem) {
          return total + (item.menuItem.price * item.qty)
        }
        // ถ้าเป็นทั้งสองแบบ → จ่ายเพิ่ม (เพราะเป็นเมนูเพิ่มเติม)
        if (isALaCarte && isBuffetItem) {
          return total + (item.menuItem.price * item.qty)
        }
        // ถ้าเป็น buffet item เท่านั้น → ฟรี (ไม่รวม)
        if (!isALaCarte && isBuffetItem) {
          return total
        }
        // ถ้าไม่มีข้อมูลเลย → จ่ายเพิ่ม (default เพื่อความปลอดภัย)
        return total + (item.menuItem.price * item.qty)
      }, 0)
    } else {
      // สำหรับ à la carte: คำนวณทั้งหมด
      return order.items.reduce((total, item) => {
        return total + (item.menuItem.price * item.qty)
      }, 0)
    }
  }

  // แสดง loading ถ้ายังโหลด orders หรือยังไม่รู้ว่าเป็น buffet หรือไม่
  if (loading || isBuffetLoading || isBuffet === null) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex justify-between items-center mb-4 gap-2">
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-9 w-9 rounded" />
          </div>
          <Skeleton className="h-7 w-32 mb-4 sm:mb-6" />
          <div className="space-y-3 sm:space-y-4">
            {[...Array(3)].map((_, i) => (
              <OrderCardSkeleton key={i} itemCount={2} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-6">
        <div className="flex justify-between items-center mb-4 gap-2">
          <Button
            onClick={() => router.push(`/session/${sessionId}`)}
            variant="ghost"
            className="text-sm sm:text-base"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('common.back')}
          </Button>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <LanguageSwitcher />
          </div>
        </div>

        <h1 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">{t('order.title')}</h1>

        {orders.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-muted-foreground">{t('common.no_data')}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {orders.map((order) => {
              const orderTotal = getOrderTotal(order)
              // หา status ที่มากที่สุดใน order (เพื่อแสดง border color)
              const orderStatus = order.items.some(item => item.status === 'SERVED')
                ? 'SERVED'
                : order.items.some(item => item.status === 'DONE')
                ? 'DONE'
                : order.items.some(item => item.status === 'COOKING')
                ? 'COOKING'
                : 'WAITING'
              const statusConfig = getStatusConfig(orderStatus)
              
              return (
                <Card 
                  key={order.id}
                  className={`border-l-4 ${statusConfig.borderColor} transition-all duration-300 hover:shadow-lg`}
                >
                  <CardHeader className="p-3 sm:p-4 relative">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1 pr-20 sm:pr-0">
                        <div className={`p-1.5 rounded-md ${statusConfig.bgColor}`}>
                          {(() => {
                            const Icon = statusConfig.icon
                            return <Icon className={`w-4 h-4 ${statusConfig.color}`} />
                          })()}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <CardTitle className="text-sm sm:text-base font-semibold">
                              {t('order.order_number', { id: order.id })}
                            </CardTitle>
                            <Badge variant={statusConfig.badgeVariant} className="text-xs">
                              {getStatusText(orderStatus)}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {new Date(order.createdAt).toLocaleString('th-TH', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                      </div>
                      {/* ยอดเพิ่มเติม/ยอดรวม - บน mobile: absolute, บน desktop: flex item */}
                      <div className="absolute top-3 right-3 sm:static sm:top-auto sm:right-auto text-right flex-shrink-0">
                        <p className="text-xs text-foreground font-medium">
                          {isBuffet ? 'ยอดเพิ่มเติม' : 'ยอดรวม'}
                        </p>
                        <p className="text-lg font-bold text-primary sm:text-xl">
                          {orderTotal > 0 ? `฿${orderTotal.toLocaleString()}` : (
                            <span className="text-muted-foreground text-base">฿0</span>
                          )}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-3 sm:p-4 pt-0">
                    {/* Order Note (ถ้ามี) */}
                    {order.note && (
                      <div className="mb-3 p-2.5 bg-muted/50 dark:bg-muted/30 rounded-md border-l-2 border-primary">
                        <div className="flex items-center gap-1.5 mb-1">
                          <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                          <p className="text-xs font-medium text-muted-foreground">หมายเหตุออเดอร์:</p>
                        </div>
                        <p className="text-sm text-foreground">{order.note}</p>
                      </div>
                    )}
                    
                    <div className="space-y-1.5">
                      {order.items.map((item) => {
                        const itemStatusConfig = getStatusConfig(item.status)
                        const ItemIcon = itemStatusConfig.icon
                        return (
                          <div
                            key={item.id}
                            className={`flex flex-col p-2.5 rounded-md ${itemStatusConfig.bgColor} gap-2 transition-all duration-200`}
                          >
                            {/* Row 1: รูปภาพ (ถ้ามี), ชื่อเมนู, จำนวน, สถานะ, ราคา */}
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                {/* รูปภาพเมนู (ถ้ามี) */}
                                {item.menuItem.imageUrl ? (
                                  <img
                                    src={item.menuItem.imageUrl}
                                    alt={item.menuItem.name}
                                    className="w-10 h-10 rounded-md object-cover flex-shrink-0"
                                  />
                                ) : (
                                  <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                                    <ItemIcon className={`w-5 h-5 ${itemStatusConfig.color}`} />
                                  </div>
                                )}
                                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                  <span className="text-sm font-medium truncate">
                                    {item.menuItem.name}
                                  </span>
                                  <Badge variant="outline" className="text-xs px-1.5 py-0 flex-shrink-0">
                                    x {item.qty}
                                  </Badge>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                                <Badge variant={itemStatusConfig.badgeVariant} className="text-xs">
                                  {getStatusText(item.status)}
                                </Badge>
                                <p className="font-semibold text-sm whitespace-nowrap">
                                  {item.itemType === 'BUFFET_INCLUDED' ? (
                                    <span className="text-muted-foreground text-xs">
                                      {t('menu.buffet_included')}
                                    </span>
                                  ) : (
                                    <span className="text-primary">
                                      ฿{(item.menuItem.price * item.qty).toLocaleString()}
                                    </span>
                                  )}
                                </p>
                              </div>
                            </div>
                            
                            {/* Row 2: Note ของ item (ถ้ามี) */}
                            {item.note && (
                              <div className="flex items-start gap-1.5 pl-12 sm:pl-14">
                                <StickyNote className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
                                <p className="text-xs text-muted-foreground italic flex-1 break-words">
                                  {item.note}
                                </p>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

