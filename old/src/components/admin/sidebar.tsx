'use client'

import { usePathname, useRouter } from 'next/navigation'
import { 
  Menu, 
  Table as TableIcon, 
  Package, 
  Receipt, 
  Tag, 
  Settings, 
  Users,
  QrCode,
  X
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useTranslations } from '@/lib/i18n'

const menuItems = [
  { href: '/admin/menu', icon: Menu, label: 'admin.menu' },
  { href: '/admin/tables', icon: TableIcon, label: 'admin.tables' },
  { href: '/admin/packages', icon: Package, label: 'admin.packages' },
  { href: '/admin/extra-charges', icon: Receipt, label: 'admin.extra_charges' },
  { href: '/admin/promotions', icon: Tag, label: 'admin.promotions' },
  { href: '/admin/settings', icon: Settings, label: 'admin.settings' },
  { href: '/admin/users', icon: Users, label: 'admin.users' },
  { href: '/admin/open-table', icon: QrCode, label: 'admin.open_table' },
  { href: '/admin/close-table', icon: X, label: 'admin.close_table' },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const t = useTranslations()

  return (
    <aside className="hidden lg:block w-64 bg-card border-r min-h-screen p-4">
      <div className="mb-6">
        <h2 className="text-xl font-bold">Admin Panel</h2>
      </div>
      <nav className="space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          return (
            <Button
              key={item.href}
              onClick={() => router.push(item.href)}
              variant={isActive ? 'default' : 'ghost'}
              className={cn(
                'w-full justify-start',
                isActive && 'bg-primary text-primary-foreground'
              )}
            >
              <Icon className="w-4 h-4 mr-2" />
              {t(item.label)}
            </Button>
          )
        })}
      </nav>
    </aside>
  )
}

