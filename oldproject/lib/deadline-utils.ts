import { format, formatDistanceToNow, isPast, differenceInHours, differenceInDays } from 'date-fns'
import { th } from 'date-fns/locale'

export interface DeadlineInfo {
  remaining: string
  color: string
  bgColor: string
  borderColor: string
  iconColor: string
  isOverdue: boolean
  isUrgent: boolean
  isWarning: boolean
}

export function getDeadlineInfo(deadline: Date | string | null | undefined): DeadlineInfo | null {
  if (!deadline) return null

  const deadlineDate = typeof deadline === 'string' ? new Date(deadline) : deadline
  const now = new Date()
  const diffInHours = differenceInHours(deadlineDate, now)
  const diffInDays = differenceInDays(deadlineDate, now)
  const isOverdue = isPast(deadlineDate)

  // Calculate remaining time text
  let remaining = ''
  if (isOverdue) {
    remaining = `เกินกำหนด ${formatDistanceToNow(deadlineDate, { addSuffix: false, locale: th })}`
  } else {
    if (diffInDays > 7) {
      remaining = `เหลืออีก ${diffInDays} วัน`
    } else if (diffInDays > 0) {
      remaining = `เหลืออีก ${diffInDays} วัน ${diffInHours % 24} ชั่วโมง`
    } else if (diffInHours > 0) {
      remaining = `เหลืออีก ${diffInHours} ชั่วโมง`
    } else {
      const diffInMinutes = Math.floor((deadlineDate.getTime() - now.getTime()) / 60000)
      remaining = `เหลืออีก ${diffInMinutes} นาที`
    }
  }

  // Determine color based on time remaining
  let color = ''
  let bgColor = ''
  let borderColor = ''
  let iconColor = ''
  let isUrgent = false
  let isWarning = false

  if (isOverdue) {
    // Overdue - Red
    color = 'text-red-600 dark:text-red-400'
    bgColor = 'bg-red-500/10 dark:bg-red-500/20'
    borderColor = 'border-red-500/30'
    iconColor = 'text-red-500'
    isUrgent = true
  } else if (diffInHours <= 24) {
    // Less than 24 hours - Red/Orange
    color = 'text-red-600 dark:text-red-400'
    bgColor = 'bg-red-500/10 dark:bg-red-500/20'
    borderColor = 'border-red-500/30'
    iconColor = 'text-red-500'
    isUrgent = true
  } else if (diffInDays <= 3) {
    // Less than 3 days - Orange
    color = 'text-orange-600 dark:text-orange-400'
    bgColor = 'bg-orange-500/10 dark:bg-orange-500/20'
    borderColor = 'border-orange-500/30'
    iconColor = 'text-orange-500'
    isWarning = true
  } else if (diffInDays <= 7) {
    // Less than 7 days - Yellow
    color = 'text-yellow-600 dark:text-yellow-400'
    bgColor = 'bg-yellow-500/10 dark:bg-yellow-500/20'
    borderColor = 'border-yellow-500/30'
    iconColor = 'text-yellow-500'
    isWarning = true
  } else {
    // More than 7 days - Green
    color = 'text-green-600 dark:text-green-400'
    bgColor = 'bg-green-500/10 dark:bg-green-500/20'
    borderColor = 'border-green-500/30'
    iconColor = 'text-green-500'
  }

  return {
    remaining,
    color,
    bgColor,
    borderColor,
    iconColor,
    isOverdue,
    isUrgent,
    isWarning,
  }
}

export function formatDeadline(deadline: Date | string | null | undefined): string {
  if (!deadline) return ''
  const deadlineDate = typeof deadline === 'string' ? new Date(deadline) : deadline
  return format(deadlineDate, 'dd MMM yyyy HH:mm', { locale: th })
}

