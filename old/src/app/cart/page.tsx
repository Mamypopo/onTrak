'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Minus, Plus, Trash2, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useTranslations } from '@/lib/i18n'
import { useCartStore } from '@/store/cart-store'
import { LanguageSwitcher } from '@/components/language-switcher'
import { ThemeToggle } from '@/components/theme-toggle'
import { CartItemSkeleton } from '@/components/skeletons'
import { Skeleton } from '@/components/ui/skeleton'
import Swal from 'sweetalert2'

export default function CartPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const t = useTranslations()
  const sessionId = searchParams.get('session')
  const { items, removeItem, updateItem, clearCart, getTotal } = useCartStore()
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(true)
  const [isExpired, setIsExpired] = useState(false)

  useEffect(() => {
    if (!sessionId) {
      router.push('/')
      return
    }
    // Simulate loading for cart items
    const timer = setTimeout(() => {
      setLoading(false)
    }, 300)
    return () => clearTimeout(timer)
  }, [sessionId, router])

  // Check session expiration
  useEffect(() => {
    const checkSessionExpiration = async () => {
      if (!sessionId) return
      
      try {
        const sessionIdNum = parseInt(sessionId, 10)
        if (isNaN(sessionIdNum)) return

        const response = await fetch(`/api/session/${sessionIdNum}`)
        if (response.ok) {
          const data = await response.json()
          if (data.isExpired) {
            setIsExpired(true)
          }
        }
      } catch (error) {
        console.error('Error checking session expiration:', error)
      }
    }

    checkSessionExpiration()
    // Check every 30 seconds
    const interval = setInterval(checkSessionExpiration, 30000)
    return () => clearInterval(interval)
  }, [sessionId])

  const handleCheckout = async () => {
    if (items.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: t('cart.empty'),
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
      })
      return
    }

    // Block if session is expired
    if (isExpired) {
      Swal.fire({
        icon: 'warning',
        title: 'Session หมดอายุแล้ว',
        text: 'ไม่สามารถสั่งอาหารได้ กรุณาติดต่อพนักงาน',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
      })
      return
    }

    try {
      const response = await fetch('/api/order/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableSessionId: parseInt(sessionId!),
          items: items.map((item) => ({
            menuItemId: item.menuItemId,
            qty: item.qty,
            note: item.note,
            itemType: item.itemType || 'A_LA_CARTE', // ส่ง itemType ไปที่ API
          })),
          note: note || undefined,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create order')
      }

      Swal.fire({
        icon: 'success',
        title: 'สั่งอาหารสำเร็จ',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
      })

      clearCart()
      router.push(`/orders?session=${sessionId}`)
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: 'ไม่สามารถสั่งอาหารได้',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
      })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-24 sm:pb-28">
        <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex justify-between items-center mb-4 gap-2">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-9 rounded" />
          </div>
          <Skeleton className="h-7 w-32 mb-4 sm:mb-6" />
          <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
            {[...Array(3)].map((_, i) => (
              <CartItemSkeleton key={i} />
            ))}
          </div>
          <div className="space-y-4 mb-4">
            <div>
              <Skeleton className="h-5 w-40 mb-2" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
          <Card className="sticky bottom-0 left-0 right-0 mb-4 sm:mb-6 shadow-lg">
            <CardContent className="p-4 sm:p-6">
              <div className="flex justify-between items-center mb-3 sm:mb-4">
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-8 w-24" />
              </div>
              <Skeleton className="h-12 w-full rounded-lg" />
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-6">
          <div className="flex justify-between items-center mb-4">
            <Button
              onClick={() => router.push(`/session/${sessionId}`)}
              variant="ghost"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('common.back')}
            </Button>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <LanguageSwitcher />
            </div>
          </div>
          <Card className="text-center py-12">
            <CardContent>
              <p className="text-muted-foreground">{t('cart.empty')}</p>
              <Button
                onClick={() => router.push(`/menu?session=${sessionId}`)}
                className="mt-4"
              >
                {t('cart.view_menu')}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-40 md:pb-28">
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

        <h1 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">{t('cart.title')}</h1>

        <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
          {items.map((item) => (
            <Card key={item.menuItemId}>
              <CardContent className="p-3 sm:p-4">
                <div className="flex justify-between items-start mb-2 gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm sm:text-base truncate">{item.name}</h3>
                    <p className="text-primary font-bold text-sm sm:text-base">
                      {item.itemType === 'BUFFET_INCLUDED' ? (
                        <>
                          ฿0 <span className="text-xs text-muted-foreground">({t('menu.buffet_included')})</span>
                        </>
                      ) : (
                        <>฿{item.price.toLocaleString()}</>
                      )}
                    </p>
                  </div>
                  <Button
                    onClick={() => removeItem(item.menuItemId)}
                    variant="ghost"
                    size="icon"
                    className="flex-shrink-0"
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <Button
                    onClick={() =>
                      updateItem(item.menuItemId, item.qty - 1, item.note)
                    }
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 sm:h-9 sm:w-9"
                  >
                    <Minus className="w-3 h-3 sm:w-4 sm:h-4" />
                  </Button>
                  <span className="w-10 sm:w-12 text-center text-sm sm:text-base">{item.qty}</span>
                  <Button
                    onClick={() =>
                      updateItem(item.menuItemId, item.qty + 1, item.note)
                    }
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 sm:h-9 sm:w-9"
                  >
                    <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
                  </Button>
                </div>
                <Input
                  placeholder={t('cart.item_note')}
                  value={item.note || ''}
                  onChange={(e) => updateItem(item.menuItemId, item.qty, e.target.value)}
                  className="text-xs sm:text-sm"
                />
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="space-y-4 mb-4">
          <div>
            <label className="text-sm font-medium mb-2 block">{t('cart.order_note')}</label>
            <Input
              placeholder={t('cart.order_note_placeholder')}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {t('cart.order_note_helper')}
            </p>
          </div>
        </div>

        {/* Checkout Card - Fixed at bottom on mobile (above footer), sticky on desktop */}
        <Card className="fixed bottom-16 left-0 right-0 md:sticky md:bottom-0 md:mb-4 md:sm:mb-6 shadow-lg z-40 md:z-auto">
          <CardContent className="p-4 sm:p-6">
            <div className="flex justify-between items-center mb-3 sm:mb-4">
              <span className="text-base sm:text-lg font-semibold">{t('cart.total')}</span>
              <span className="text-xl sm:text-2xl font-bold text-primary">
                ฿{getTotal().toLocaleString()}
              </span>
            </div>
            <Button onClick={handleCheckout} className="w-full text-sm sm:text-base" size="lg">
              {t('cart.checkout')}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

