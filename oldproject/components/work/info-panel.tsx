'use client'

import { WorkOrder, ActivityLog } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { format } from 'date-fns'
import { th } from 'date-fns/locale'
import { FileText, Clock, User, Activity, Download, Building2, AlertCircle } from 'lucide-react'
import { getDeadlineInfo, formatDeadline } from '@/lib/deadline-utils'
import { useState, useEffect, useCallback } from 'react'
import { useSocket } from '@/lib/socket-client'
import { cn } from '@/lib/utils'
import { EditWorkDialog } from '@/components/work/edit-work-dialog'

interface InfoPanelProps {
  workOrder: WorkOrder | null
  onWorkOrderUpdate?: () => void
}

const priorityColors = {
  LOW: 'bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30 hover:bg-blue-500/30 hover:border-blue-500/50',
  MEDIUM: 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/30 hover:border-yellow-500/50',
  HIGH: 'bg-orange-500/20 text-orange-600 dark:text-orange-400 border-orange-500/30 hover:bg-orange-500/30 hover:border-orange-500/50',
  URGENT: 'bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30 hover:bg-red-500/30 hover:border-red-500/50',
}

const priorityLabels = {
  LOW: 'ต่ำ',
  MEDIUM: 'ปานกลาง',
  HIGH: 'สูง',
  URGENT: 'ด่วน',
}

export function InfoPanel({ workOrder, onWorkOrderUpdate }: InfoPanelProps) {
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const socket = useSocket()

  // Memoized event handler to prevent unnecessary re-renders
  const handleActivityNew = useCallback((log: ActivityLog) => {
    setActivityLogs((prev) => [log, ...prev])
  }, [])

  const fetchActivityLogs = useCallback(async () => {
    if (!workOrder) return

    setIsLoading(true)
    try {
      const res = await fetch(`/api/activity?limit=50`)
      const data = await res.json()
      if (data.logs) {
        // Filter logs related to this work order
        const filtered = data.logs.filter((log: ActivityLog) =>
          log.details?.includes(workOrder.title)
        )
        setActivityLogs(filtered)
      }
    } finally {
      setIsLoading(false)
    }
  }, [workOrder])

  useEffect(() => {
    if (workOrder) {
      fetchActivityLogs()
    } else {
      setActivityLogs([])
    }
  }, [workOrder, fetchActivityLogs])

  useEffect(() => {
    if (socket && workOrder?.id) {
      // Don't join room here - parent component (WorkDetailClient) already joined
      // Just listen to events
      socket.on('activity:new', handleActivityNew)

      return () => {
        socket.off('activity:new', handleActivityNew)
        // Don't leave room here - parent component will handle it
      }
    }
  }, [socket, workOrder?.id, handleActivityNew])

  if (!workOrder) {
    return (
      <div className="h-full flex items-center justify-center bg-muted/10">
        <div className="text-center space-y-3">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            เลือกงานเพื่อดูรายละเอียด
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full md:h-full flex flex-col bg-gradient-to-b from-background to-muted/10 py-3 px-3 md:px-4 md:overflow-hidden">
      {/* Enhanced Header */}
      <div className="mb-3 space-y-2.5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            ข้อมูลงาน
          </h3>
          {workOrder && (
            <EditWorkDialog 
              workOrder={workOrder} 
              onUpdate={() => {
                onWorkOrderUpdate?.()
              }}
            />
          )}
        </div>
        <h2 className="text-base font-bold line-clamp-2 leading-tight">{workOrder.title}</h2>
      </div>

      <Card className="flex-1 flex flex-col rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm shadow-lg min-h-0 overflow-hidden">
        <Tabs defaultValue="details" className="flex-1 flex flex-col overflow-hidden min-h-0">
          <div className="px-3 pt-3 border-b border-border/50 bg-muted/20 shrink-0">
            <TabsList className="grid w-full grid-cols-3 h-9 bg-transparent gap-1">
              <TabsTrigger 
                value="details" 
                className="text-xs data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-sm rounded-lg transition-all"
              >
                <FileText className="h-3 w-3 mr-1.5" />
                รายละเอียด
              </TabsTrigger>
              <TabsTrigger 
                value="files" 
                className="text-xs data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-sm rounded-lg transition-all"
              >
                <Download className="h-3 w-3 mr-1.5" />
                ไฟล์
              </TabsTrigger>
              <TabsTrigger 
                value="activity" 
                className="text-xs data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-sm rounded-lg transition-all"
              >
                <Activity className="h-3 w-3 mr-1.5" />
                Log
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="details" className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0">
            {/* Company */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="text-xs font-semibold text-foreground">บริษัท</span>
              </div>
              <p className="text-xs text-muted-foreground pl-5.5">{workOrder.company}</p>
            </div>

            {/* Description */}
            {workOrder.description && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="text-xs font-semibold text-foreground">รายละเอียด</span>
                </div>
                <p className="text-xs text-muted-foreground whitespace-pre-wrap pl-5.5 leading-relaxed">
                  {workOrder.description}
                </p>
              </div>
            )}

            {/* Priority Badge */}
            <div className="space-y-1.5">
              <Badge className={cn("text-xs border", priorityColors[workOrder.priority])}>
                {priorityLabels[workOrder.priority]}
              </Badge>
            </div>

            {/* Deadline */}
            {workOrder.deadline && (() => {
              const deadlineInfo = getDeadlineInfo(workOrder.deadline)
              return (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="text-xs font-semibold text-foreground">กำหนดส่ง</span>
                  </div>
                  <div className="pl-5.5 space-y-1.5">
                    <p className="text-xs text-muted-foreground">
                      {formatDeadline(workOrder.deadline)}
                    </p>
                    {deadlineInfo && (
                      <div className={cn(
                        "flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-xs font-medium",
                        deadlineInfo.bgColor,
                        deadlineInfo.color,
                        deadlineInfo.borderColor,
                        deadlineInfo.isUrgent && "animate-pulse"
                      )}>
                        {deadlineInfo.isOverdue ? (
                          <AlertCircle className={cn("h-3.5 w-3.5", deadlineInfo.iconColor)} />
                        ) : (
                          <Clock className={cn("h-3.5 w-3.5", deadlineInfo.iconColor)} />
                        )}
                        <span>{deadlineInfo.remaining}</span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })()}

            {/* Created By */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="text-xs font-semibold text-foreground">สร้างโดย</span>
              </div>
              <p className="text-xs text-muted-foreground pl-5.5">{workOrder.createdBy?.name || 'ไม่ทราบ'}</p>
              <p className="text-[10px] text-muted-foreground pl-5.5">
                {format(new Date(workOrder.createdAt), 'dd MMM yyyy HH:mm', { locale: th })}
              </p>
            </div>

            {/* Checkpoints Count */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Activity className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="text-xs font-semibold text-foreground">Checkpoints</span>
              </div>
              <p className="text-xs text-muted-foreground pl-5.5">
                {workOrder.checkpoints?.length || 0} จุดตรวจ
              </p>
            </div>
          </TabsContent>

          <TabsContent value="files" className="flex-1 overflow-y-auto px-4 py-4 min-h-0">
            {workOrder.attachments && workOrder.attachments.length > 0 ? (
              <div className="space-y-2.5">
                {workOrder.attachments.map((attachment) => (
                  <div
                    key={attachment.id}
                    className="group flex items-center justify-between p-3 rounded-lg border border-border/50 bg-card/50 hover:bg-card hover:border-primary/30 hover:shadow-md transition-all duration-200"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">
                          {attachment.url.split('/').pop()}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">ไฟล์แนบ</p>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 w-8 p-0 shrink-0 rounded-lg hover:bg-primary/10 hover:text-primary transition-colors" 
                      asChild
                    >
                      <a href={attachment.url} target="_blank" rel="noopener noreferrer">
                        <Download className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mb-3">
                  <FileText className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-muted-foreground mb-1">ยังไม่มีไฟล์แนบ</p>
                <p className="text-xs text-muted-foreground/80">เพิ่มไฟล์แนบเพื่อให้ข้อมูลครบถ้วน</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="activity" className="flex-1 overflow-y-auto px-4 py-4 min-h-0">
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="border-l-2 border-muted pl-4 pb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Skeleton className="h-3 w-20 rounded" />
                      <Skeleton className="h-2.5 w-24 rounded" />
                    </div>
                    <Skeleton className="h-3 w-32 rounded mb-1" />
                    <Skeleton className="h-2.5 w-full rounded" />
                  </div>
                ))}
              </div>
            ) : activityLogs.length > 0 ? (
              <div className="space-y-3">
                {activityLogs.map((log, index) => (
                  <div 
                    key={log.id} 
                    className="relative pl-4 pb-4 group"
                  >
                    {/* Timeline Line */}
                    {index !== activityLogs.length - 1 && (
                      <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary/30 to-transparent" />
                    )}
                    
                    {/* Timeline Dot */}
                    <div className="absolute left-0 top-1.5 -translate-x-1/2">
                      <div className="h-3 w-3 rounded-full bg-primary border-2 border-background shadow-sm group-hover:scale-125 transition-transform" />
                    </div>

                    {/* Content */}
                    <div className="pl-4">
                      <div className="p-3 rounded-lg bg-muted/30 border border-border/50 hover:bg-muted/50 hover:border-primary/20 transition-all duration-200">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <User className="h-3.5 w-3.5 text-primary" />
                          </div>
                          <span className="text-xs font-semibold text-foreground">{log.user?.name || 'ไม่ทราบ'}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {format(new Date(log.createdAt), 'dd MMM HH:mm', { locale: th })}
                          </span>
                        </div>
                        <p className="text-xs font-medium text-foreground mb-1">{log.action}</p>
                        {log.details && (
                          <p className="text-[10px] text-muted-foreground leading-relaxed">{log.details}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mb-3">
                  <Activity className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-muted-foreground mb-1">ยังไม่มี activity log</p>
                <p className="text-xs text-muted-foreground/80">กิจกรรมจะแสดงที่นี่เมื่อมีการดำเนินการ</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  )
}
