'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { CreateWorkDialog } from '@/components/work/create-work-dialog'
import { WorkOrder, Checkpoint } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  Play, 
  CheckCircle, 
  RotateCcw, 
  AlertCircle, 
  Search, 
  Clock, 
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowLeftRight,
  Building2,
  Calendar,
  User,
  TrendingUp
} from 'lucide-react'
import Swal from 'sweetalert2'
import { useSocket } from '@/lib/socket-client'
import { format } from 'date-fns'
import { th } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { getDeadlineInfo, formatDeadline } from '@/lib/deadline-utils'
import Link from 'next/link'

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

const statusConfig = {
  PENDING: { 
    icon: Clock, 
    color: 'bg-gray-500/20 text-gray-600 dark:text-gray-400 border-gray-500/30 hover:bg-gray-500/30 hover:border-gray-500/50',
    label: 'รอดำเนินการ' 
  },
  PROCESSING: { 
    icon: TrendingUp, 
    color: 'bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30 hover:bg-blue-500/30 hover:border-blue-500/50',
    label: 'กำลังดำเนินการ' 
  },
  COMPLETED: { 
    icon: CheckCircle2, 
    color: 'bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30 hover:bg-green-500/30 hover:border-green-500/50',
    label: 'เสร็จสิ้น' 
  },
  RETURNED: { 
    icon: RotateCcw, 
    color: 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/30 hover:border-yellow-500/50',
    label: 'ส่งกลับ' 
  },
  PROBLEM: { 
    icon: AlertTriangle, 
    color: 'bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30 hover:bg-red-500/30 hover:border-red-500/50',
    label: 'มีปัญหา' 
  },
}

export function DashboardClient() {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([])
  const [filteredOrders, setFilteredOrders] = useState<WorkOrder[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [departments, setDepartments] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const socket = useSocket()

  const fetchWorkOrders = useCallback(async () => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams()
      if (departmentFilter !== 'all') params.append('departmentId', departmentFilter)
      if (statusFilter !== 'all') params.append('status', statusFilter)
      if (priorityFilter !== 'all') params.append('priority', priorityFilter)

      const res = await fetch(`/api/work?${params}`)
      const data = await res.json()
      if (data.workOrders) {
        setWorkOrders(data.workOrders)
      }
    } catch (error) {
      console.error('Error fetching work orders:', error)
    } finally {
      setIsLoading(false)
    }
  }, [departmentFilter, statusFilter, priorityFilter])

  const fetchDepartments = useCallback(async () => {
    try {
      const res = await fetch('/api/department')
      const data = await res.json()
      if (data.departments) {
        setDepartments(data.departments)
      }
    } catch (error) {
      console.error('Error fetching departments:', error)
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

  // Memoized helper functions to avoid recreating on every render
  const getWorkProgress = useCallback((work: WorkOrder) => {
    if (!work.checkpoints || work.checkpoints.length === 0) return 0
    const completed = work.checkpoints.filter(cp => cp.status === 'COMPLETED').length
    return Math.round((completed / work.checkpoints.length) * 100)
  }, [])

  const getWorkStatus = useCallback((work: WorkOrder) => {
    if (!work.checkpoints || work.checkpoints.length === 0) return 'PENDING'
    const allCompleted = work.checkpoints.every(cp => cp.status === 'COMPLETED')
    const hasProcessing = work.checkpoints.some(cp => cp.status === 'PROCESSING')
    const hasProblem = work.checkpoints.some(cp => cp.status === 'PROBLEM')
    
    if (allCompleted) return 'COMPLETED'
    if (hasProblem) return 'PROBLEM'
    if (hasProcessing) return 'PROCESSING'
    return 'PENDING'
  }, [])

  // Memoized stats calculations
  const stats = useMemo(() => {
    if (isLoading || workOrders.length === 0) {
      return {
        total: 0,
        processing: 0,
        completed: 0,
        problem: 0,
      }
    }
    return {
      total: workOrders.length,
      processing: workOrders.filter(w => getWorkStatus(w) === 'PROCESSING').length,
      completed: workOrders.filter(w => getWorkStatus(w) === 'COMPLETED').length,
      problem: workOrders.filter(w => getWorkStatus(w) === 'PROBLEM').length,
    }
  }, [workOrders, isLoading, getWorkStatus])

  return (
    <div className="flex-1 container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground mt-1">จัดการและติดตามงานทั้งหมด</p>
          </div>
          <CreateWorkDialog />
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {isLoading ? (
            <>
              {[1, 2, 3, 4].map((i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-8 w-12" />
                      </div>
                      <Skeleton className="h-12 w-12 rounded-full" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </>
          ) : (
            <>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">งานทั้งหมด</p>
                      <p className="text-2xl font-bold mt-1">{stats.total}</p>
                    </div>
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Building2 className="h-6 w-6 text-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">กำลังดำเนินการ</p>
                      <p className="text-2xl font-bold mt-1">{stats.processing}</p>
                    </div>
                    <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                      <TrendingUp className="h-6 w-6 text-blue-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">เสร็จสิ้น</p>
                      <p className="text-2xl font-bold mt-1">{stats.completed}</p>
                    </div>
                    <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
                      <CheckCircle2 className="h-6 w-6 text-green-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">มีปัญหา</p>
                      <p className="text-2xl font-bold mt-1">{stats.problem}</p>
                    </div>
                    <div className="h-12 w-12 rounded-full bg-red-500/10 flex items-center justify-center">
                      <AlertTriangle className="h-6 w-6 text-red-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="ค้นหางาน..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger className="w-full md:w-[180px]">
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
                <SelectTrigger className="w-full md:w-[180px]">
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
                <SelectTrigger className="w-full md:w-[180px]">
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
          </CardContent>
        </Card>

        {/* Work Orders Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-5 w-20 rounded-full" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-3 w-20" />
                      <Skeleton className="h-3 w-12" />
                    </div>
                    <Skeleton className="h-2 w-full rounded-full" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-3 w-16" />
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4].map((j) => (
                        <Skeleton key={j} className="h-6 w-6 rounded-full" />
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredOrders.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium">ไม่พบงาน</p>
              <p className="text-sm text-muted-foreground mt-2">
                {searchTerm || departmentFilter !== 'all' || statusFilter !== 'all' || priorityFilter !== 'all'
                  ? 'ลองเปลี่ยนตัวกรอง'
                  : 'สร้างงานใหม่เพื่อเริ่มต้น'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredOrders.map((work) => {
              const progress = getWorkProgress(work)
              const status = getWorkStatus(work)
              const statusInfo = statusConfig[status as keyof typeof statusConfig]
              const StatusIcon = statusInfo.icon

              return (
                <Link key={work.id} href={`/work/${work.id}`}>
                  <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer h-full flex flex-col group hover:border-primary/50">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-lg line-clamp-2 group-hover:text-primary transition-colors">
                          {work.title}
                        </CardTitle>
                        <Badge 
                          variant="outline"
                          className={cn(
                            "shrink-0 transition-colors",
                            priorityColors[work.priority]
                          )}
                        >
                          {priorityLabels[work.priority]}
                        </Badge>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="flex-1 flex flex-col space-y-4">
                      {/* Company & Status */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Building2 className="h-4 w-4" />
                          <span className="line-clamp-1">{work.company}</span>
                        </div>
                        <Badge 
                          variant="outline"
                          className={cn(
                            "shrink-0 transition-colors",
                            statusInfo.color
                          )}
                        >
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {statusInfo.label}
                        </Badge>
                      </div>

                      {/* Progress */}
                      {work.checkpoints && work.checkpoints.length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">ความคืบหน้า</span>
                            <span className="font-medium">{progress}%</span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-primary transition-all duration-300"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {work.checkpoints.filter(cp => cp.status === 'COMPLETED').length} / {work.checkpoints.length} checkpoints
                          </p>
                        </div>
                      )}

                      {/* Timeline Preview - Horizontal */}
                      {work.checkpoints && work.checkpoints.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs font-medium text-muted-foreground">Timeline</p>
                          <div className="flex items-center gap-1 overflow-x-auto pb-2">
                            {work.checkpoints.map((cp, idx) => {
                              const cpStatus = statusConfig[cp.status as keyof typeof statusConfig]
                              const CpIcon = cpStatus.icon
                              return (
                                <div
                                  key={cp.id}
                                  className={cn(
                                    "flex items-center gap-1 shrink-0",
                                    idx < work.checkpoints!.length - 1 && "pr-2"
                                  )}
                                >
                                  <div className={cn(
                                    "h-6 w-6 rounded-full flex items-center justify-center border-2",
                                    cp.status === 'COMPLETED' && "bg-green-500/20 border-green-500 text-green-600 dark:text-green-400",
                                    cp.status === 'PROCESSING' && "bg-blue-500/20 border-blue-500 text-blue-600 dark:text-blue-400",
                                    cp.status === 'PROBLEM' && "bg-red-500/20 border-red-500 text-red-600 dark:text-red-400",
                                    cp.status === 'RETURNED' && "bg-yellow-500/20 border-yellow-500 text-yellow-600 dark:text-yellow-400",
                                    cp.status === 'PENDING' && "bg-gray-500/20 border-gray-500 text-gray-600 dark:text-gray-400"
                                  )}>
                                    <CpIcon className="h-3 w-3" />
                                  </div>
                                  {idx < work.checkpoints!.length - 1 && (
                                    <div className={cn(
                                      "h-0.5 w-8",
                                      cp.status === 'COMPLETED' ? "bg-green-500" : "bg-muted"
                                    )} />
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      {/* Footer */}
                      <div className="space-y-2 pt-2 border-t">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            <span>{work.createdBy?.name || 'ไม่ทราบ'}</span>
                          </div>
                          {work.deadline && (
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span>{format(new Date(work.deadline), 'dd MMM', { locale: th })}</span>
                            </div>
                          )}
                        </div>
                        {work.deadline && (() => {
                          const deadlineInfo = getDeadlineInfo(work.deadline)
                          if (!deadlineInfo) return null
                          return (
                            <div className={cn(
                              "flex items-center gap-1.5 px-2 py-1 rounded-md border text-xs font-medium",
                              deadlineInfo.bgColor,
                              deadlineInfo.color,
                              deadlineInfo.borderColor,
                              deadlineInfo.isUrgent && "animate-pulse"
                            )}>
                              {deadlineInfo.isOverdue ? (
                                <AlertCircle className={cn("h-3 w-3", deadlineInfo.iconColor)} />
                              ) : (
                                <Clock className={cn("h-3 w-3", deadlineInfo.iconColor)} />
                              )}
                              <span>{deadlineInfo.remaining}</span>
                            </div>
                          )
                        })()}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        )}
    </div>
  )
}
