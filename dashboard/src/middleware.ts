import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Allow access to login page - client-side will handle redirect
  if (request.nextUrl.pathname === '/login') {
    return NextResponse.next();
  }

  // For dashboard routes, let client-side handle authentication
  // The dashboard page will check localStorage and redirect if needed
  if (request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*'],
}

