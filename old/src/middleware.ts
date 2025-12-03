import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Handle authentication and authorization
  // This will be enhanced with session management
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/kitchen/:path*',
    '/runner/:path*',
  ],
}

