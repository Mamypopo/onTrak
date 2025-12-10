'use client'

import { useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { LogOut, Menu, X, LayoutDashboard, Users, Settings2, ClipboardList, Wrench, Terminal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
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
  const isMaintenance = pathname === "/dashboard/maintenance"
  const isBulkCommand = pathname === "/dashboard/bulk-command"
  const isSettings = pathname === "/dashboard/settings"

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <TooltipProvider delayDuration={0}>
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
            <div className="inline-flex items-center gap-1 border border-border/60 rounded-xl px-2 py-1 bg-background/80 shadow-sm">
              {[
                { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard", active: isDashboard || isDeviceDetail },
                { href: "/dashboard/bulk-command", icon: Terminal, label: "Bulk Command", active: isBulkCommand },
                { isSeparator: true },
                { href: "/dashboard/users", icon: Users, label: "Users", active: isUsers },
                { href: "/dashboard/checkouts", icon: ClipboardList, label: "Checkouts", active: isCheckouts },
                { href: "/dashboard/maintenance", icon: Wrench, label: "Maintenance", active: isMaintenance },
                { href: "/dashboard/settings", icon: Settings2, label: "Settings", active: isSettings },
              ].map((item, index) =>
                item.isSeparator ? (
                  <div key={`sep-${index}`} className="h-4 w-px bg-border/60 mx-1" />
                ) : (
                  <Tooltip key={item.href}>
                    <TooltipTrigger asChild>
                      <Link
                        href={item.href!}
                        className={`inline-flex items-center justify-center rounded-md px-2.5 py-1 text-sm font-medium transition-colors ${
                          item.active
                            ? "bg-muted text-primary"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                        }`}
                      >
                        <item.icon className="h-4 w-4 lg:mr-2" />
                        <span className="hidden lg:inline">{item.label}</span>
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent className="lg:hidden">
                      <p>{item.label}</p>
                    </TooltipContent>
                  </Tooltip>
                )
              )}
            </div>
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-2">
            <ThemeToggle />

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleLogout}
                  className="hidden md:inline-flex"
                >
                  <LogOut className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>ออกจากระบบ</p>
              </TooltipContent>
            </Tooltip>

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
      </TooltipProvider>

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
              href="/dashboard/bulk-command"
              className="flex items-center gap-2 py-2 text-sm font-medium"
              onClick={() => setMobileMenuOpen(false)}
            >
              <Terminal className="h-4 w-4" />
              <span>Bulk Command</span>
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
              href="/dashboard/maintenance"
              className="flex items-center gap-2 py-2 text-sm font-medium"
              onClick={() => setMobileMenuOpen(false)}
            >
              <Wrench className="h-4 w-4" />
              <span>Maintenance</span>
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
