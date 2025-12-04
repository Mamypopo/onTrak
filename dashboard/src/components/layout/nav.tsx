'use client'

import { useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { LogOut, Menu, X, LayoutDashboard, Users, Settings2, ClipboardList } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import Swal from "sweetalert2"
import { getSwalConfig } from "@/lib/swal-config"

export function Nav() {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleLogout = async () => {
    const result = await Swal.fire(getSwalConfig({
      icon: "question",
      title: "ออกจากระบบ",
      text: "คุณต้องการออกจากระบบหรือไม่?",
      showCancelButton: true,
      confirmButtonText: "ออกจากระบบ",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: "#ef4444",
    }))

    if (result.isConfirmed) {
      localStorage.removeItem("token")
      localStorage.removeItem("theme")
      
      // แสดง toast success ก่อน redirect
      await Swal.fire({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 1500, // 1.5 วินาที
        timerProgressBar: true,
        icon: "success",
        title: "ออกจากระบบสำเร็จ",
        color: '#1f2937',
        background: '#ffffff',
      })
      
      // Redirect หลังจาก toast แสดงเสร็จ
      router.push("/login")
      router.refresh()
    }
  }

  const isDashboard = pathname === "/dashboard"
  const isDeviceDetail = pathname?.startsWith("/dashboard/device/")
  const isUsers = pathname === "/dashboard/users"
  const isCheckouts = pathname?.startsWith("/dashboard/checkouts")
  const isSettings = pathname === "/dashboard/settings"

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
              <span className="text-[11px] text-muted-foreground">Tablet Management</span>
            </div>
          </Link>
        </div>

        {/* Center: Main nav (desktop) */}
        <div className="hidden md:flex flex-1 justify-center">
          <div className="inline-flex items-center gap-6 border border-border/60 rounded-xl px-4 py-1 bg-background/80 shadow-sm">
            <Link
              href="/dashboard"
              className={`inline-flex items-center gap-2 px-1 py-1 text-sm font-medium transition-colors border-b-2 ${
                isDashboard || isDeviceDetail
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted"
              }`}
            >
              <LayoutDashboard className="h-3.5 w-3.5" />
              <span>Dashboard</span>
            </Link>
            <Link
              href="/dashboard/users"
              className={`inline-flex items-center gap-2 px-1 py-1 text-sm font-medium transition-colors border-b-2 ${
                isUsers
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted"
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              <span>Users</span>
            </Link>
            <Link
              href="/dashboard/checkouts"
              className={`inline-flex items-center gap-2 px-1 py-1 text-sm font-medium transition-colors border-b-2 ${
                isCheckouts
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted"
              }`}
            >
              <ClipboardList className="h-3.5 w-3.5" />
              <span>Checkouts</span>
            </Link>
            <Link
              href="/dashboard/settings"
              className={`inline-flex items-center gap-2 px-1 py-1 text-sm font-medium transition-colors border-b-2 ${
                isSettings
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted"
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
              <span>Dashboard</span>
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
              href="/dashboard/checkouts"
              className="flex items-center gap-2 py-2 text-sm font-medium"
              onClick={() => setMobileMenuOpen(false)}
            >
              <ClipboardList className="h-4 w-4" />
              <span>Checkouts</span>
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

