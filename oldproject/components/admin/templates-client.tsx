'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2, Edit, GripVertical, FileText, ListChecks, Building2, Save, X } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { DialogDescription } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import Swal from 'sweetalert2'
import { getSwalConfig } from '@/lib/swal-config'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Template, TemplateCheckpoint, Department } from '@/types'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

const templateSchema = z.object({
  name: z.string().min(1, 'กรุณากรอกชื่อเทมเพลต'),
})

const checkpointSchema = z.object({
  name: z.string().min(1, 'กรุณากรอกชื่อ checkpoint'),
  ownerDeptId: z.string().min(1, 'กรุณาเลือกแผนก'),
})

// Sortable Checkpoint Item Component
function SortableCheckpointItem({
  checkpoint,
  onDelete,
}: {
  checkpoint: TemplateCheckpoint
  onDelete: (id: string) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: checkpoint.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group p-3 border rounded-lg flex items-center justify-between",
        "bg-card hover:bg-accent/50 transition-all duration-200",
        "hover:shadow-sm hover:border-primary/20",
        isDragging && "shadow-lg border-primary"
      )}
    >
      <div className="flex items-center gap-3 flex-1">
        <div className="flex items-center gap-2">
          <div
            {...attributes}
            {...listeners}
            className={cn(
              "rounded-full bg-primary/10 p-1.5 cursor-grab active:cursor-grabbing",
              "hover:bg-primary/20 transition-colors"
            )}
          >
            <GripVertical className="h-3.5 w-3.5 text-primary" />
          </div>
          <Badge variant="outline" className="text-xs font-mono">
            #{checkpoint.order + 1}
          </Badge>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm group-hover:text-primary transition-colors">
            {checkpoint.name}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <Building2 className="h-3 w-3 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">
              {checkpoint.ownerDept.name}
            </p>
          </div>
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
        onClick={() => onDelete(checkpoint.id)}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  )
}

export function TemplatesClient() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [departments, setDepartments] = useState<Department[]>([])
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false)
  const [isCheckpointDialogOpen, setIsCheckpointDialogOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null)
  const [editingCheckpoint, setEditingCheckpoint] = useState<TemplateCheckpoint | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [checkpoints, setCheckpoints] = useState<TemplateCheckpoint[]>([])
  const [originalCheckpoints, setOriginalCheckpoints] = useState<TemplateCheckpoint[]>([])
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const {
    register: registerTemplate,
    handleSubmit: handleSubmitTemplate,
    reset: resetTemplate,
    formState: { errors: templateErrors },
  } = useForm({
    resolver: zodResolver(templateSchema),
  })

  const {
    register: registerCheckpoint,
    handleSubmit: handleSubmitCheckpoint,
    reset: resetCheckpoint,
    control: controlCheckpoint,
    formState: { errors: checkpointErrors },
  } = useForm({
    resolver: zodResolver(checkpointSchema),
  })

  useEffect(() => {
    fetchTemplates()
    fetchDepartments()
  }, [])

  // Update checkpoints when selectedTemplate changes
  useEffect(() => {
    if (selectedTemplate?.checkpoints) {
      const sorted = [...selectedTemplate.checkpoints].sort((a, b) => (a.order || 0) - (b.order || 0))
      setCheckpoints(sorted)
      setOriginalCheckpoints(sorted) // Store original for cancel
      setHasUnsavedChanges(false) // Reset unsaved changes
    } else {
      setCheckpoints([])
      setOriginalCheckpoints([])
      setHasUnsavedChanges(false)
    }
  }, [selectedTemplate])

  const fetchTemplates = async () => {
    try {
      setIsLoading(true)
      const res = await fetch('/api/template')
      const data = await res.json()
      if (data.templates) {
        setTemplates(data.templates)
      }
    } catch (error) {
      console.error('Error fetching templates:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchDepartments = async () => {
    try {
      const res = await fetch('/api/department')
      const data = await res.json()
      if (data.departments) {
        setDepartments(data.departments)
      }
    } catch (error) {
      console.error('Error fetching departments:', error)
    }
  }

  const handleCreateTemplate = async (data: { name: string }) => {
    try {
      const res = await fetch('/api/template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (res.ok) {
        await Swal.fire(getSwalConfig({
          icon: 'success',
          title: 'สร้างเทมเพลตสำเร็จ',
          timer: 1500,
          showConfirmButton: false,
        }))
        setIsTemplateDialogOpen(false)
        resetTemplate()
        fetchTemplates()
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

  const handleDeleteTemplate = async (id: string) => {
    const result = await Swal.fire(getSwalConfig({
      title: 'ยืนยันการลบ',
      text: 'คุณต้องการลบเทมเพลตนี้หรือไม่?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'ลบ',
      cancelButtonText: 'ยกเลิก',
    }))

    if (!result.isConfirmed) return

    try {
      const res = await fetch(`/api/template/${id}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        await Swal.fire(getSwalConfig({
          icon: 'success',
          title: 'ลบเทมเพลตสำเร็จ',
          timer: 1500,
          showConfirmButton: false,
        }))
        fetchTemplates()
        if (selectedTemplate?.id === id) {
          setSelectedTemplate(null)
        }
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

  const handleCreateCheckpoint = async (data: { name: string; ownerDeptId: string }) => {
    if (!selectedTemplate) return

    try {
      const order = (selectedTemplate.checkpoints?.length || 0) + 1

      const res = await fetch('/api/template/checkpoint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          templateId: selectedTemplate.id,
          order,
        }),
      })

      if (res.ok) {
        await Swal.fire(getSwalConfig({
          icon: 'success',
          title: 'สร้าง checkpoint สำเร็จ',
          timer: 1500,
          showConfirmButton: false,
        }))
        setIsCheckpointDialogOpen(false)
        resetCheckpoint()
        await fetchTemplates()
        // Update selectedTemplate after fetch
        const updatedTemplates = await fetch('/api/template').then(res => res.json())
        if (updatedTemplates.templates) {
          const updated = updatedTemplates.templates.find((t: Template) => t.id === selectedTemplate.id)
          if (updated) {
            setSelectedTemplate(updated)
            const sorted = [...(updated.checkpoints || [])].sort((a, b) => (a.order || 0) - (b.order || 0))
            setCheckpoints(sorted)
            setOriginalCheckpoints(sorted)
            setHasUnsavedChanges(false)
          }
        }
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

  const handleDeleteCheckpoint = async (id: string) => {
    const result = await Swal.fire(getSwalConfig({
      title: 'ยืนยันการลบ',
      text: 'คุณต้องการลบ checkpoint นี้หรือไม่?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'ลบ',
      cancelButtonText: 'ยกเลิก',
    }))

    if (!result.isConfirmed) return

    try {
      const res = await fetch(`/api/template/checkpoint/${id}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        await Swal.fire(getSwalConfig({
          icon: 'success',
          title: 'ลบ checkpoint สำเร็จ',
          timer: 1500,
          showConfirmButton: false,
        }))
        await fetchTemplates()
        // Update selectedTemplate after fetch
        const updatedTemplates = await fetch('/api/template').then(res => res.json())
        if (updatedTemplates.templates && selectedTemplate) {
          const updated = updatedTemplates.templates.find((t: Template) => t.id === selectedTemplate.id)
          if (updated) {
            setSelectedTemplate(updated)
            const sorted = [...(updated.checkpoints || [])].sort((a, b) => (a.order || 0) - (b.order || 0))
            setCheckpoints(sorted)
            setOriginalCheckpoints(sorted)
            setHasUnsavedChanges(false)
          }
        }
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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id || !selectedTemplate) {
      return
    }

    const oldIndex = checkpoints.findIndex((cp) => cp.id === active.id)
    const newIndex = checkpoints.findIndex((cp) => cp.id === over.id)

    if (oldIndex === -1 || newIndex === -1) {
      return
    }

    // Update UI only (don't save yet)
    const newCheckpoints = arrayMove(checkpoints, oldIndex, newIndex)
    setCheckpoints(newCheckpoints)
    setHasUnsavedChanges(true) // Mark as having unsaved changes
  }

  const handleSaveOrder = async () => {
    if (!selectedTemplate || !hasUnsavedChanges) return

    try {
      const checkpointIds = checkpoints.map((cp) => cp.id)
      const res = await fetch('/api/template/checkpoint/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checkpointIds }),
      })

      if (!res.ok) {
        await Swal.fire(getSwalConfig({
          icon: 'error',
          title: 'เกิดข้อผิดพลาด',
          text: 'ไม่สามารถบันทึกลำดับได้ กรุณาลองใหม่อีกครั้ง',
        }))
        return
      }

      // Update order field for each checkpoint based on new position
      const updatedCheckpoints = checkpoints.map((cp, index) => ({
        ...cp,
        order: index,
      }))
      
      // Update state with new order
      setCheckpoints(updatedCheckpoints)
      setOriginalCheckpoints(updatedCheckpoints) // Update original
      setHasUnsavedChanges(false) // Clear unsaved changes flag
      
      const updatedTemplate = {
        ...selectedTemplate,
        checkpoints: updatedCheckpoints,
      }
      setSelectedTemplate(updatedTemplate)
      
      // Also update in templates array
      setTemplates((prevTemplates) =>
        prevTemplates.map((t) =>
          t.id === selectedTemplate.id ? updatedTemplate : t
        )
      )

      await Swal.fire(getSwalConfig({
        icon: 'success',
        title: 'บันทึกลำดับสำเร็จ',
        timer: 1500,
        showConfirmButton: false,
      }))
    } catch (error) {
      await Swal.fire(getSwalConfig({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: 'ไม่สามารถบันทึกลำดับได้ กรุณาลองใหม่อีกครั้ง',
      }))
    }
  }

  const handleCancelReorder = () => {
    // Revert to original order
    setCheckpoints(originalCheckpoints)
    setHasUnsavedChanges(false)
  }

  return (
    <div className="flex-1 container mx-auto p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">จัดการ Templates</h1>
            <p className="text-muted-foreground mt-1">
              จัดการเทมเพลตและ checkpoint สำหรับงาน
            </p>
          </div>
          <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                onClick={() => setEditingTemplate(null)}
                className="shadow-md hover:shadow-lg transition-shadow"
              >
                <Plus className="h-4 w-4 mr-2" />
                สร้าง Template
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingTemplate ? 'แก้ไข Template' : 'สร้าง Template'}
                </DialogTitle>
                <DialogDescription>
                  {editingTemplate 
                    ? 'แก้ไขข้อมูล template ในระบบ' 
                    : 'เพิ่ม template ใหม่เข้าสู่ระบบ'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmitTemplate(handleCreateTemplate as any)} className="space-y-4">
                <div>
                  <Label htmlFor="name">ชื่อ Template</Label>
                  <Input
                    id="name"
                    {...registerTemplate('name')}
                    placeholder="กรอกชื่อ template"
                    className="mt-1.5"
                  />
                  {templateErrors.name && (
                    <p className="text-sm text-destructive mt-1.5">{String(templateErrors.name?.message || '')}</p>
                  )}
                </div>
                <Button type="submit" className="w-full">สร้าง</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Templates List */}
          <Card className="shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  รายการ Templates
                </CardTitle>
                <Badge variant="secondary" className="text-sm">
                  {templates.length} เทมเพลต
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="p-4 border rounded-lg space-y-2">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                  ))}
                </div>
              ) : templates.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="rounded-full bg-muted p-4 mb-4">
                    <FileText className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-1">ยังไม่มี Template</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    เริ่มต้นโดยการสร้าง template แรกของคุณ
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditingTemplate(null)
                      setIsTemplateDialogOpen(true)
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    สร้าง Template แรก
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {templates.map((template) => (
                    <div
                      key={template.id}
                      className={cn(
                        "group relative p-4 border rounded-lg cursor-pointer transition-all duration-200",
                        selectedTemplate?.id === template.id
                          ? "bg-accent border-primary shadow-sm"
                          : "bg-card hover:bg-accent/50 hover:shadow-md hover:border-primary/20"
                      )}
                      onClick={() => setSelectedTemplate(template)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          <div className={cn(
                            "rounded-lg p-2.5 transition-colors",
                            selectedTemplate?.id === template.id
                              ? "bg-primary/20"
                              : "bg-primary/10 group-hover:bg-primary/20"
                          )}>
                            <FileText className={cn(
                              "h-5 w-5 transition-colors",
                              selectedTemplate?.id === template.id
                                ? "text-primary"
                                : "text-primary/70"
                            )} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className={cn(
                              "font-semibold text-base mb-1 transition-colors",
                              selectedTemplate?.id === template.id
                                ? "text-primary"
                                : "group-hover:text-primary"
                            )}>
                              {template.name}
                            </h3>
                            <div className="flex items-center gap-2">
                              <ListChecks className="h-3.5 w-3.5 text-muted-foreground" />
                              <p className="text-sm text-muted-foreground">
                                {template.checkpoints?.length || 0} checkpoints
                              </p>
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteTemplate(template.id)
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Checkpoints List */}
          <Card className="shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <ListChecks className="h-5 w-5 text-primary" />
                  {selectedTemplate ? `Checkpoints: ${selectedTemplate.name}` : 'Checkpoints'}
                </CardTitle>
                {selectedTemplate && (
                  <Dialog open={isCheckpointDialogOpen} onOpenChange={setIsCheckpointDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="shadow-sm">
                        <Plus className="h-4 w-4 mr-2" />
                        เพิ่ม
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>สร้าง Checkpoint</DialogTitle>
                        <DialogDescription>
                          เพิ่ม checkpoint ใหม่ให้กับ template นี้
                        </DialogDescription>
                      </DialogHeader>
                      <form
                        onSubmit={handleSubmitCheckpoint(handleCreateCheckpoint as any)}
                        className="space-y-4"
                      >
                        <div>
                          <Label htmlFor="checkpoint-name">ชื่อ Checkpoint</Label>
                          <Input
                            id="checkpoint-name"
                            {...registerCheckpoint('name')}
                            placeholder="กรอกชื่อ checkpoint"
                            className="mt-1.5"
                          />
                          {checkpointErrors.name && (
                            <p className="text-sm text-destructive mt-1.5">
                              {String(checkpointErrors.name?.message || '')}
                            </p>
                          )}
                        </div>
                        <div>
                          <Label htmlFor="ownerDeptId">แผนก</Label>
                          <Controller
                            name="ownerDeptId"
                            control={controlCheckpoint}
                            render={({ field }) => (
                              <Select
                                onValueChange={field.onChange}
                                value={field.value || ''}
                              >
                                <SelectTrigger className="mt-1.5">
                                  <SelectValue placeholder="เลือกแผนก" />
                                </SelectTrigger>
                                <SelectContent>
                                  {departments.map((dept) => (
                                    <SelectItem key={dept.id} value={dept.id}>
                                      <div className="flex items-center gap-2">
                                        <Building2 className="h-4 w-4" />
                                        {dept.name}
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          />
                          {checkpointErrors.ownerDeptId && (
                            <p className="text-sm text-destructive mt-1.5">
                              {String(checkpointErrors.ownerDeptId?.message || '')}
                            </p>
                          )}
                        </div>
                        <Button type="submit" className="w-full">สร้าง</Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {selectedTemplate ? (
                checkpoints.length > 0 ? (
                  <>
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEnd}
                    >
                      <SortableContext
                        items={checkpoints.map((cp) => cp.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="space-y-2">
                          {checkpoints.map((checkpoint) => (
                            <SortableCheckpointItem
                              key={checkpoint.id}
                              checkpoint={checkpoint}
                              onDelete={handleDeleteCheckpoint}
                            />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                    {hasUnsavedChanges && (
                      <div className="mt-4 pt-4 border-t flex items-center justify-between gap-3">
                        <p className="text-sm text-muted-foreground">
                          มีการเปลี่ยนแปลงลำดับที่ยังไม่ได้บันทึก
                        </p>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleCancelReorder}
                          >
                            <X className="h-4 w-4 mr-2" />
                            ยกเลิก
                          </Button>
                          <Button
                            size="sm"
                            onClick={handleSaveOrder}
                            className="bg-primary hover:bg-primary/90"
                          >
                            <Save className="h-4 w-4 mr-2" />
                            บันทึกลำดับ
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="rounded-full bg-muted p-4 mb-4">
                      <ListChecks className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold mb-1">ยังไม่มี Checkpoint</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      เพิ่ม checkpoint แรกให้กับ template นี้
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => setIsCheckpointDialogOpen(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      เพิ่ม Checkpoint แรก
                    </Button>
                  </div>
                )
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="rounded-full bg-muted p-4 mb-4">
                    <ListChecks className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-1">เลือก Template</h3>
                  <p className="text-sm text-muted-foreground">
                    เลือก template จากรายการเพื่อดู checkpoints
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

