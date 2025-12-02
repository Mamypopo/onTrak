'use client'

import { useState, useEffect, useCallback } from 'react'
import { WorkOrder } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { format } from 'date-fns'
import { th } from 'date-fns/locale'
import { Search, Building2, CheckCircle2, Clock, AlertTriangle, TrendingUp, Filter, X, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react'
import { getDeadlineInfo } from '@/lib/deadline-utils'
import { cn } from '@/lib/utils'

interface WorkSidebarProps {
  selectedWorkId?: string
  onSelectWork: (workId: string) => void
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

const getWorkStatus = (work: WorkOrder) => {
  if (!work.checkpoints || work.checkpoints.length === 0) return 'PENDING'
  const allCompleted = work.checkpoints.every(cp => cp.status === 'COMPLETED')
  const hasProcessing = work.checkpoints.some(cp => cp.status === 'PROCESSING')
  const hasProblem = work.checkpoints.some(cp => cp.status === 'PROBLEM')
  
  if (allCompleted) return 'COMPLETED'
  if (hasProblem) return 'PROBLEM'
  if (hasProcessing) return 'PROCESSING'
  return 'PENDING'
}

const getWorkProgress = (work: WorkOrder) => {
  if (!work.checkpoints || work.checkpoints.length === 0) return 0
  const completed = work.checkpoints.filter(cp => cp.status === 'COMPLETED').length
  return Math.round((completed / work.checkpoints.length) * 100)
}

const statusConfig = {
  PENDING: { 
    icon: Clock, 
    color: 'text-gray-500 dark:text-gray-400',
    bgColor: 'bg-gray-500/10 dark:bg-gray-500/20',
    label: 'รอ' 
  },
  PROCESSING: { 
    icon: TrendingUp, 
    color: 'text-blue-500 dark:text-blue-400',
    bgColor: 'bg-blue-500/10 dark:bg-blue-500/20',
    label: 'กำลัง' 
  },
  COMPLETED: { 
    icon: CheckCircle2, 
    color: 'text-green-500 dark:text-green-400',
    bgColor: 'bg-green-500/10 dark:bg-green-500/20',
    label: 'เสร็จ' 
  },
  PROBLEM: { 
    icon: AlertTriangle, 
    color: 'text-red-500 dark:text-red-400',
    bgColor: 'bg-red-500/10 dark:bg-red-500/20',
    label: 'ปัญหา' 
  },
}

export function WorkSidebar({ selectedWorkId, onSelectWork }: WorkSidebarProps) {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([])
  const [filteredOrders, setFilteredOrders] = useState<WorkOrder[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [departments, setDepartments] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isFiltersOpen, setIsFiltersOpen] = useState(false)

  const fetchWorkOrders = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (departmentFilter !== 'all') params.append('departmentId', departmentFilter)
      if (statusFilter !== 'all') params.append('status', statusFilter)
      if (priorityFilter !== 'all') params.append('priority', priorityFilter)

      const res = await fetch(`/api/work?${params}`)
      const data = await res.json()
      if (data.workOrders) {
        setWorkOrders(data.workOrders)
      }
    } finally {
      setIsLoading(false)
    }
  }, [departmentFilter, statusFilter, priorityFilter])

  const fetchDepartments = useCallback(async () => {
    const res = await fetch('/api/department')
    const data = await res.json()
    if (data.departments) {
      setDepartments(data.departments)
    }
  }, [])

  const filterWorkOrders = useCallback(() => {
    let filtered = [...workOrders]

    if (searchTerm) {
      filtered = filtered.filter(
        (work) =>
          work.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          work.company.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    setFilteredOrders(filtered)
  }, [searchTerm, workOrders])

  useEffect(() => {
    fetchWorkOrders()
    fetchDepartments()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    fetchWorkOrders()
  }, [fetchWorkOrders])

  useEffect(() => {
    filterWorkOrders()
  }, [filterWorkOrders])

  const hasActiveFilters = departmentFilter !== 'all' || statusFilter !== 'all' || priorityFilter !== 'all'
  const clearFilters = () => {
    setDepartmentFilter('all')
    setStatusFilter('all')
    setPriorityFilter('all')
  }

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-background to-muted/10 py-2 px-2 md:px-3 overflow-hidden">
      {/* Enhanced Header */}
      <div className="mb-2 space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            งานทั้งหมด
          </h3>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-[10px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            >
              <X className="h-3 w-3" />
              ล้าง
            </button>
          )}
        </div>
        
        {/* Enhanced Search */}
        <div className="relative group">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input
            placeholder="ค้นหางาน..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 pr-8 h-8 text-xs bg-card/50 border-border/50 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 rounded-full hover:bg-muted flex items-center justify-center transition-colors"
            >
              <X className="h-3 w-3 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      {/* Enhanced Filters - Collapsible */}
      <div className="space-y-1.5 mb-2">
        <button
          onClick={() => setIsFiltersOpen(!isFiltersOpen)}
          className={cn(
            "w-full flex items-center justify-between gap-2 p-1.5 rounded-lg transition-all duration-200",
            "hover:bg-muted/50 border border-transparent hover:border-border/50",
            isFiltersOpen && "bg-muted/30 border-border/50"
          )}
        >
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase tracking-wide">
            <Filter className="h-3 w-3" />
            <span>ตัวกรอง</span>
            {hasActiveFilters && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[9px] font-medium">
                {[departmentFilter, statusFilter, priorityFilter].filter(f => f !== 'all').length}
              </span>
            )}
          </div>
          {isFiltersOpen ? (
            <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </button>
        {isFiltersOpen && (
          <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-200">
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className={cn(
                "h-8 text-xs border-border/50 bg-card/50 hover:bg-card transition-colors",
                departmentFilter !== 'all' && "border-primary/30 bg-primary/5"
              )}>
                <SelectValue placeholder="แผนก" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทั้งหมด</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className={cn(
                "h-8 text-xs border-border/50 bg-card/50 hover:bg-card transition-colors",
                statusFilter !== 'all' && "border-primary/30 bg-primary/5"
              )}>
                <SelectValue placeholder="สถานะ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทั้งหมด</SelectItem>
                <SelectItem value="PENDING">รอดำเนินการ</SelectItem>
                <SelectItem value="PROCESSING">กำลังดำเนินการ</SelectItem>
                <SelectItem value="COMPLETED">เสร็จสิ้น</SelectItem>
                <SelectItem value="PROBLEM">มีปัญหา</SelectItem>
              </SelectContent>
            </Select>

            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className={cn(
                "h-8 text-xs border-border/50 bg-card/50 hover:bg-card transition-colors",
                priorityFilter !== 'all' && "border-primary/30 bg-primary/5"
              )}>
                <SelectValue placeholder="ความสำคัญ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทั้งหมด</SelectItem>
                <SelectItem value="LOW">ต่ำ</SelectItem>
                <SelectItem value="MEDIUM">ปานกลาง</SelectItem>
                <SelectItem value="HIGH">สูง</SelectItem>
                <SelectItem value="URGENT">ด่วน</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Work List - Enhanced */}
      <div className="flex-1 overflow-y-auto -mr-1 pr-1 scrollbar-thin min-h-0">
        {isLoading ? (
          <div className="space-y-1.5">
            {[...Array(5)].map((_, i) => (
              <Card key={i} className="border rounded-xl overflow-hidden">
                <CardContent className="p-3">
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-3 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                      <Skeleton className="h-4 w-12 shrink-0 rounded" />
                    </div>
                    <Skeleton className="h-2.5 w-2/3" />
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Skeleton className="h-3 w-16 rounded" />
                        <Skeleton className="h-3 w-10 rounded" />
                      </div>
                      <Skeleton className="h-1.5 w-full rounded-full" />
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t">
                      <Skeleton className="h-2.5 w-12 rounded" />
                      <Skeleton className="h-2.5 w-16 rounded" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
              <Search className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-xs font-medium text-muted-foreground mb-1">ไม่พบงาน</p>
            <p className="text-[10px] text-muted-foreground/80">
              {searchTerm || hasActiveFilters ? 'ลองเปลี่ยนคำค้นหาหรือตัวกรอง' : 'ยังไม่มีงานในระบบ'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredOrders.map((work) => {
              const status = getWorkStatus(work)
              const progress = getWorkProgress(work)
              const statusInfo = statusConfig[status as keyof typeof statusConfig]
              const StatusIcon = statusInfo.icon
              const isSelected = selectedWorkId === work.id

              return (
                <Card
                  key={work.id}
                  className={cn(
                    "cursor-pointer transition-all duration-200 border rounded-lg overflow-hidden group",
                    "hover:shadow-md",
                    isSelected 
                      ? "border-primary/60 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent shadow-md ring-1 ring-primary/30" 
                      : "border-border/50 bg-card/60 hover:border-primary/30 hover:bg-card shadow-sm"
                  )}
                  onClick={() => onSelectWork(work.id)}
                >
                  <CardContent className="p-2.5">
                    <div className="space-y-2">
                      {/* Header - Enhanced */}
                      <div className="flex items-start justify-between gap-2">
                        <h4 className={cn(
                          "font-semibold text-xs line-clamp-2 flex-1 leading-tight transition-colors",
                          isSelected ? "text-primary" : "text-foreground group-hover:text-primary/80"
                        )}>
                          {work.title}
                        </h4>
                        <Badge 
                          variant="outline"
                          className={cn(
                            "shrink-0 text-[10px] px-1.5 py-0.5 font-medium border transition-colors",
                            priorityColors[work.priority]
                          )}
                        >
                          {priorityLabels[work.priority]}
                        </Badge>
                      </div>

                      {/* Company - Enhanced */}
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Building2 className="h-3 w-3 shrink-0 text-primary/60" />
                        <span className="line-clamp-1 truncate">{work.company}</span>
                      </div>

                      {/* Status & Progress - Compact */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            <div className={cn(
                              "h-3.5 w-3.5 rounded-full flex items-center justify-center shrink-0 transition-all",
                              statusInfo.bgColor,
                              isSelected && "ring-2 ring-primary/30"
                            )}>
                              <StatusIcon className={cn("h-2 w-2", statusInfo.color)} />
                            </div>
                            <span className="text-[10px] font-medium text-muted-foreground">
                              {statusInfo.label}
                            </span>
                          </div>
                          <span className={cn(
                            "text-[10px] font-bold px-1.5 py-0.5 rounded-md",
                            status === 'COMPLETED' ? "bg-green-500/10 text-green-600 dark:text-green-400" :
                            status === 'PROCESSING' ? "bg-blue-500/10 text-blue-600 dark:text-blue-400" :
                            status === 'PROBLEM' ? "bg-red-500/10 text-red-600 dark:text-red-400" :
                            "bg-muted text-muted-foreground"
                          )}>
                            {progress}%
                          </span>
                        </div>
                        
                        {/* Progress Bar - Compact */}
                        {work.checkpoints && work.checkpoints.length > 0 && (
                          <div className="h-1 bg-muted/50 rounded-full overflow-hidden">
                            <div 
                              className={cn(
                                "h-full transition-all duration-500 rounded-full",
                                status === 'COMPLETED' ? "bg-gradient-to-r from-green-500 to-green-400" : 
                                status === 'PROCESSING' ? "bg-gradient-to-r from-blue-500 to-blue-400" :
                                status === 'PROBLEM' ? "bg-gradient-to-r from-red-500 to-red-400" : 
                                "bg-gradient-to-r from-muted-foreground/50 to-muted-foreground/30"
                              )}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        )}
                      </div>

                      {/* Footer - Compact */}
                      <div className="space-y-1 pt-1.5 border-t border-border/50">
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            {work.checkpoints?.length || 0} จุด
                          </span>
                          <span className="font-medium">
                            {format(new Date(work.createdAt), 'dd MMM', { locale: th })}
                          </span>
                        </div>
                        {work.deadline && (() => {
                          const deadlineInfo = getDeadlineInfo(work.deadline)
                          if (!deadlineInfo) return null
                          return (
                            <div className={cn(
                              "flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-medium",
                              deadlineInfo.bgColor,
                              deadlineInfo.color,
                              deadlineInfo.borderColor,
                              deadlineInfo.isUrgent && "animate-pulse"
                            )}>
                              {deadlineInfo.isOverdue ? (
                                <AlertCircle className={cn("h-2.5 w-2.5", deadlineInfo.iconColor)} />
                              ) : (
                                <Clock className={cn("h-2.5 w-2.5", deadlineInfo.iconColor)} />
                              )}
                              <span className="line-clamp-1">{deadlineInfo.remaining}</span>
                            </div>
                          )
                        })()}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
