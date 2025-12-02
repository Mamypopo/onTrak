'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DatePickerComponent } from '@/components/ui/date-picker'
import { Edit } from 'lucide-react'
import Swal from 'sweetalert2'
import { getSwalConfig } from '@/lib/swal-config'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { WorkOrder } from '@/types'

const updateWorkOrderSchema = z.object({
  company: z.string().min(1, 'กรุณากรอกชื่อบริษัท'),
  title: z.string().min(1, 'กรุณากรอกชื่องาน'),
  description: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  deadline: z.string().optional(),
})

interface EditWorkDialogProps {
  workOrder: WorkOrder
  onUpdate: () => void
}

export function EditWorkDialog({ workOrder, onUpdate }: EditWorkDialogProps) {
  const [isOpen, setIsOpen] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<z.infer<typeof updateWorkOrderSchema>>({
    resolver: zodResolver(updateWorkOrderSchema),
    defaultValues: {
      company: workOrder.company,
      title: workOrder.title,
      description: workOrder.description || '',
      priority: workOrder.priority,
      deadline: workOrder.deadline || '',
    },
  })

  useEffect(() => {
    if (isOpen && workOrder) {
      reset({
        company: workOrder.company,
        title: workOrder.title,
        description: workOrder.description || '',
        priority: workOrder.priority,
        deadline: workOrder.deadline || '',
      })
    }
  }, [isOpen, workOrder, reset])

  const onSubmit = async (data: z.infer<typeof updateWorkOrderSchema>) => {
    try {
      const res = await fetch(`/api/work/${workOrder.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (res.ok) {
        await Swal.fire(getSwalConfig({
          icon: 'success',
          title: 'แก้ไขงานสำเร็จ',
          timer: 1500,
          showConfirmButton: false,
        }))
        setIsOpen(false)
        onUpdate()
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

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Edit className="h-4 w-4 mr-2" />
          แก้ไขงาน
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>แก้ไขงาน</DialogTitle>
          <DialogDescription>
            แก้ไขข้อมูลงาน (ไม่สามารถแก้ไข template และ checkpoints ได้)
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="company">บริษัท *</Label>
            <Input
              id="company"
              {...register('company')}
              placeholder="กรอกชื่อบริษัท"
            />
            {errors.company && (
              <p className="text-sm text-destructive mt-1">{String(errors.company?.message || '')}</p>
            )}
          </div>

          <div>
            <Label htmlFor="title">ชื่องาน *</Label>
            <Input
              id="title"
              {...register('title')}
              placeholder="กรอกชื่องาน"
            />
            {errors.title && (
              <p className="text-sm text-destructive mt-1">{String(errors.title?.message || '')}</p>
            )}
          </div>

          <div>
            <Label htmlFor="description">รายละเอียด</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="กรอกรายละเอียด"
              rows={4}
            />
          </div>

          <div>
            <Label htmlFor="priority">ความสำคัญ</Label>
            <Select
              value={watch('priority')}
              onValueChange={(value) => setValue('priority', value as any)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="LOW">ต่ำ</SelectItem>
                <SelectItem value="MEDIUM">ปานกลาง</SelectItem>
                <SelectItem value="HIGH">สูง</SelectItem>
                <SelectItem value="URGENT">ด่วน</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="deadline">กำหนดส่ง</Label>
            <DatePickerComponent
              value={watch('deadline')}
              onChange={(value) => setValue('deadline', value)}
              placeholder="เลือกวันที่และเวลา"
              showTime={true}
            />
          </div>

          <div className="pt-2">
            <p className="text-xs text-muted-foreground">
              * ไม่สามารถแก้ไข template และ checkpoints ได้
            </p>
          </div>

          <Button type="submit" className="w-full">บันทึกการแก้ไข</Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

