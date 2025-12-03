import bcrypt from 'bcryptjs'
import { prisma } from './prisma'
import { UserRole } from '@prisma/client'

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

export async function authenticateUser(
  username: string,
  password: string
): Promise<{ id: number; username: string; role: UserRole; name: string } | null> {
  const user = await prisma.user.findUnique({
    where: { username },
  })

  if (!user || !user.active) {
    return null
  }

  const isValid = await verifyPassword(password, user.passwordHash)
  if (!isValid) {
    return null
  }

  return {
    id: user.id,
    username: user.username,
    role: user.role,
    name: user.name,
  }
}

export function hasPermission(userRole: UserRole, requiredRoles: UserRole[]): boolean {
  return requiredRoles.includes(userRole)
}

