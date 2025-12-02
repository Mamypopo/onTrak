'use client'

import { useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { LogOut, Menu, X, LayoutDashboard, Users, Settings2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/ui/theme-toggle"

export function Nav() {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleLogout = () => {
    localStorage.removeItem("token")
    router.push("/login")
    router.refresh()
  }

  const isDashboard = pathname === "/dashboard"
  const isDeviceDetail = pathname?.startsWith("/dashboard/device/")
  const isUsers = pathname === "/dashboard/users"
  const isSettings = pathname === "/dashboard/settings"

  const getDashboardLabel = () => {
    if (isDeviceDetail) return "Device Detail"
    return "Dashboard"
  }

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4 gap-4">
        {/* Left: Brand */}
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary shadow-sm">
              <span className="text-sm font-bold">ON</span>
            </div>
            <div className="hidden sm:flex flex-col leading-tight">
              <span className="text-sm font-semibold tracking-tight">OnTrak MDM</span>
              <span className="text-[11px] text-muted-foreground">Tablet Fleet Console</span>
            </div>
          </Link>
        </div>

        {/* Center: Main nav (desktop) */}
        <div className="hidden md:flex flex-1 justify-center">
          <div className="inline-flex items-center gap-1 rounded-full bg-muted/60 px-1 py-1 shadow-sm">
            <Link
              href="/dashboard"
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                isDashboard || isDeviceDetail
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <LayoutDashboard className="h-3.5 w-3.5" />
              <span>{getDashboardLabel()}</span>
            </Link>
            <Link
              href="/dashboard/users"
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                isUsers
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              <span>Users</span>
            </Link>
            <Link
              href="/dashboard/settings"
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                isSettings
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Settings2 className="h-3.5 w-3.5" />
              <span>Settings</span>
            </Link>
          </div>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-2">
          <ThemeToggle />

          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            className="hidden md:inline-flex"
          >
            <LogOut className="h-5 w-5" />
          </Button>

          {/* Mobile menu toggle */}
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

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t bg-background/95 backdrop-blur">
          <div className="container px-4 py-3 space-y-1">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 py-2 text-sm font-medium"
              onClick={() => setMobileMenuOpen(false)}
            >
              <LayoutDashboard className="h-4 w-4" />
              <span>{getDashboardLabel()}</span>
            </Link>
            <Link
              href="/dashboard/users"
              className="flex items-center gap-2 py-2 text-sm font-medium"
              onClick={() => setMobileMenuOpen(false)}
            >
              <Users className="h-4 w-4" />
              <span>Users</span>
            </Link>
            <Link
              href="/dashboard/settings"
              className="flex items-center gap-2 py-2 text-sm font-medium"
              onClick={() => setMobileMenuOpen(false)}
            >
              <Settings2 className="h-4 w-4" />
              <span>Settings</span>
            </Link>
            <div className="pt-2 mt-1 border-t">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="w-full justify-start"
              >
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

