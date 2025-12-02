'use client'

import { Checkpoint } from '@/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { CheckCircle2, Clock, AlertCircle, RotateCcw, TrendingUp, Sparkles, Play, Lock, Building2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { th } from 'date-fns/locale'
import { useUser } from '@/contexts/user-context'

interface TimelineProps {
  checkpoints: Checkpoint[]
  onCheckpointClick?: (checkpoint: Checkpoint) => void
  selectedCheckpointId?: string
  onCheckpointAction?: (checkpointId: string, action: string) => void
  isLoading?: boolean
}

const statusConfig = {
  PENDING: { 
    icon: Clock, 
    bgColor: 'bg-gray-500/10 dark:bg-gray-500/20',
    borderColor: 'border-gray-400/50 dark:border-gray-400/30',
    iconColor: 'text-gray-500 dark:text-gray-400',
    iconBg: 'bg-gray-100 dark:bg-gray-800',
    lineColor: 'bg-gray-300 dark:bg-gray-600',
    gradient: 'from-gray-400 to-gray-500',
    text: 'รอดำเนินการ',
    glow: 'shadow-gray-500/20'
  },
  PROCESSING: { 
    icon: TrendingUp, 
    bgColor: 'bg-blue-500/10 dark:bg-blue-500/20',
    borderColor: 'border-blue-400/50 dark:border-blue-400/30',
    iconColor: 'text-blue-600 dark:text-blue-400',
    iconBg: 'bg-blue-100 dark:bg-blue-900/30',
    lineColor: 'bg-blue-500',
    gradient: 'from-blue-400 to-blue-600',
    text: 'กำลังดำเนินการ',
    glow: 'shadow-blue-500/30'
  },
  COMPLETED: { 
    icon: CheckCircle2, 
    bgColor: 'bg-green-500/10 dark:bg-green-500/20',
    borderColor: 'border-green-400/50 dark:border-green-400/30',
    iconColor: 'text-green-600 dark:text-green-400',
    iconBg: 'bg-green-100 dark:bg-green-900/30',
    lineColor: 'bg-green-500',
    gradient: 'from-green-400 to-green-600',
    text: 'เสร็จสิ้น',
    glow: 'shadow-green-500/30'
  },
  RETURNED: { 
    icon: RotateCcw, 
    bgColor: 'bg-yellow-500/10 dark:bg-yellow-500/20',
    borderColor: 'border-yellow-400/50 dark:border-yellow-400/30',
    iconColor: 'text-yellow-600 dark:text-yellow-400',
    iconBg: 'bg-yellow-100 dark:bg-yellow-900/30',
    lineColor: 'bg-yellow-500',
    gradient: 'from-yellow-400 to-yellow-600',
    text: 'ส่งกลับ',
    glow: 'shadow-yellow-500/30'
  },
  PROBLEM: { 
    icon: AlertCircle, 
    bgColor: 'bg-red-500/10 dark:bg-red-500/20',
    borderColor: 'border-red-400/50 dark:border-red-400/30',
    iconColor: 'text-red-600 dark:text-red-400',
    iconBg: 'bg-red-100 dark:bg-red-900/30',
    lineColor: 'bg-red-500',
    gradient: 'from-red-400 to-red-600',
    text: 'มีปัญหา',
    glow: 'shadow-red-500/30'
  },
}

export function Timeline({ checkpoints, onCheckpointClick, selectedCheckpointId, onCheckpointAction, isLoading }: TimelineProps) {
  const { user: currentUser } = useUser()

  // Helper function to check if user can perform action
  const canPerformAction = (checkpoint: Checkpoint, action: string): { can: boolean; reason?: string } => {
    if (!currentUser) {
      return { can: false, reason: 'กรุณาเข้าสู่ระบบ' }
    }

    const isAdmin = currentUser.role === 'ADMIN'
    const isOwnerDept = currentUser.departmentId === checkpoint.ownerDeptId

    // Check department permission (except for ADMIN)
    if (!isAdmin && !isOwnerDept) {
      return { can: false, reason: 'คุณไม่มีสิทธิ์ดำเนินการ checkpoint นี้ (ต้องเป็นสมาชิกของแผนกที่รับผิดชอบ)' }
    }

    // Check status validation
    if (action === 'start' && checkpoint.status !== 'PENDING') {
      return { can: false, reason: `ไม่สามารถเริ่ม checkpoint ที่มีสถานะ "${checkpoint.status}" ได้` }
    }

    if (action === 'complete' && checkpoint.status !== 'PROCESSING') {
      return { can: false, reason: `ไม่สามารถเสร็จสิ้น checkpoint ที่มีสถานะ "${checkpoint.status}" ได้` }
    }

    if ((action === 'return' || action === 'problem') && checkpoint.status !== 'PROCESSING') {
      return { can: false, reason: `ไม่สามารถ${action === 'return' ? 'ส่งกลับ' : 'รายงานปัญหา'} checkpoint ที่มีสถานะ "${checkpoint.status}" ได้` }
    }

   
    if (action === 'start') {
      const currentIndex = checkpoints.findIndex(cp => cp.id === checkpoint.id)
      if (currentIndex > 0) {
        const previousCheckpoints = checkpoints.slice(0, currentIndex)
        const incompletePrevious = previousCheckpoints.find(cp => cp.status !== 'COMPLETED')
        if (incompletePrevious) {
          return { can: false, reason: `ไม่สามารถเริ่ม checkpoint นี้ได้ เนื่องจาก checkpoint ก่อนหน้านี้ "${incompletePrevious.name}" ยังไม่เสร็จสิ้น` }
        }
      }
    }

    return { can: true }
  }

  // Check if checkpoint is blocked (waiting for previous)
  const isBlocked = (checkpoint: Checkpoint): boolean => {
    // API already sorts checkpoints by order, so use as-is
    const currentIndex = checkpoints.findIndex(cp => cp.id === checkpoint.id)
    if (currentIndex > 0) {
      const previousCheckpoints = checkpoints.slice(0, currentIndex)
      return previousCheckpoints.some(cp => cp.status !== 'COMPLETED')
    }
    return false
  }
  if (isLoading) {
    return (
      <div className="w-full">
        <div className="w-full overflow-x-auto pb-6">
          <div className="flex items-start justify-center gap-6 min-w-max px-4">
            {[...Array(4)].map((_, index) => (
              <div key={index} className="flex items-start gap-0 flex-shrink-0 p-6">
                <div className="relative flex flex-col items-center w-64 p-5">
                  {/* Icon Circle Skeleton */}
                  <Skeleton className="h-14 w-14 rounded-full mb-3" />
                  
                  {/* Content Skeleton */}
                  <div className="w-full text-center space-y-2">
                    <Skeleton className="h-4 w-32 mx-auto" />
                    <Skeleton className="h-5 w-20 mx-auto rounded-full" />
                    <div className="flex items-center justify-center gap-1 mt-2">
                      <Skeleton className="h-2 w-2 rounded-full" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!checkpoints || checkpoints.length === 0) {
    return (
      <div className="w-full p-12 text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-muted/50 mb-4">
          <Clock className="h-10 w-10 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground text-lg">ยังไม่มี checkpoint</p>
        <p className="text-sm text-muted-foreground mt-2">สร้างงานใหม่เพื่อเริ่มต้น</p>
      </div>
    )
  }

  // API already sorts checkpoints by order: 'asc', so use as-is
  const sortedCheckpoints = checkpoints

  // Find selected checkpoint for action buttons
  const selectedCheckpoint = sortedCheckpoints.find(cp => cp.id === selectedCheckpointId)
  const selectedConfig = selectedCheckpoint ? statusConfig[selectedCheckpoint.status] : null
  const selectedBlocked = selectedCheckpoint ? isBlocked(selectedCheckpoint) : false
  const selectedCanStart = selectedCheckpoint ? canPerformAction(selectedCheckpoint, 'start') : { can: false }
  const selectedCanComplete = selectedCheckpoint ? canPerformAction(selectedCheckpoint, 'complete') : { can: false }
  const selectedCanReturn = selectedCheckpoint ? canPerformAction(selectedCheckpoint, 'return') : { can: false }
  const selectedCanProblem = selectedCheckpoint ? canPerformAction(selectedCheckpoint, 'problem') : { can: false }

  return (
    <div className="w-full">
      <div className="w-full overflow-x-auto pb-6 scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent">
        <div className="flex items-start justify-center gap-3 sm:gap-4 md:gap-6 min-w-max px-2 sm:px-4">
          {sortedCheckpoints.map((checkpoint, index) => {
            const config = statusConfig[checkpoint.status]
            const Icon = config.icon
            const isLast = index === sortedCheckpoints.length - 1
            const isSelected = selectedCheckpointId === checkpoint.id
            const isCompleted = checkpoint.status === 'COMPLETED'
            const isProcessing = checkpoint.status === 'PROCESSING'
            const allPreviousCompleted = sortedCheckpoints.slice(0, index).every(cp => cp.status === 'COMPLETED')
            const blocked = isBlocked(checkpoint)

            return (
              <div key={checkpoint.id} className="relative flex items-start gap-0 flex-shrink-0 overflow-visible">
                {/* Checkpoint Card */}
                <div 
                  className={cn(
                    "group relative flex flex-col items-center w-48 sm:w-56 md:w-64 p-3 sm:p-4 rounded-lg transition-all duration-300",
                    "bg-card border border-border/50 shadow-sm",
                    "hover:shadow-md hover:border-primary/30",
                    isSelected && "ring-2 ring-primary ring-offset-1 ring-offset-background shadow-lg border-primary",
                    onCheckpointClick && "cursor-pointer"
                  )}
                  onClick={() => onCheckpointClick?.(checkpoint)}
                >
                  {/* Icon Circle */}
                  <div className={cn(
                    "relative z-10 flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full border-2 mb-2 sm:mb-3 transition-all duration-300",
                    config.iconBg,
                    config.borderColor,
                    isCompleted && "shadow-lg",
                    isProcessing && config.glow,
                    isSelected && "ring-2 ring-primary/30",
                    blocked && !isCompleted && "opacity-60"
                  )}>
                    <Icon className={cn("h-6 w-6 sm:h-7 sm:w-7 z-10", config.iconColor)} />
                    
                    {/* Pulse animation for processing */}
                    {isProcessing && (
                      <>
                        <span className="absolute inset-0 rounded-full animate-ping opacity-75 bg-blue-500" />
                        <span className="absolute inset-0 rounded-full animate-pulse bg-blue-500/20" />
                      </>
                    )}

                    {/* Success checkmark overlay for completed */}
                    {isCompleted && (
                      <div className="absolute inset-0 rounded-full bg-green-500/20 animate-in fade-in duration-300" />
                    )}

                    {/* Sparkle effect for selected */}
                    {isSelected && (
                      <Sparkles className="absolute -top-1 -right-1 h-4 w-4 sm:h-5 sm:w-5 text-primary animate-pulse z-20" />
                    )}

                    {/* Lock icon for blocked checkpoints */}
                    {blocked && !isCompleted && (
                      <div className="absolute -bottom-1 -right-1 bg-background border-2 border-border rounded-full p-0.5 sm:p-1 z-20 shadow-md">
                        <Lock className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="w-full text-center space-y-1.5 sm:space-y-2">
                    {/* Title */}
                    <h4 className={cn(
                      "text-xs sm:text-sm font-bold line-clamp-2 transition-colors leading-tight",
                      isSelected ? "text-primary" : "text-foreground",
                      blocked && !isCompleted && "opacity-60"
                    )}>
                      {checkpoint.name}
                    </h4>
                    
                    {/* Status Badge */}
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "text-[10px] sm:text-xs font-medium border px-1.5 sm:px-2",
                        config.bgColor,
                        config.iconColor,
                        config.borderColor,
                        blocked && !isCompleted && "opacity-60"
                      )}
                    >
                      {config.text}
                    </Badge>
                    
                    {/* Blocked indicator */}
                    {blocked && !isCompleted && (
                      <div className="flex items-center justify-center gap-1 text-[10px] sm:text-xs text-muted-foreground">
                        <Lock className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                        <span className="hidden sm:inline">รอ checkpoint ก่อนหน้า</span>
                        <span className="sm:hidden">รอ</span>
                      </div>
                    )}
                    
                    {/* Department */}
                    <div className="flex items-center justify-center gap-1 sm:gap-1.5 mt-1">
                      <Building2 className={cn(
                        "h-2.5 w-2.5 sm:h-3 sm:w-3",
                        isCompleted ? "text-green-500" : isProcessing ? "text-blue-500" : "text-muted-foreground"
                      )} />
                      <p className="text-[10px] sm:text-xs text-muted-foreground line-clamp-1">
                        {checkpoint.ownerDept.name}
                      </p>
                    </div>

                    {/* Time Info */}
                    {(checkpoint.startedAt || checkpoint.endedAt) && (
                      <div className="mt-1.5 sm:mt-2 pt-1.5 sm:pt-2 border-t border-border/50 space-y-0.5 sm:space-y-1">
                        {checkpoint.startedAt && (
                          <div className="flex items-center justify-center gap-1 sm:gap-1.5">
                            <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-muted-foreground" />
                            <p className="text-[10px] sm:text-xs text-muted-foreground">
                              {format(new Date(checkpoint.startedAt), 'dd MMM HH:mm', { locale: th })}
                            </p>
                          </div>
                        )}
                        {checkpoint.endedAt && (
                          <div className="flex items-center justify-center gap-1 sm:gap-1.5">
                            <CheckCircle2 className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-green-500" />
                            <p className="text-[10px] sm:text-xs text-green-600 dark:text-green-400 font-medium">
                              {format(new Date(checkpoint.endedAt), 'dd MMM HH:mm', { locale: th })}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Connection Line - positioned between checkpoints */}
                {!isLast && (
                  <div className="absolute top-[48px] sm:top-[56px] left-full w-3 sm:w-6 h-0.5 flex items-center z-0 pointer-events-none">
                    <div className={cn(
                      "h-0.5 w-full rounded-full transition-all duration-500",
                      allPreviousCompleted && isCompleted
                        ? config.lineColor
                        : allPreviousCompleted
                        ? `${config.lineColor} opacity-50`
                        : "bg-muted dark:bg-muted-foreground/30"
                    )} />
                    {/* Animated dot on line */}
                    {isProcessing && (
                      <div className={cn(
                        "absolute left-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full",
                        config.lineColor,
                        "animate-pulse"
                      )} />
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
      {selectedCheckpoint && onCheckpointAction && (
        <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-border/50 flex flex-col items-center justify-center space-y-2 sm:space-y-3 px-2 sm:px-4">
          <div className="flex items-center justify-center gap-2 sm:gap-3 flex-wrap">
            {selectedCheckpoint.status === 'PENDING' && (
              <Button
                size="sm"
                onClick={() => {
                  if (selectedCanStart.can) {
                    onCheckpointAction(selectedCheckpoint.id, 'start')
                  }
                }}
                disabled={!selectedCanStart.can}
                className={cn(
                  "h-8 sm:h-9 px-3 sm:px-4 text-xs sm:text-sm font-medium bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-md hover:shadow-lg transition-all",
                  !selectedCanStart.can && "opacity-50 cursor-not-allowed"
                )}
                title={selectedCanStart.reason}
              >
                <Play className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                เริ่ม
              </Button>
            )}
            {selectedCheckpoint.status === 'PROCESSING' && (
              <>
                <Button
                  size="sm"
                  onClick={() => {
                    if (selectedCanComplete.can) {
                      onCheckpointAction(selectedCheckpoint.id, 'complete')
                    }
                  }}
                  disabled={!selectedCanComplete.can}
                  className={cn(
                    "h-8 sm:h-9 px-3 sm:px-4 text-xs sm:text-sm font-medium bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-600 text-white shadow-md hover:shadow-lg transition-all",
                    !selectedCanComplete.can && "opacity-50 cursor-not-allowed"
                  )}
                  title={selectedCanComplete.reason}
                >
                  <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                  เสร็จ
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (selectedCanReturn.can) {
                      onCheckpointAction(selectedCheckpoint.id, 'return')
                    }
                  }}
                  disabled={!selectedCanReturn.can}
                  className={cn(
                    "h-8 sm:h-9 px-3 sm:px-4 text-xs sm:text-sm font-medium border-yellow-500/50 hover:border-yellow-500 hover:bg-yellow-500/10 transition-all",
                    !selectedCanReturn.can && "opacity-50 cursor-not-allowed"
                  )}
                  title={selectedCanReturn.reason}
                >
                  <RotateCcw className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                  ส่งกลับ
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (selectedCanProblem.can) {
                      onCheckpointAction(selectedCheckpoint.id, 'problem')
                    }
                  }}
                  disabled={!selectedCanProblem.can}
                  className={cn(
                    "h-8 sm:h-9 px-3 sm:px-4 text-xs sm:text-sm font-medium border-red-500/50 hover:border-red-500 hover:bg-red-500/10 transition-all",
                    !selectedCanProblem.can && "opacity-50 cursor-not-allowed"
                  )}
                  title={selectedCanProblem.reason}
                >
                  <AlertCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                  ปัญหา
                </Button>
              </>
            )}
          </div>
          {/* Show reason if action is disabled */}
          {((selectedCheckpoint.status === 'PENDING' && !selectedCanStart.can) ||
            (selectedCheckpoint.status === 'PROCESSING' && (!selectedCanComplete.can || !selectedCanReturn.can || !selectedCanProblem.can))) && (() => {
            const reason = selectedCheckpoint.status === 'PENDING' 
              ? selectedCanStart.reason 
              : (selectedCanComplete.reason || selectedCanReturn.reason || selectedCanProblem.reason)
            return (
              <p 
                className="text-[10px] sm:text-xs text-muted-foreground text-center px-2 sm:px-4 whitespace-nowrap overflow-x-auto max-w-full"
                title={reason}
              >
                {reason}
              </p>
            )
          })()}
        </div>
      )}
    </div>
  )
}
