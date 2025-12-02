'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, Trash2, Edit, Building2, Users } from 'lucide-react'
import Swal from 'sweetalert2'
import { getSwalConfig } from '@/lib/swal-config'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Department } from '@/types'
import { cn } from '@/lib/utils'

const departmentSchema = z.object({
  name: z.string().min(1, 'กรุณากรอกชื่อแผนก'),
})

export function DepartmentsClient() {
  const [departments, setDepartments] = useState<Department[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(departmentSchema),
  })

  useEffect(() => {
    fetchDepartments()
  }, [])

  useEffect(() => {
    if (editingDepartment) {
      reset({
        name: editingDepartment.name,
      })
    } else {
      reset({
        name: '',
      })
    }
  }, [editingDepartment, reset])

  const fetchDepartments = async () => {
    try {
      setIsLoading(true)
      const res = await fetch('/api/department')
      const data = await res.json()
      if (data.departments) {
        setDepartments(data.departments)
      }
    } catch (error) {
      console.error('Error fetching departments:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const onSubmit = async (data: { name: string }) => {
    try {
      const url = editingDepartment
        ? `/api/department/${editingDepartment.id}`
        : '/api/department'
      const method = editingDepartment ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (res.ok) {
        await Swal.fire(getSwalConfig({
          icon: 'success',
          title: editingDepartment ? 'อัปเดตแผนกสำเร็จ' : 'สร้างแผนกสำเร็จ',
          timer: 1500,
          showConfirmButton: false,
        }))
        setIsDialogOpen(false)
        setEditingDepartment(null)
        reset()
        fetchDepartments()
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
      text: 'คุณต้องการลบแผนกนี้หรือไม่?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'ลบ',
      cancelButtonText: 'ยกเลิก',
    }))

    if (!result.isConfirmed) return

    try {
      const res = await fetch(`/api/department/${id}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        await Swal.fire(getSwalConfig({
          icon: 'success',
          title: 'ลบแผนกสำเร็จ',
          timer: 1500,
          showConfirmButton: false,
        }))
        fetchDepartments()
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

  return (
    <div className="flex-1 container mx-auto p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">จัดการแผนก</h1>
            <p className="text-muted-foreground mt-1">
              จัดการข้อมูลแผนกในระบบ
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                onClick={() => setEditingDepartment(null)}
                className="shadow-md hover:shadow-lg transition-shadow"
              >
                <Plus className="h-4 w-4 mr-2" />
                สร้างแผนก
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingDepartment ? 'แก้ไขแผนก' : 'สร้างแผนก'}
                </DialogTitle>
                <DialogDescription>
                  {editingDepartment 
                    ? 'แก้ไขข้อมูลแผนกในระบบ' 
                    : 'เพิ่มแผนกใหม่เข้าสู่ระบบ'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-4">
                <div>
                  <Label htmlFor="name">ชื่อแผนก</Label>
                  <Input
                    id="name"
                    {...register('name')}
                    placeholder="กรอกชื่อแผนก"
                    className="mt-1.5"
                  />
                  {errors.name && (
                    <p className="text-sm text-destructive mt-1.5">{String(errors.name?.message || '')}</p>
                  )}
                </div>
                <Button type="submit" className="w-full">
                  {editingDepartment ? 'อัปเดต' : 'สร้าง'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Departments Grid */}
        <Card className="shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                รายการแผนก
              </CardTitle>
              <Badge variant="secondary" className="text-sm">
                {departments.length} แผนก
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="p-5 border rounded-lg space-y-3"
                  >
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                ))}
              </div>
            ) : departments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="rounded-full bg-muted p-4 mb-4">
                  <Building2 className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-1">ยังไม่มีแผนก</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  เริ่มต้นโดยการสร้างแผนกแรกของคุณ
                </p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditingDepartment(null)
                    setIsDialogOpen(true)
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  สร้างแผนกแรก
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {departments.map((department) => (
                  <div
                    key={department.id}
                    className={cn(
                      "group relative p-5 border rounded-lg",
                      "bg-card hover:bg-accent/50 transition-all duration-200",
                      "hover:shadow-md hover:border-primary/20",
                      "cursor-pointer"
                    )}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-primary/10 p-2.5 group-hover:bg-primary/20 transition-colors">
                          <Building2 className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-base group-hover:text-primary transition-colors">
                            {department.name}
                          </h3>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            แผนก
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 mt-4 pt-4 border-t">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex-1 h-8 text-xs"
                        onClick={(e) => {
                          e.stopPropagation()
                          setEditingDepartment(department)
                          setIsDialogOpen(true)
                        }}
                      >
                        <Edit className="h-3.5 w-3.5 mr-1.5" />
                        แก้ไข
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex-1 h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(department.id)
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                        ลบ
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

