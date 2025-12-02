'use client'

import { Nav } from './nav'

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Nav />
      <div className="flex-1">
        {children}
      </div>
    </div>
  )
}

