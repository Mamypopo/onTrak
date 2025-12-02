import { NextRequest, NextResponse } from 'next/server'
import { getSession, SessionUser, isAdmin, hasRole } from './auth'
import { z } from 'zod'

// Standard API response types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// Standard error response
export function errorResponse(
  message: string,
  status: number = 400,
  details?: any
): NextResponse<ApiResponse> {
  return NextResponse.json(
    {
      success: false,
      error: message,
      ...(details && { details }),
    },
    { status }
  )
}

// Standard success response
export function successResponse<T>(
  data: T,
  message?: string,
  status: number = 200
): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      ...(message && { message }),
    },
    { status }
  )
}

// Authentication middleware wrapper
export async function withAuth<T = any>(
  handler: (req: NextRequest, user: SessionUser, ...args: any[]) => Promise<NextResponse<ApiResponse<T>>>,
  options?: {
    requiredRole?: 'ADMIN' | 'STAFF' | 'MANAGER'
    allowPublic?: boolean
  }
) {
  return async (req: NextRequest, ...args: any[]) => {
    try {
      const session = await getSession()

      // Check authentication
      if (!session && !options?.allowPublic) {
        return errorResponse('Unauthorized', 401)
      }

      // Check role if required
      if (session && options?.requiredRole) {
        if (!hasRole(session, options.requiredRole)) {
          return errorResponse('Forbidden: Insufficient permissions', 403)
        }
      }

      return handler(req, session!, ...args)
    } catch (error) {
      console.error('API handler error:', error)
      return errorResponse(
        'Internal server error',
        500,
        process.env.NODE_ENV === 'development' ? error : undefined
      )
    }
  }
}

// Rate limiting (simple in-memory - use Redis in production)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

export function rateLimit(
  identifier: string,
  maxRequests: number = 100,
  windowMs: number = 60000 // 1 minute
): boolean {
  const now = Date.now()
  const record = rateLimitMap.get(identifier)

  if (!record || now > record.resetTime) {
    rateLimitMap.set(identifier, {
      count: 1,
      resetTime: now + windowMs,
    })
    return true
  }

  if (record.count >= maxRequests) {
    return false
  }

  record.count++
  return true
}

// Input validation helper
export function validateInput<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: z.ZodError } {
  const result = schema.safeParse(data)
  
  if (result.success) {
    return { success: true, data: result.data }
  }
  
  return { success: false, error: result.error }
}

// Get client IP for rate limiting
export function getClientIP(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for')
  const realIP = req.headers.get('x-real-ip')
  
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  
  if (realIP) {
    return realIP
  }
  
  return req.ip || 'unknown'
}

