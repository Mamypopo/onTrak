import { prisma } from './prisma'

export async function logAction(
  userId: number | null,
  action: string,
  detail?: Record<string, any>,
  ipAddress?: string,
  userAgent?: string
) {
  try {
    await prisma.systemLog.create({
      data: {
        userId: userId || undefined,
        action,
        detail: detail ? JSON.parse(JSON.stringify(detail)) : undefined,
        ipAddress,
        userAgent,
      },
    })
  } catch (error) {
    console.error('Failed to log action:', error)
  }
}

