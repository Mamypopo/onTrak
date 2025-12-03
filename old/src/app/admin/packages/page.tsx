'use client'

import { useEffect, useState, useCallback } from 'react'
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
import { useStaffLocale } from '@/lib/i18n-staff'
import Swal from 'sweetalert2'

interface Package {
  id: number
  name: string
  pricePerPerson: number
  durationMinutes?: number | null
}

export default function PackagesPage() {
  useStaffLocale()
  const [packages, setPackages] = useState<Package[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingPackage, setEditingPackage] = useState<Package | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form states
  const [name, setName] = useState('')
  const [pricePerPerson, setPricePerPerson] = useState('')
  const [durationMinutes, setDurationMinutes] = useState('')

  useEffect(() => {
    fetchPackages()
  }, [])

  const fetchPackages = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/packages')
      const data = await response.json()
      setPackages(data.packages || [])
    } catch (error) {
      console.error('Error fetching packages:', error)
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
    setPricePerPerson('')
    setDurationMinutes('')
    setEditingPackage(null)
  }

  const handleOpenDialog = (pkg?: Package) => {
    if (pkg) {
      setEditingPackage(pkg)
      setName(pkg.name)
      setPricePerPerson(pkg.pricePerPerson.toString())
      setDurationMinutes(pkg.durationMinutes?.toString() || '')
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

    if (!name.trim() || !pricePerPerson.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'กรุณากรอกข้อมูลให้ครบ',
        text: 'กรุณากรอกชื่อและราคาต่อคน',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
      })
      return
    }

    const price = parseFloat(pricePerPerson)
    if (isNaN(price) || price <= 0) {
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

    let duration: number | null = null
    if (durationMinutes.trim()) {
      const durationNum = parseInt(durationMinutes, 10)
      if (isNaN(durationNum) || durationNum <= 0) {
        Swal.fire({
          icon: 'error',
          title: 'ระยะเวลาไม่ถูกต้อง',
          text: 'กรุณากรอกระยะเวลาเป็นตัวเลขบวก (นาที)',
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3000,
          timerProgressBar: true,
        })
        return
      }
      duration = durationNum
    }

    if (isSubmitting) return
    setIsSubmitting(true)

    try {
      const url = editingPackage
        ? `/api/packages/${editingPackage.id}`
        : '/api/packages'
      const method = editingPackage ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          pricePerPerson: price,
          durationMinutes: duration,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || `Failed to ${editingPackage ? 'update' : 'create'} package`)
      }

      Swal.fire({
        icon: 'success',
        title: editingPackage ? 'แก้ไขสำเร็จ' : 'เพิ่มสำเร็จ',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
      })

      handleCloseDialog()
      fetchPackages()
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

  const handleDelete = async (pkg: Package) => {
    const result = await Swal.fire({
      title: 'ยืนยันการลบ',
      text: `คุณต้องการลบแพ็กเกจ "${pkg.name}" หรือไม่?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'ลบ',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#ef4444',
    })

    if (!result.isConfirmed) return

    try {
      const response = await fetch(`/api/packages/${pkg.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete package')
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

      fetchPackages()
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

  // Skeleton component for package cards
  const PackageSkeleton = () => (
    <Card className="animate-pulse">
      <CardHeader>
        <div className="h-6 bg-muted rounded w-3/4"></div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div>
          <div className="h-4 bg-muted rounded w-20 mb-2"></div>
          <div className="h-6 bg-muted rounded w-24"></div>
        </div>
        <div>
          <div className="h-4 bg-muted rounded w-16 mb-2"></div>
          <div className="h-5 bg-muted rounded w-32"></div>
        </div>
        <div className="flex gap-2 pt-4">
          <div className="flex-1 h-9 bg-muted rounded"></div>
          <div className="flex-1 h-9 bg-muted rounded"></div>
        </div>
      </CardContent>
    </Card>
  )

  if (loading) {
    return (
      <div>
        <div className="flex justify-between items-center mb-6">
          <div className="h-7 bg-muted rounded w-32 animate-pulse"></div>
          <div className="h-10 bg-muted rounded w-32 animate-pulse"></div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <PackageSkeleton key={i} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl sm:text-2xl font-bold">จัดการแพ็กเกจ</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="w-4 h-4 mr-2" />
              เพิ่มแพ็กเกจ
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingPackage ? 'แก้ไขแพ็กเกจ' : 'เพิ่มแพ็กเกจ'}
              </DialogTitle>
              <DialogDescription>
                {editingPackage
                  ? 'แก้ไขข้อมูลแพ็กเกจ'
                  : 'เพิ่มแพ็กเกจบุฟเฟ่ต์ใหม่'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="name">ชื่อแพ็กเกจ *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="เช่น บุฟเฟต์ 2 ชั่วโมง"
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="pricePerPerson">ราคาต่อคน (บาท) *</Label>
                <Input
                  id="pricePerPerson"
                  type="number"
                  step="0.01"
                  min="0"
                  value={pricePerPerson}
                  onChange={(e) => setPricePerPerson(e.target.value)}
                  placeholder="เช่น 299"
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="durationMinutes">
                  ระยะเวลา (นาที) <span className="text-muted-foreground">(ไม่บังคับ)</span>
                </Label>
                <Input
                  id="durationMinutes"
                  type="number"
                  min="1"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value)}
                  placeholder="เช่น 120 (2 ชั่วโมง)"
                />
                <p className="text-xs text-muted-foreground">
                  เว้นว่างไว้ถ้าไม่ต้องการจำกัดเวลา
                </p>
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
                  {isSubmitting ? 'กำลังบันทึก...' : editingPackage ? 'บันทึก' : 'เพิ่ม'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {packages.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">ยังไม่มีแพ็กเกจ</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {packages.map((pkg) => (
            <Card key={pkg.id}>
              <CardHeader>
                <CardTitle className="text-lg">{pkg.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <p className="text-sm text-muted-foreground">ราคาต่อคน</p>
                  <p className="text-xl font-semibold">
                    {pkg.pricePerPerson.toLocaleString()} บาท
                  </p>
                </div>
                {pkg.durationMinutes && (
                  <div>
                    <p className="text-sm text-muted-foreground">ระยะเวลา</p>
                    <p className="text-lg">
                      {pkg.durationMinutes} นาที ({Math.round(pkg.durationMinutes / 60 * 10) / 10} ชั่วโมง)
                    </p>
                  </div>
                )}
                <div className="flex gap-2 pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenDialog(pkg)}
                    className="flex-1"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    แก้ไข
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(pkg)}
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
