'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DatePickerComponent } from '@/components/ui/date-picker'
import { Plus } from 'lucide-react'
import Swal from 'sweetalert2'
import { getSwalConfig } from '@/lib/swal-config'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Template } from '@/types'
import { useRouter } from 'next/navigation'

const workOrderSchema = z.object({
  company: z.string().min(1, 'กรุณากรอกชื่อบริษัท'),
  title: z.string().min(1, 'กรุณากรอกชื่องาน'),
  description: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  deadline: z.string().optional(),
  templateId: z.string().min(1, 'กรุณาเลือก template'),
})

export function CreateWorkDialog() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<z.infer<typeof workOrderSchema>>({
    resolver: zodResolver(workOrderSchema),
    defaultValues: {
      priority: 'MEDIUM',
      company: '',
      title: '',
      description: '',
      deadline: '',
      templateId: '',
    },
  })

  useEffect(() => {
    fetchTemplates()
  }, [])

  const fetchTemplates = async () => {
    const res = await fetch('/api/template')
    const data = await res.json()
    if (data.templates) {
      setTemplates(data.templates)
    }
  }

  const onSubmit = async (data: any) => {
    try {
      const res = await fetch('/api/work/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (res.ok) {
        const result = await res.json()
        await Swal.fire(getSwalConfig({
          icon: 'success',
          title: 'สร้างงานสำเร็จ',
          timer: 1500,
          showConfirmButton: false,
        }))
        setIsOpen(false)
        reset()
        router.push(`/work/${result.workOrder.id}`)
        router.refresh()
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
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          สร้างงานใหม่
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>สร้างงานใหม่</DialogTitle>
          <DialogDescription>
            กรอกข้อมูลเพื่อสร้างงานใหม่ในระบบ
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="templateId">Template *</Label>
            <Select onValueChange={(value) => setValue('templateId', value)}>
              <SelectTrigger>
                <SelectValue placeholder="เลือก template" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.templateId && (
              <p className="text-sm text-destructive mt-1">{errors.templateId.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="company">บริษัท *</Label>
            <Input
              id="company"
              {...register('company')}
              placeholder="กรอกชื่อบริษัท"
            />
            {errors.company && (
              <p className="text-sm text-destructive mt-1">{errors.company.message}</p>
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
              <p className="text-sm text-destructive mt-1">{errors.title.message}</p>
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

          <Button type="submit" className="w-full">สร้างงาน</Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

