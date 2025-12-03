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
import { Badge } from '@/components/ui/badge'

interface Promotion {
  id: number
  name: string
  type: 'PERCENT' | 'FIXED' | 'PER_PERSON' | 'MIN_PEOPLE' | 'MIN_AMOUNT'
  value: number
  condition: any
  active: boolean
}

export default function PromotionsPage() {
  useStaffLocale()
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form states
  const [name, setName] = useState('')
  const [type, setType] = useState<'PERCENT' | 'FIXED' | 'PER_PERSON' | 'MIN_PEOPLE' | 'MIN_AMOUNT'>('PERCENT')
  const [value, setValue] = useState('')
  const [condition, setCondition] = useState<{
    buy?: number
    pay?: number
    minPeople?: number
    minAmount?: number
  }>({})
  const [active, setActive] = useState(true)

  useEffect(() => {
    fetchPromotions()
  }, [])

  const fetchPromotions = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/promotions')
      const data = await response.json()
      setPromotions(data.promotions || [])
    } catch (error) {
      console.error('Error fetching promotions:', error)
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
    setType('PERCENT')
    setValue('')
    setCondition({})
    setActive(true)
    setEditingPromotion(null)
  }

  const handleOpenDialog = (promotion?: Promotion) => {
    if (promotion) {
      setEditingPromotion(promotion)
      setName(promotion.name)
      setType(promotion.type)
      setValue(promotion.value.toString())
      setCondition(promotion.condition || {})
      setActive(promotion.active)
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

    // Validate name (required for all types)
    if (!name.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'กรุณากรอกข้อมูลให้ครบ',
        text: 'กรุณากรอกชื่อโปรโมชั่น',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
      })
      return
    }

    // Validate based on promotion type
    if (type === 'PER_PERSON') {
      // PER_PERSON: Only needs condition, not value
      if (!condition.buy || !condition.pay || condition.buy <= 0 || condition.pay <= 0 || condition.pay >= condition.buy) {
        Swal.fire({
          icon: 'warning',
          title: 'ข้อมูลไม่ถูกต้อง',
          text: 'กรุณากรอกจำนวนคนที่มาและจำนวนคนที่จ่าย (จำนวนคนที่จ่ายต้องน้อยกว่าจำนวนคนที่มา)',
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3000,
          timerProgressBar: true,
        })
        return
      }
    } else if (type === 'MIN_PEOPLE') {
      // MIN_PEOPLE: Needs condition and value
      if (!condition.minPeople || condition.minPeople <= 0) {
        Swal.fire({
          icon: 'warning',
          title: 'ข้อมูลไม่ถูกต้อง',
          text: 'กรุณากรอกจำนวนคนขั้นต่ำ',
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3000,
          timerProgressBar: true,
        })
        return
      }
      if (!value.trim()) {
        Swal.fire({
          icon: 'warning',
          title: 'กรุณากรอกข้อมูลให้ครบ',
          text: 'กรุณากรอกค่าส่วนลด',
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3000,
          timerProgressBar: true,
        })
        return
      }
    } else if (type === 'MIN_AMOUNT') {
      // MIN_AMOUNT: Needs condition and value
      if (!condition.minAmount || condition.minAmount <= 0) {
        Swal.fire({
          icon: 'warning',
          title: 'ข้อมูลไม่ถูกต้อง',
          text: 'กรุณากรอกยอดขั้นต่ำ',
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3000,
          timerProgressBar: true,
        })
        return
      }
      if (!value.trim()) {
        Swal.fire({
          icon: 'warning',
          title: 'กรุณากรอกข้อมูลให้ครบ',
          text: 'กรุณากรอกค่าส่วนลด',
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3000,
          timerProgressBar: true,
        })
        return
      }
    } else {
      // PERCENT and FIXED: Only needs value
      if (!value.trim()) {
        Swal.fire({
          icon: 'warning',
          title: 'กรุณากรอกข้อมูลให้ครบ',
          text: 'กรุณากรอกค่าส่วนลด',
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3000,
          timerProgressBar: true,
        })
        return
      }
    }

    // Validate value (only for types that need it)
    if (type !== 'PER_PERSON') {
      const valueNum = parseFloat(value)
      if (isNaN(valueNum) || valueNum <= 0) {
        Swal.fire({
          icon: 'warning',
          title: 'ค่าส่วนลดไม่ถูกต้อง',
          text: 'กรุณากรอกค่าส่วนลดที่มากกว่า 0',
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3000,
          timerProgressBar: true,
        })
        return
      }

      if (type === 'PERCENT' && valueNum > 100) {
        Swal.fire({
          icon: 'warning',
          title: 'เปอร์เซ็นต์ไม่ถูกต้อง',
          text: 'เปอร์เซ็นต์ส่วนลดต้องไม่เกิน 100%',
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3000,
          timerProgressBar: true,
        })
        return
      }
    }

    setIsSubmitting(true)

    try {
      const url = editingPromotion
        ? `/api/promotions/${editingPromotion.id}`
        : '/api/promotions'
      const method = editingPromotion ? 'PATCH' : 'POST'

      // Prepare condition object based on type
      let finalCondition: any = null
      if (type === 'PER_PERSON') {
        finalCondition = { buy: condition.buy, pay: condition.pay }
      } else if (type === 'MIN_PEOPLE') {
        finalCondition = { minPeople: condition.minPeople }
      } else if (type === 'MIN_AMOUNT') {
        finalCondition = { minAmount: condition.minAmount }
      }

      // For PER_PERSON, value is not used, so send 0
      // For other types, parse value
      const finalValue = type === 'PER_PERSON' ? 0 : parseFloat(value)

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          type,
          value: finalValue,
          condition: finalCondition,
          active,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to save promotion')
      }

      Swal.fire({
        icon: 'success',
        title: editingPromotion ? 'แก้ไขสำเร็จ' : 'เพิ่มสำเร็จ',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
      })

      handleCloseDialog()
      fetchPromotions()
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

  const handleDelete = async (promotion: Promotion) => {
    const result = await Swal.fire({
      title: 'ยืนยันการลบ',
      text: `คุณต้องการลบโปรโมชั่น "${promotion.name}" หรือไม่?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'ลบ',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#ef4444',
    })

    if (!result.isConfirmed) return

    try {
      const response = await fetch(`/api/promotions/${promotion.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete promotion')
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

      fetchPromotions()
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

  // Skeleton component for promotion cards
  const PromotionSkeleton = () => (
    <Card className="animate-pulse">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="h-6 bg-muted rounded w-3/4"></div>
          <div className="h-5 bg-muted rounded w-16"></div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div>
          <div className="h-4 bg-muted rounded w-12 mb-2"></div>
          <div className="h-6 bg-muted rounded w-24"></div>
        </div>
        <div>
          <div className="h-4 bg-muted rounded w-16 mb-2"></div>
          <div className="h-5 bg-muted rounded w-20"></div>
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
          <div className="h-7 bg-muted rounded w-48 animate-pulse"></div>
          <div className="h-10 bg-muted rounded w-36 animate-pulse"></div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <PromotionSkeleton key={i} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl sm:text-2xl font-bold">จัดการโปรโมชั่น</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="w-4 h-4 mr-2" />
              เพิ่มโปรโมชั่น
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingPromotion ? 'แก้ไขโปรโมชั่น' : 'เพิ่มโปรโมชั่น'}
              </DialogTitle>
              <DialogDescription>
                {editingPromotion
                  ? 'แก้ไขข้อมูลโปรโมชั่น'
                  : 'เพิ่มโปรโมชั่นใหม่ (ส่วนลด % หรือ บาท)'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="name">ชื่อโปรโมชั่น *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="เช่น ลด 10%"
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="type">ประเภท *</Label>
                <Select
                  value={type}
                  onValueChange={(value: 'PERCENT' | 'FIXED' | 'PER_PERSON' | 'MIN_PEOPLE' | 'MIN_AMOUNT') => {
                    setType(value)
                    setCondition({})
                    setValue('')
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PERCENT">เปอร์เซ็นต์ (%)</SelectItem>
                    <SelectItem value="FIXED">จำนวนเงิน (บาท)</SelectItem>
                    <SelectItem value="PER_PERSON">ลดรายคน (มา X จ่าย Y)</SelectItem>
                    <SelectItem value="MIN_PEOPLE">ลดเมื่อมีคนขั้นต่ำ</SelectItem>
                    <SelectItem value="MIN_AMOUNT">ลดเมื่อยอดขั้นต่ำ</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {type === 'PERCENT'
                    ? 'ส่วนลดเป็นเปอร์เซ็นต์จากยอดรวม (เช่น 10 = ลด 10%)'
                    : type === 'FIXED'
                    ? 'ส่วนลดเป็นจำนวนเงินคงที่จากยอดรวม (เช่น 100 = ลด 100 บาท)'
                    : type === 'PER_PERSON'
                    ? 'ส่วนลดรายคนสำหรับบุฟเฟ่ต์ (เช่น มา 4 จ่าย 3 = ลด 1 คน)'
                    : type === 'MIN_PEOPLE'
                    ? 'ส่วนลดเมื่อมีจำนวนคนขั้นต่ำ (เช่น 5 คนขึ้นไป)'
                    : 'ส่วนลดเมื่อยอดรวมขั้นต่ำ (เช่น 1,000 บาทขึ้นไป)'}
                </p>
              </div>

              {/* Condition inputs based on type */}
              {type === 'PER_PERSON' && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="grid gap-2">
                    <Label htmlFor="buy">จำนวนคนที่มา *</Label>
                    <Input
                      id="buy"
                      type="number"
                      min="1"
                      value={condition.buy || ''}
                      onChange={(e) => setCondition({ ...condition, buy: parseInt(e.target.value) || 0 })}
                      placeholder="เช่น 4"
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="pay">จำนวนคนที่จ่าย *</Label>
                    <Input
                      id="pay"
                      type="number"
                      min="1"
                      value={condition.pay || ''}
                      onChange={(e) => setCondition({ ...condition, pay: parseInt(e.target.value) || 0 })}
                      placeholder="เช่น 3"
                      required
                    />
                  </div>
                </div>
              )}

              {type === 'MIN_PEOPLE' && (
                <div className="grid gap-2">
                  <Label htmlFor="minPeople">จำนวนคนขั้นต่ำ *</Label>
                  <Input
                    id="minPeople"
                    type="number"
                    min="1"
                    value={condition.minPeople || ''}
                    onChange={(e) => setCondition({ ...condition, minPeople: parseInt(e.target.value) || 0 })}
                    placeholder="เช่น 5"
                    required
                  />
                </div>
              )}

              {type === 'MIN_AMOUNT' && (
                <div className="grid gap-2">
                  <Label htmlFor="minAmount">ยอดขั้นต่ำ (บาท) *</Label>
                  <Input
                    id="minAmount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={condition.minAmount || ''}
                    onChange={(e) => setCondition({ ...condition, minAmount: parseFloat(e.target.value) || 0 })}
                    placeholder="เช่น 1000"
                    required
                  />
                </div>
              )}

              {/* Value input (for discount amount) */}
              {(type === 'PERCENT' || type === 'FIXED' || type === 'MIN_PEOPLE' || type === 'MIN_AMOUNT') && (
                <div className="grid gap-2">
                  <Label htmlFor="value">
                    {type === 'PERCENT'
                      ? 'เปอร์เซ็นต์ (%) *'
                      : type === 'MIN_PEOPLE' || type === 'MIN_AMOUNT'
                      ? 'ส่วนลด (บาท หรือ %) *'
                      : 'จำนวนเงิน (บาท) *'}
                  </Label>
                  <Input
                    id="value"
                    type="number"
                    step={type === 'PERCENT' ? '0.01' : '1'}
                    min="0"
                    max={type === 'PERCENT' ? '100' : undefined}
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder={
                      type === 'PERCENT'
                        ? 'เช่น 10'
                        : type === 'MIN_PEOPLE' || type === 'MIN_AMOUNT'
                        ? 'เช่น 100 หรือ 10 (ถ้าเป็น %)'
                        : 'เช่น 100'
                    }
                    required
                  />
                  {(type === 'MIN_PEOPLE' || type === 'MIN_AMOUNT') && (
                    <p className="text-xs text-muted-foreground">
                      กรอกเป็นจำนวนเงิน (บาท) หรือเปอร์เซ็นต์ (%) ตามต้องการ
                    </p>
                  )}
                </div>
              )}

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

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseDialog}
                  disabled={isSubmitting}
                >
                  ยกเลิก
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting
                    ? 'กำลังบันทึก...'
                    : editingPromotion
                    ? 'บันทึกการแก้ไข'
                    : 'เพิ่มโปรโมชั่น'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {promotions.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-muted-foreground">ยังไม่มีโปรโมชั่น</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {promotions.map((promotion) => (
            <Card key={promotion.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{promotion.name}</CardTitle>
                  <Badge variant={promotion.active ? 'success' : 'outline'}>
                    {promotion.active ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">ประเภท</p>
                  <p className="font-medium">
                    {promotion.type === 'PERCENT'
                      ? 'เปอร์เซ็นต์'
                      : promotion.type === 'FIXED'
                      ? 'จำนวนเงิน'
                      : promotion.type === 'PER_PERSON'
                      ? 'ลดรายคน'
                      : promotion.type === 'MIN_PEOPLE'
                      ? 'ลดเมื่อมีคนขั้นต่ำ'
                      : 'ลดเมื่อยอดขั้นต่ำ'}
                  </p>
                  {promotion.condition && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {promotion.type === 'PER_PERSON' && promotion.condition.buy && promotion.condition.pay
                        ? `มา ${promotion.condition.buy} จ่าย ${promotion.condition.pay}`
                        : promotion.type === 'MIN_PEOPLE' && promotion.condition.minPeople
                        ? `ขั้นต่ำ ${promotion.condition.minPeople} คน`
                        : promotion.type === 'MIN_AMOUNT' && promotion.condition.minAmount
                        ? `ขั้นต่ำ ${promotion.condition.minAmount.toLocaleString()} บาท`
                        : ''}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">ค่า</p>
                  <p className="font-medium text-lg">
                    {promotion.type === 'PERCENT'
                      ? `${promotion.value}%`
                      : `${promotion.value.toLocaleString()} บาท`}
                  </p>
                </div>
                <div className="flex gap-2 pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleOpenDialog(promotion)}
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    แก้ไข
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleDelete(promotion)}
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
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
