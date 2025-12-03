'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { QrCode, Users, Package as PackageIcon, Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { useTranslations } from '@/lib/i18n'
import { useStaffLocale } from '@/lib/i18n-staff'
import Swal from 'sweetalert2'
import QRCode from 'qrcode'

interface Table {
  id: number
  name: string
  status: 'AVAILABLE' | 'OCCUPIED'
}

interface Package {
  id: number
  name: string
  pricePerPerson: number
  durationMinutes: number | null
}

interface Session {
  id: number
  tableId: number
  peopleCount: number
  packageId: number | null
  startTime: string
  expireTime: string | null
  status: 'ACTIVE' | 'CLOSED'
  table: {
    id: number
    name: string
  }
  package: Package | null
}

export default function OpenTablePage() {
  useStaffLocale() // Force Thai locale for admin
  const router = useRouter()
  const t = useTranslations()
  const [tables, setTables] = useState<Table[]>([])
  const [packages, setPackages] = useState<Package[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [selectedTable, setSelectedTable] = useState<string>('')
  const [peopleCount, setPeopleCount] = useState<string>('')
  const [sessionType, setSessionType] = useState<'buffet' | 'a_la_carte' | ''>('')
  const [selectedPackage, setSelectedPackage] = useState<string>('')
  const [extraCharges, setExtraCharges] = useState<Array<{ id: number; name: string; price: number; chargeType: 'PER_PERSON' | 'PER_SESSION' }>>([])
  const [selectedExtraCharges, setSelectedExtraCharges] = useState<number[]>([])
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('')
  const [createdSession, setCreatedSession] = useState<Session | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const [tablesRes, packagesRes, extraChargesRes] = await Promise.all([
        fetch('/api/tables?status=AVAILABLE'),
        fetch('/api/packages'),
        fetch('/api/extra-charges'),
      ])

      const tablesData = await tablesRes.json()
      const packagesData = await packagesRes.json()
      const extraChargesData = await extraChargesRes.json()

      setTables(tablesData.tables || [])
      setPackages(packagesData.packages || [])
      setExtraCharges((extraChargesData.extraCharges || []).filter((ec: any) => ec.active))
    } catch (error) {
      console.error('Error fetching data:', error)
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
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const generateQRCode = async (sessionId: number) => {
    try {
      // Use NEXT_PUBLIC_BASE_URL from env if available, otherwise use window.location
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || window.location.origin
      const url = `${baseUrl}/session/${sessionId}`
      const qrDataUrl = await QRCode.toDataURL(url, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      })
      return qrDataUrl
    } catch (error) {
      console.error('Error generating QR code:', error)
      return null
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedTable || !peopleCount || !sessionType) {
      Swal.fire({
        icon: 'warning',
        title: 'กรุณากรอกข้อมูลให้ครบ',
        text: 'กรุณาเลือกโต๊ะ, ระบุจำนวนคน และเลือกประเภท',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
      })
      return
    }

    const peopleCountNum = parseInt(peopleCount, 10)
    if (isNaN(peopleCountNum) || peopleCountNum < 1) {
      Swal.fire({
        icon: 'error',
        title: 'ข้อมูลไม่ถูกต้อง',
        text: 'กรุณากรอกจำนวนคนที่ถูกต้อง',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
      })
      return
    }

    // ถ้าเลือกบุฟเฟ่ต์ ต้องเลือกแพ็กเกจ
    if (sessionType === 'buffet' && !selectedPackage) {
      Swal.fire({
        icon: 'warning',
        title: 'กรุณาเลือกแพ็กเกจ',
        text: 'กรุณาเลือกแพ็กเกจบุฟเฟ่ต์',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
      })
      return
    }

    setSubmitting(true)

    try {
      const response = await fetch('/api/session/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableId: parseInt(selectedTable, 10),
          peopleCount: peopleCountNum,
          packageId: sessionType === 'buffet' && selectedPackage ? parseInt(selectedPackage, 10) : undefined,
          extraChargeIds: selectedExtraCharges,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to open table')
      }

      const data = await response.json()
      const session: Session = data.session

      // Generate QR code
      const qrUrl = await generateQRCode(session.id)
      if (qrUrl) {
        setQrCodeUrl(qrUrl)
      }

      setCreatedSession(session)

      Swal.fire({
        icon: 'success',
        title: 'เปิดโต๊ะสำเร็จ',
        text: `${session.table.name} เปิดแล้ว`,
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
      })

      // Reset form
      setSelectedTable('')
      setPeopleCount('')
      setSessionType('')
      setSelectedPackage('')
      setSelectedExtraCharges([])

      // Refresh tables
      fetchData()
    } catch (error: any) {
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: error.message || 'ไม่สามารถเปิดโต๊ะได้',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handlePrintQR = async () => {
    if (!createdSession) return

    try {
      // Generate and open PDF in new window for printing
      const pdfUrl = `/api/qr/pdf?sessionId=${createdSession.id}`
      window.open(pdfUrl, '_blank')
      
      Swal.fire({
        icon: 'success',
        title: 'เปิด PDF แล้ว',
        text: 'สามารถพิมพ์ได้จากหน้าต่างใหม่',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
      })
    } catch (error) {
      console.error('Error generating PDF:', error)
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: 'ไม่สามารถสร้าง PDF ได้',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
      })
    }
  }

  const handleCloseQR = () => {
    setQrCodeUrl('')
    setCreatedSession(null)
  }

  // Skeleton component for form fields
  const FormFieldSkeleton = () => (
    <div className="grid gap-2">
      <div className="h-4 bg-muted rounded w-20 animate-pulse"></div>
      <div className="h-10 bg-muted rounded animate-pulse"></div>
    </div>
  )

  if (loading) {
    return (
      <div>
        <div className="h-7 bg-muted rounded w-32 mb-4 sm:mb-6 animate-pulse"></div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Form Skeleton */}
          <Card className="animate-pulse">
            <CardHeader>
              <div className="h-6 bg-muted rounded w-32"></div>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormFieldSkeleton />
              <FormFieldSkeleton />
              <FormFieldSkeleton />
              <div className="h-10 bg-muted rounded"></div>
            </CardContent>
          </Card>
          {/* QR Code Skeleton */}
          <Card className="animate-pulse">
            <CardHeader>
              <div className="h-6 bg-muted rounded w-24"></div>
            </CardHeader>
            <CardContent>
              <div className="w-full h-64 bg-muted rounded flex items-center justify-center">
                <div className="w-48 h-48 bg-muted-foreground/20 rounded"></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">
        {t('admin.open_table')}
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle>เปิดโต๊ะใหม่</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="table">เลือกโต๊ะ *</Label>
                <Select
                  value={selectedTable}
                  onValueChange={setSelectedTable}
                  required
                >
                  <SelectTrigger id="table">
                    <SelectValue placeholder="เลือกโต๊ะ" />
                  </SelectTrigger>
                  <SelectContent>
                    {tables.length === 0 ? (
                      <SelectItem value="none" disabled>
                        ไม่มีโต๊ะว่าง
                      </SelectItem>
                    ) : (
                      tables.map((table) => (
                        <SelectItem key={table.id} value={table.id.toString()}>
                          {table.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="peopleCount">จำนวนคน *</Label>
                <Input
                  id="peopleCount"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={peopleCount}
                  onChange={(e) => {
                    const value = e.target.value
                    if (value === '' || /^\d+$/.test(value)) {
                      setPeopleCount(value)
                    }
                  }}
                  placeholder="ระบุจำนวนคน"
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="sessionType">ประเภท *</Label>
                <Select
                  value={sessionType}
                  onValueChange={(value) => {
                    setSessionType(value as 'buffet' | 'a_la_carte')
                    // Reset package selection when changing type
                    if (value === 'a_la_carte') {
                      setSelectedPackage('')
                    }
                  }}
                  required
                >
                  <SelectTrigger id="sessionType">
                    <SelectValue placeholder="เลือกประเภท" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="a_la_carte">
                      à la carte (สั่งตามเมนู)
                    </SelectItem>
                    <SelectItem value="buffet">
                      บุฟเฟ่ต์
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  เลือกประเภทการสั่งอาหาร
                </p>
              </div>

              {sessionType === 'buffet' && (
                <div className="grid gap-2">
                  <Label htmlFor="package">แพ็กเกจบุฟเฟ่ต์ *</Label>
                  {packages.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-muted-foreground border rounded-md bg-muted">
                      ไม่มีแพ็กเกจบุฟเฟ่ต์
                    </div>
                  ) : (
                    <>
                      <Select
                        value={selectedPackage}
                        onValueChange={setSelectedPackage}
                        required={sessionType === 'buffet'}
                      >
                        <SelectTrigger id="package">
                          <SelectValue placeholder="เลือกแพ็กเกจบุฟเฟ่ต์" />
                        </SelectTrigger>
                        <SelectContent>
                          {packages.map((pkg) => (
                            <SelectItem key={pkg.id} value={pkg.id.toString()}>
                              {pkg.name} - {pkg.pricePerPerson.toFixed(2)} บาท/คน
                              {pkg.durationMinutes &&
                                ` (${pkg.durationMinutes} นาที)`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {selectedPackage && (
                        <p className="text-xs text-muted-foreground">
                          เวลาจะถูกกำหนดตามแพ็กเกจที่เลือก
                        </p>
                      )}
                    </>
                  )}
                </div>
              )}

              {extraCharges.length > 0 && (
                <div className="grid gap-2">
                  <Label>ค่าบริการเพิ่มเติม (ไม่บังคับ)</Label>
                  <div className="space-y-2 border rounded-lg p-3 max-h-48 overflow-y-auto">
                    {extraCharges.map((extraCharge) => {
                      const isSelected = selectedExtraCharges.includes(extraCharge.id)
                      const peopleCountNum = parseInt(peopleCount) || 0
                      const chargeLabel = extraCharge.chargeType === 'PER_PERSON'
                        ? `ต่อคน`
                        : `ต่อเซสชัน`
                      
                      const totalAmount = extraCharge.chargeType === 'PER_PERSON'
                        ? extraCharge.price * peopleCountNum
                        : extraCharge.price
                      
                      return (
                        <div
                          key={extraCharge.id}
                          className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${
                            isSelected 
                              ? 'bg-accent/10 dark:bg-accent/20 border border-accent dark:border-accent/50' 
                              : 'hover:bg-muted/50 dark:hover:bg-muted/30'
                          }`}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedExtraCharges(selectedExtraCharges.filter(id => id !== extraCharge.id))
                            } else {
                              setSelectedExtraCharges([...selectedExtraCharges, extraCharge.id])
                            }
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="w-4 h-4 rounded accent-accent cursor-pointer"
                          />
                          <div className="flex-1">
                            <p className="text-sm font-medium">{extraCharge.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {extraCharge.price.toLocaleString()} บาท ({chargeLabel})
                              {isSelected && peopleCount && (
                                <span className="ml-2 text-primary font-semibold">
                                  รวม: {totalAmount.toLocaleString()} บาท
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    เลือกค่าบริการเพิ่มเติมที่ต้องการ (เช่น กุ้งไม่อั้น, น้ำรีฟิล)
                  </p>
                </div>
              )}

              <Button
                type="submit"
                disabled={submitting || tables.length === 0}
                className="w-full"
              >
                {submitting ? 'กำลังเปิดโต๊ะ...' : 'เปิดโต๊ะ'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* QR Code Display */}
        {qrCodeUrl && createdSession && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="w-5 h-5" />
                QR Code สำหรับโต๊ะ
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center space-y-2">
                <p className="text-lg font-semibold">
                  {createdSession.table.name}
                </p>
                <p className="text-sm text-muted-foreground">
                  จำนวนคน: {createdSession.peopleCount} คน
                </p>
                {createdSession.package && (
                  <p className="text-sm text-muted-foreground">
                    แพ็กเกจ: {createdSession.package.name}
                  </p>
                )}
              </div>

              <div className="flex justify-center p-4 bg-white rounded-lg">
                <img
                  src={qrCodeUrl}
                  alt="QR Code"
                  className="w-full max-w-[300px] h-auto"
                />
              </div>

              <div className="text-center space-y-2">
                <p className="text-xs text-muted-foreground">
                  ลูกค้าสามารถสแกน QR Code นี้เพื่อเข้าสู่ระบบสั่งอาหาร
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="default"
                    onClick={handlePrintQR}
                    className="flex-1"
                  >
                    <Printer className="w-4 h-4 mr-2" />
                    พิมพ์
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleCloseQR}
                    className="flex-1"
                  >
                    ปิด
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
