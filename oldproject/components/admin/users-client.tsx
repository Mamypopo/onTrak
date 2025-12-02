'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, Trash2, Edit, Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import Swal from 'sweetalert2'
import { getSwalConfig } from '@/lib/swal-config'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { User, Department } from '@/types'
import { format } from 'date-fns'
import { th } from 'date-fns/locale'
import { cn } from '@/lib/utils'

const userSchema = z.object({
  username: z.string().min(1, 'กรุณากรอกชื่อผู้ใช้'),
  password: z.string().min(6, 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร').optional(),
  name: z.string().min(1, 'กรุณากรอกชื่อ'),
  role: z.enum(['ADMIN', 'STAFF', 'MANAGER']),
  departmentId: z.string().nullable().optional(),
})

interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
}

export function UsersClient() {
  const [users, setUsers] = useState<User[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  })
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [departmentFilter, setDepartmentFilter] = useState<string>('all')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(userSchema),
    defaultValues: {
      username: '',
      password: '',
      name: '',
      role: 'STAFF',
      departmentId: '',
    },
  })

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  // Reset to page 1 when filters change
  useEffect(() => {
    setPagination(prev => ({ ...prev, page: 1 }))
  }, [debouncedSearch, roleFilter, departmentFilter])

  useEffect(() => {
    if (editingUser) {
      reset({
        username: editingUser.username,
        name: editingUser.name,
        role: editingUser.role || 'STAFF',
        departmentId: editingUser.departmentId || '',
      })
    } else {
      reset({
        username: '',
        password: '',
        name: '',
        role: 'STAFF',
        departmentId: '',
      })
    }
  }, [editingUser, reset])

  const fetchUsers = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(roleFilter && roleFilter !== 'all' && { role: roleFilter }),
        ...(departmentFilter && departmentFilter !== 'all' && { departmentId: departmentFilter }),
      })

      const res = await fetch(`/api/admin/user?${params}`)
      const data = await res.json()
      
      if (data.users) {
        setUsers(data.users)
        if (data.pagination) {
          // Only update pagination if values actually changed to prevent infinite loop
          setPagination(prev => {
            if (
              prev.page === data.pagination.page &&
              prev.limit === data.pagination.limit &&
              prev.total === data.pagination.total &&
              prev.totalPages === data.pagination.totalPages
            ) {
              return prev
            }
            return {
              page: data.pagination.page,
              limit: data.pagination.limit,
              total: data.pagination.total,
              totalPages: data.pagination.totalPages,
            }
          })
        }
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setIsLoading(false)
    }
  }, [pagination.page, pagination.limit, debouncedSearch, roleFilter, departmentFilter])

  const fetchDepartments = useCallback(async () => {
    const res = await fetch('/api/department')
    const data = await res.json()
    if (data.departments) {
      setDepartments(data.departments)
    }
  }, [])

  // Initial fetch on mount
  useEffect(() => {
    fetchUsers()
    fetchDepartments()
  }, [fetchUsers, fetchDepartments])

  // Refetch when filters change
  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const onSubmit = async (data: any) => {
    try {
      const url = editingUser
        ? `/api/admin/user/${editingUser.id}`
        : '/api/admin/user'
      const method = editingUser ? 'PUT' : 'POST'

      if (editingUser && !data.password) {
        delete data.password
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (res.ok) {
        await Swal.fire(getSwalConfig({
          icon: 'success',
          title: editingUser ? 'อัปเดตผู้ใช้สำเร็จ' : 'สร้างผู้ใช้สำเร็จ',
          timer: 1500,
          showConfirmButton: false,
        }))
        setIsDialogOpen(false)
        setEditingUser(null)
        reset()
        fetchUsers()
      } else {
        const error = await res.json()
        await Swal.fire(getSwalConfig({
          icon: 'error',
          title: 'เกิดข้อผิดพลาด',
          text: error.error || 'กรุณาลองใหม่อีกครั้ง',
        }))
      }
    } catch (error) {
      await Swal.fire(getSwalConfig({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: 'กรุณาลองใหม่อีกครั้ง',
      }))
    }
  }

  const handleDelete = async (id: string) => {
    const result = await Swal.fire(getSwalConfig({
      title: 'ยืนยันการลบ',
      text: 'คุณต้องการลบผู้ใช้นี้หรือไม่?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'ลบ',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: 'hsl(var(--destructive))',
    }))

    if (!result.isConfirmed) return

    try {
      const res = await fetch(`/api/admin/user/${id}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        await Swal.fire(getSwalConfig({
          icon: 'success',
          title: 'ลบผู้ใช้สำเร็จ',
          timer: 1500,
          showConfirmButton: false,
        }))
        fetchUsers()
      } else {
        await Swal.fire(getSwalConfig({
          icon: 'error',
          title: 'เกิดข้อผิดพลาด',
          text: 'กรุณาลองใหม่อีกครั้ง',
        }))
      }
    } catch (error) {
      await Swal.fire(getSwalConfig({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: 'กรุณาลองใหม่อีกครั้ง',
      }))
    }
  }

  const roleLabels = {
    ADMIN: 'ผู้ดูแลระบบ',
    STAFF: 'พนักงาน',
    MANAGER: 'ผู้จัดการ',
  }

  const roleColors = {
    ADMIN: 'bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30',
    STAFF: 'bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30',
    MANAGER: 'bg-purple-500/20 text-purple-600 dark:text-purple-400 border-purple-500/30',
  }

  return (
    <div className="flex-1 container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
            จัดการผู้ใช้
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            จัดการข้อมูลผู้ใช้ทั้งหมดในระบบ
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingUser(null)} className="gap-2">
              <Plus className="h-4 w-4" />
              สร้างผู้ใช้
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingUser ? 'แก้ไขผู้ใช้' : 'สร้างผู้ใช้'}</DialogTitle>
              <DialogDescription>
                {editingUser ? 'แก้ไขข้อมูลผู้ใช้ในระบบ' : 'เพิ่มผู้ใช้ใหม่เข้าสู่ระบบ'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-4">
              <div>
                <Label htmlFor="username">ชื่อผู้ใช้</Label>
                <Input
                  id="username"
                  {...register('username')}
                  placeholder="กรอกชื่อผู้ใช้"
                  disabled={!!editingUser}
                />
                {errors.username && (
                  <p className="text-sm text-destructive mt-1">{String(errors.username?.message || '')}</p>
                )}
              </div>

              <div>
                <Label htmlFor="password">
                  รหัสผ่าน {editingUser && '(เว้นว่างไว้ถ้าไม่ต้องการเปลี่ยน)'}
                </Label>
                <Input
                  id="password"
                  type="password"
                  {...register('password')}
                  placeholder="กรอกรหัสผ่าน"
                />
                {errors.password && (
                  <p className="text-sm text-destructive mt-1">{String(errors.password?.message || '')}</p>
                )}
              </div>

              <div>
                <Label htmlFor="name">ชื่อ</Label>
                <Input
                  id="name"
                  {...register('name')}
                  placeholder="กรอกชื่อ"
                />
                {errors.name && (
                  <p className="text-sm text-destructive mt-1">{String(errors.name?.message || '')}</p>
                )}
              </div>

              <div>
                <Label htmlFor="role">บทบาท</Label>
                <Controller
                  name="role"
                  control={control}
                  defaultValue="STAFF"
                  render={({ field }) => (
                    <Select 
                      value={field.value || 'STAFF'} 
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="เลือกบทบาท" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="STAFF">พนักงาน</SelectItem>
                        <SelectItem value="MANAGER">ผู้จัดการ</SelectItem>
                        <SelectItem value="ADMIN">ผู้ดูแลระบบ</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.role && (
                  <p className="text-sm text-destructive mt-1">{String(errors.role?.message || '')}</p>
                )}
              </div>

              <div>
                <Label htmlFor="departmentId">แผนก</Label>
                <Controller
                  name="departmentId"
                  control={control}
                  defaultValue=""
                  render={({ field }) => (
                    <Select 
                      value={field.value || ''} 
                      onValueChange={(val) => field.onChange(val === 'none' ? '' : val)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="เลือกแผนก (ไม่บังคับ)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">ไม่ระบุ</SelectItem>
                        {departments.map((dept) => (
                          <SelectItem key={dept.id} value={dept.id}>
                            {dept.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <Button type="submit" className="w-full">
                {editingUser ? 'อัปเดต' : 'สร้าง'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="ค้นหาชื่อผู้ใช้หรือชื่อ..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select 
              value={roleFilter} 
              onValueChange={setRoleFilter}
            >
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="บทบาททั้งหมด" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">บทบาททั้งหมด</SelectItem>
                <SelectItem value="ADMIN">ผู้ดูแลระบบ</SelectItem>
                <SelectItem value="MANAGER">ผู้จัดการ</SelectItem>
                <SelectItem value="STAFF">พนักงาน</SelectItem>
              </SelectContent>
            </Select>
            <Select 
              value={departmentFilter} 
              onValueChange={setDepartmentFilter}
            >
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="แผนกทั้งหมด" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">แผนกทั้งหมด</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>รายการผู้ใช้</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ชื่อ</TableHead>
                    <TableHead>ชื่อผู้ใช้</TableHead>
                    <TableHead>บทบาท</TableHead>
                    <TableHead>แผนก</TableHead>
                    <TableHead>วันที่สร้าง</TableHead>
                    <TableHead className="text-right">จัดการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...Array(pagination.limit)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-16 rounded-full" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Skeleton className="h-8 w-8 rounded" />
                          <Skeleton className="h-8 w-8 rounded" />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground">ไม่พบข้อมูลผู้ใช้</p>
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ชื่อ</TableHead>
                      <TableHead>ชื่อผู้ใช้</TableHead>
                      <TableHead>บทบาท</TableHead>
                      <TableHead>แผนก</TableHead>
                      <TableHead>วันที่สร้าง</TableHead>
                      <TableHead className="text-right">จัดการ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell className="text-muted-foreground">{user.username}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn("border", roleColors[user.role])}>
                            {roleLabels[user.role]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {user.department ? (
                            <span className="text-sm">{user.department.name}</span>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(user.createdAt || new Date()), 'dd MMM yyyy', { locale: th })}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setEditingUser(user)
                                setIsDialogOpen(true)
                              }}
                              className="h-8 w-8"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(user.id)}
                              className="h-8 w-8 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    แสดง {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} จาก {pagination.total} รายการ
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPagination(prev => ({ ...prev, page: 1 }))}
                      disabled={pagination.page === 1}
                    >
                      <ChevronsLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                      disabled={pagination.page === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="text-sm font-medium px-3">
                      หน้า {pagination.page} / {pagination.totalPages}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                      disabled={pagination.page >= pagination.totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPagination(prev => ({ ...prev, page: pagination.totalPages }))}
                      disabled={pagination.page >= pagination.totalPages}
                    >
                      <ChevronsRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
