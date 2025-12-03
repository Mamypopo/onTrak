'use client'

import { useEffect, useState } from 'react'
import { Plus, Edit, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useStaffLocale } from '@/lib/i18n-staff'
import Swal from 'sweetalert2'
import { ExtraChargeSkeleton } from '@/components/skeletons'
import { Skeleton } from '@/components/ui/skeleton'

interface ExtraCharge {
  id: number
  name: string
  price: number
  chargeType: 'PER_PERSON' | 'PER_SESSION'
  active: boolean
}

export default function ExtraChargesPage() {
  useStaffLocale()
  const [extraCharges, setExtraCharges] = useState<ExtraCharge[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingExtraCharge, setEditingExtraCharge] = useState<ExtraCharge | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form states
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [chargeType, setChargeType] = useState<'PER_PERSON' | 'PER_SESSION'>('PER_SESSION')
  const [active, setActive] = useState(true)

  useEffect(() => {
    fetchExtraCharges()
  }, [])

  const fetchExtraCharges = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/extra-charges')
      const data = await response.json()
      setExtraCharges(data.extraCharges || [])
    } catch (error) {
      console.error('Error fetching extra charges:', error)
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: 'ไม่สามารถโหลดข้อมูลได้',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
      })
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setName('')
    setPrice('')
    setChargeType('PER_SESSION')
    setActive(true)
    setEditingExtraCharge(null)
  }

  const handleOpenDialog = (extraCharge?: ExtraCharge) => {
    if (extraCharge) {
      setEditingExtraCharge(extraCharge)
      setName(extraCharge.name)
      setPrice(extraCharge.price.toString())
      setChargeType(extraCharge.chargeType)
      setActive(extraCharge.active)
    } else {
      resetForm()
    }
    setIsDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setIsDialogOpen(false)
    resetForm()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim() || !price.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'กรุณากรอกข้อมูลให้ครบ',
        text: 'กรุณากรอกชื่อและราคา',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
      })
      return
    }

    const priceNum = parseFloat(price)
    if (isNaN(priceNum) || priceNum <= 0) {
      Swal.fire({
        icon: 'error',
        title: 'ราคาไม่ถูกต้อง',
        text: 'กรุณากรอกราคาที่เป็นตัวเลขบวก',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
      })
      return
    }

    if (isSubmitting) return
    setIsSubmitting(true)

    try {
      const url = editingExtraCharge
        ? `/api/extra-charges/${editingExtraCharge.id}`
        : '/api/extra-charges'
      const method = editingExtraCharge ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          price: priceNum,
          chargeType,
          active,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || `Failed to ${editingExtraCharge ? 'update' : 'create'} extra charge`)
      }

      Swal.fire({
        icon: 'success',
        title: editingExtraCharge ? 'แก้ไขสำเร็จ' : 'เพิ่มสำเร็จ',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
      })

      handleCloseDialog()
      fetchExtraCharges()
    } catch (error: any) {
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: error.message || 'ไม่สามารถบันทึกข้อมูลได้',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (extraCharge: ExtraCharge) => {
    const result = await Swal.fire({
      title: 'ยืนยันการลบ',
      text: `คุณต้องการลบค่าบริการ "${extraCharge.name}" หรือไม่?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'ลบ',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#ef4444',
    })

    if (!result.isConfirmed) return

    try {
      const response = await fetch(`/api/extra-charges/${extraCharge.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete extra charge')
      }

      Swal.fire({
        icon: 'success',
        title: 'ลบสำเร็จ',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
      })

      fetchExtraCharges()
    } catch (error: any) {
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: error.message || 'ไม่สามารถลบข้อมูลได้',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
      })
    }
  }


  if (loading) {
    return (
      <div>
        <div className="flex justify-between items-center mb-6">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-10 w-36" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <ExtraChargeSkeleton key={i} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl sm:text-2xl font-bold">จัดการค่าบริการเพิ่มเติม</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="w-4 h-4 mr-2" />
              เพิ่มค่าบริการ
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingExtraCharge ? 'แก้ไขค่าบริการเพิ่มเติม' : 'เพิ่มค่าบริการเพิ่มเติม'}
              </DialogTitle>
              <DialogDescription>
                {editingExtraCharge
                  ? 'แก้ไขข้อมูลค่าบริการเพิ่มเติม'
                  : 'เพิ่มค่าบริการเพิ่มเติมใหม่ (เช่น น้ำรีฟิล)'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="name">ชื่อ *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="เช่น น้ำรีฟิล"
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="price">ราคา (บาท) *</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="เช่น 50"
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="chargeType">ประเภทการคิดค่าใช้จ่าย *</Label>
                <Select
                  value={chargeType}
                  onValueChange={(value: 'PER_PERSON' | 'PER_SESSION') => setChargeType(value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PER_SESSION">ต่อเซสชัน</SelectItem>
                    <SelectItem value="PER_PERSON">ต่อคน</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {chargeType === 'PER_SESSION'
                    ? 'คิดค่าบริการครั้งเดียวต่อเซสชัน'
                    : 'คิดค่าบริการต่อจำนวนคน'}
                </p>
              </div>

              <div className="flex items-center space-x-3 bg-muted/30 dark:bg-muted/20 rounded-lg p-4">
                <input
                  type="checkbox"
                  id="active"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 accent-accent cursor-pointer"
                />
                <Label htmlFor="active" className="cursor-pointer font-medium">
                  เปิดใช้งาน
                </Label>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseDialog}
                  disabled={isSubmitting}
                >
                  ยกเลิก
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'กำลังบันทึก...' : editingExtraCharge ? 'บันทึก' : 'เพิ่ม'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {extraCharges.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">ยังไม่มีค่าบริการเพิ่มเติม</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {extraCharges.map((extraCharge) => (
            <Card key={extraCharge.id} className={!extraCharge.active ? 'opacity-60' : ''}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{extraCharge.name}</CardTitle>
                  {!extraCharge.active && (
                    <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">
                      ปิดใช้งาน
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <p className="text-sm text-muted-foreground">ราคา</p>
                  <p className="text-xl font-semibold">
                    {extraCharge.price.toLocaleString()} บาท
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">ประเภท</p>
                  <p className="text-lg">
                    {extraCharge.chargeType === 'PER_SESSION' ? 'ต่อเซสชัน' : 'ต่อคน'}
                  </p>
                </div>
                <div className="flex gap-2 pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenDialog(extraCharge)}
                    className="flex-1"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    แก้ไข
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(extraCharge)}
                    className="flex-1"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    ลบ
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
