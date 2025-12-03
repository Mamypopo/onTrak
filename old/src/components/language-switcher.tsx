'use client'

import { useEffect, useState } from 'react'
import { Globe, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useLocaleStore } from '@/store/locale-store'
import { Locale } from '@/lib/i18n'

export function LanguageSwitcher() {
  const [mounted, setMounted] = useState(false)
  const locale = useLocaleStore((state) => state.locale)
  const setLocale = useLocaleStore((state) => state.setLocale)

  // Prevent hydration mismatch by only rendering locale-dependent content after mount
  useEffect(() => {
    setMounted(true)
  }, [])

  const handleLocaleChange = (newLocale: Locale) => {
    setLocale(newLocale)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Change language">
          <Globe className="w-5 h-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => handleLocaleChange('th')}
          className="flex items-center justify-between"
        >
          <span>ไทย</span>
          {mounted && locale === 'th' && <Check className="w-4 h-4" />}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleLocaleChange('en')}
          className="flex items-center justify-between"
        >
          <span>English</span>
          {mounted && locale === 'en' && <Check className="w-4 h-4" />}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

