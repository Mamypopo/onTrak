'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LogOut, Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/ui/theme-toggle'

export function Nav() {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleLogout = () => {
    localStorage.removeItem('token')
    router.push('/login')
    router.refresh()
  }

  const isDashboard = pathname === '/dashboard'
  const isDeviceDetail = pathname?.startsWith('/dashboard/device/')
  const isUsers = pathname === '/dashboard/users'
  const isSettings = pathname === '/dashboard/settings'

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="flex items-center space-x-2">
            <span className="text-xl font-bold">OnTrak MDM</span>
          </Link>
          
          <div className="hidden md:flex items-center gap-4">
            <Link
              href="/dashboard"
              className={`text-sm font-medium transition-colors hover:text-primary ${
                isDashboard ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              Dashboard
            </Link>
            <Link
              href="/dashboard/users"
              className={`text-sm font-medium transition-colors hover:text-primary ${
                isUsers ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              Users
            </Link>
            <Link
              href="/dashboard/settings"
              className={`text-sm font-medium transition-colors hover:text-primary ${
                isSettings ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              Settings
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          
          <Button variant="ghost" size="icon" onClick={handleLogout} className="hidden md:flex">
            <LogOut className="h-5 w-5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden border-t">
          <div className="container px-4 py-2 space-y-2">
            <Link
              href="/dashboard"
              className="block py-2 text-sm font-medium"
              onClick={() => setMobileMenuOpen(false)}
            >
              Dashboard
            </Link>
            <Link
              href="/dashboard/users"
              className="block py-2 text-sm font-medium"
              onClick={() => setMobileMenuOpen(false)}
            >
              Users
            </Link>
            <Link
              href="/dashboard/settings"
              className="block py-2 text-sm font-medium"
              onClick={() => setMobileMenuOpen(false)}
            >
              Settings
            </Link>
            <div className="pt-2 border-t">
              <Button variant="ghost" size="sm" onClick={handleLogout} className="w-full justify-start">
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}

