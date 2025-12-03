'use client'

import { LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { logout } from '@/lib/auth-helpers'
import { useTranslations } from '@/lib/i18n'
import { ThemeToggle } from '@/components/theme-toggle'
import { MobileSidebar } from './mobile-sidebar'

export function Topbar() {
  const t = useTranslations()

  return (
    <header className="h-14 sm:h-16 border-b bg-card flex items-center justify-between px-4 sm:px-6">
      <div className="flex items-center gap-2">
        <MobileSidebar />
        <h1 className="text-lg sm:text-xl font-bold truncate">Mooprompt</h1>
      </div>
      <div className="flex items-center gap-1 sm:gap-2">
        <ThemeToggle />
        <Button variant="ghost" onClick={logout} className="text-xs sm:text-sm">
          <LogOut className="w-4 h-4 mr-1 sm:mr-2" />
          <span className="hidden sm:inline">{t('auth.logout')}</span>
        </Button>
      </div>
    </header>
  )
}

