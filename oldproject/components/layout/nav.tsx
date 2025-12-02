'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Moon, Sun, LogOut, Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { useTheme } from 'next-themes'
import { useUser } from '@/contexts/user-context'
import Swal from 'sweetalert2'
import { getSwalConfig } from '@/lib/swal-config'

export function Nav() {
  const pathname = usePathname()
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const { user } = useUser()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Prevent hydration mismatch for theme-dependent UI
  useEffect(() => {
    setMounted(true)
  }, [])

  const handleLogout = async () => {
    const result = await Swal.fire(getSwalConfig({
      title: 'ยืนยันการออกจากระบบ',
      text: 'คุณต้องการออกจากระบบหรือไม่?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'ออกจากระบบ',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: 'hsl(var(--destructive))',
    }))

    if (result.isConfirmed) {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push('/login')
      router.refresh()
    }
  }

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="flex items-center space-x-2">
            <span className="text-xl font-bold">FlowTrak</span>
          </Link>
          
          <div className="hidden md:flex items-center gap-4">
            <Link
              href="/dashboard"
              className={`text-sm font-medium transition-colors hover:text-primary ${
                pathname === '/dashboard' ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              Dashboard
            </Link>
            {user && (
              <>
                <Link
                  href="/admin/templates"
                  className={`text-sm font-medium transition-colors hover:text-primary ${
                    pathname?.startsWith('/admin/templates') ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  Templates
                </Link>
                {user.role === 'ADMIN' && (
                  <Link
                    href="/admin/users"
                    className={`text-sm font-medium transition-colors hover:text-primary ${
                      pathname?.startsWith('/admin/users') ? 'text-primary' : 'text-muted-foreground'
                    }`}
                  >
                    Users
                  </Link>
                )}
                <Link
                  href="/admin/departments"
                  className={`text-sm font-medium transition-colors hover:text-primary ${
                    pathname?.startsWith('/admin/departments') ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  Departments
                </Link>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <Moon className="h-4 w-4 text-muted-foreground" />
            <Switch
              checked={mounted && theme === 'dark'}
              onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
              disabled={!mounted}
              suppressHydrationWarning
            />
            <Sun className="h-4 w-4 text-muted-foreground" />
          </div>
          
          {user && (
            <div className="hidden md:flex items-center gap-2">
              <span className="text-sm text-muted-foreground">{user.name}</span>
              <Button variant="ghost" size="icon" onClick={handleLogout}>
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          )}

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
            {user && (
              <>
                <Link
                  href="/admin/templates"
                  className="block py-2 text-sm font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Templates
                </Link>
                {user.role === 'ADMIN' && (
                  <Link
                    href="/admin/users"
                    className="block py-2 text-sm font-medium"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Users
                  </Link>
                )}
                <Link
                  href="/admin/departments"
                  className="block py-2 text-sm font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Departments
                </Link>
              </>
            )}
            {user && (
              <div className="pt-2 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-sm">{user.name}</span>
                  <Button variant="ghost" size="sm" onClick={handleLogout}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}

