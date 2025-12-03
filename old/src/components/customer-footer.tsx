'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Home, Menu as MenuIcon, ShoppingCart, Receipt } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useCartStore } from '@/store/cart-store'
import { useTranslations } from '@/lib/i18n'
import { cn } from '@/lib/utils'

export function CustomerFooter() {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const t = useTranslations()
  const { items } = useCartStore()
  const sessionId = searchParams.get('session') || pathname.split('/')[2] // Get sessionId from URL or params

  const totalCartItems = items.reduce((sum, item) => sum + item.qty, 0)

  const menuItems = [
    {
      href: `/session/${sessionId}`,
      icon: Home,
      label: t('table.home'),
      isActive: pathname.startsWith('/session/') && pathname !== '/menu',
    },
    {
      href: `/menu?session=${sessionId}`,
      icon: MenuIcon,
      label: t('table.menu'),
      isActive: pathname === '/menu',
    },
    {
      href: `/cart?session=${sessionId}`,
      icon: ShoppingCart,
      label: t('table.cart'),
      isActive: pathname === '/cart',
      badge: totalCartItems > 0 ? totalCartItems : undefined,
    },
    {
      href: `/orders?session=${sessionId}`,
      icon: Receipt,
      label: t('table.orders'),
      isActive: pathname === '/orders',
    },
  ]

  // Don't show footer on home page or if no sessionId
  if (pathname === '/' || !sessionId) {
    return null
  }

  // Only show on customer pages
  const customerPages = ['/menu', '/cart', '/orders', '/session']
  const isCustomerPage = customerPages.some((page) => pathname.startsWith(page))
  if (!isCustomerPage) {
    return null
  }

  return (
    <footer className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t shadow-lg md:hidden pb-safe">
      <div className="grid grid-cols-4 h-16">
        {menuItems.map((item) => {
          const Icon = item.icon
          return (
            <Button
              key={item.href}
              onClick={() => router.push(item.href)}
              variant="ghost"
              className={cn(
                'h-full flex-col gap-1 rounded-none',
                item.isActive && 'bg-primary/10 text-primary'
              )}
            >
              <div className="relative">
                <Icon className="w-5 h-5" />
                {item.badge && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-2 -right-2 min-w-[18px] h-[18px] px-1 flex items-center justify-center text-[10px] font-bold leading-none rounded-full"
                  >
                    {item.badge > 99 ? '99+' : item.badge}
                  </Badge>
                )}
              </div>
              <span className="text-xs">{item.label}</span>
            </Button>
          )
        })}
      </div>
    </footer>
  )
}

