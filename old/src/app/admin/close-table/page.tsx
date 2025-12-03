'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { Receipt, Users, Clock, Package as PackageIcon, QrCode, XCircle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useTranslations } from '@/lib/i18n'
import { useStaffLocale } from '@/lib/i18n-staff'
import { getSocket } from '@/lib/socket-client'
import Swal from '@/lib/swal-config'
import { SessionCardSkeleton, BillingFormSkeleton } from '@/components/skeletons'
import { Skeleton } from '@/components/ui/skeleton'

interface ActiveSession {
  id: number
  tableId: number
  peopleCount: number
  packageId: number | null
  startTime: string
  expireTime: string | null
  status: 'ACTIVE' | 'CLOSED'
  extraChargeIds: number[] | null
  table: {
    id: number
    name: string
    status: 'AVAILABLE' | 'OCCUPIED'
  }
  package: {
    id: number
    name: string
    pricePerPerson: number
  } | null
  orders: Array<{ id: number }>
  _count: {
    orders: number
  }
}

interface ExtraCharge {
  id: number
  name: string
  price: number
  chargeType: 'PER_PERSON' | 'PER_SESSION'
  active: boolean
}

interface Promotion {
  id: number
  name: string
  type: 'PERCENT' | 'FIXED' | 'PER_PERSON' | 'MIN_PEOPLE' | 'MIN_AMOUNT'
  value: number
  condition: any
  active: boolean
}

export default function CloseTablePage() {
  useStaffLocale() // Force Thai locale for admin
  const t = useTranslations()
  const [sessions, setSessions] = useState<ActiveSession[]>([])
  const [extraCharges, setExtraCharges] = useState<ExtraCharge[]>([])
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSession, setSelectedSession] = useState<string>('')
  const [paymentMethod, setPaymentMethod] = useState<string>('CASH')
  const [selectedExtraCharges, setSelectedExtraCharges] = useState<number[]>([])
  const [selectedPromotionId, setSelectedPromotionId] = useState<string>('')
  const [discountType, setDiscountType] = useState<'PERCENT' | 'FIXED' | ''>('')
  const [discountValue, setDiscountValue] = useState<string>('')
  const [vatRate, setVatRate] = useState<string>('')
  const [receivedAmount, setReceivedAmount] = useState<string>('')
  const [closing, setClosing] = useState(false)
  const [cancelling, setCancelling] = useState<number | null>(null)
  const [newSessionIds, setNewSessionIds] = useState<Set<number>>(new Set())
  const [previousSessionIds, setPreviousSessionIds] = useState<Set<number>>(new Set())

  const fetchActiveSessions = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true)
      }
      const [sessionsRes, extraChargesRes, promotionsRes] = await Promise.all([
        fetch('/api/sessions/active'),
        fetch('/api/extra-charges'),
        fetch('/api/promotions'),
      ])
      
      if (!sessionsRes.ok) {
        throw new Error('Failed to fetch active sessions')
      }
      
      const sessionsData = await sessionsRes.json()
      const extraChargesData = await extraChargesRes.json()
      const promotionsData = await promotionsRes.json()
      
      const newSessions = sessionsData.sessions || []
      setPromotions(promotionsData.promotions || [])
      const newSessionIdsSet = new Set<number>(newSessions.map((s: ActiveSession) => s.id))
      
      // Detect new sessions (only when not showing loading - i.e., from socket updates)
      if (!showLoading && previousSessionIds.size > 0) {
        const addedSessions = newSessions.filter((s: ActiveSession) => !previousSessionIds.has(s.id))
        const removedSessions = Array.from(previousSessionIds).filter(id => !newSessionIdsSet.has(id))
        
        // Show toast for new sessions
        if (addedSessions.length > 0) {
          const session = addedSessions[0]
          Swal.fire({
            icon: 'info',
            title: 'มีโต๊ะใหม่',
            text: `${session.table.name} - ${session.peopleCount} คน`,
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 2000,
            timerProgressBar: true,
          })
          
          // Highlight new sessions
          setNewSessionIds(new Set(addedSessions.map((s: ActiveSession) => s.id)))
          // Remove highlight after 3 seconds
          setTimeout(() => {
            setNewSessionIds((prev) => {
              const next = new Set(prev)
              addedSessions.forEach((s: ActiveSession) => next.delete(s.id))
              return next
            })
          }, 3000)
        }
        
        // Show toast for closed sessions
        if (removedSessions.length > 0 && sessions.length > 0) {
          const removedSession = sessions.find((s: ActiveSession) => removedSessions.includes(s.id))
          if (removedSession) {
            Swal.fire({
              icon: 'success',
              title: 'ปิดโต๊ะแล้ว',
              text: `${removedSession.table.name}`,
              toast: true,
              position: 'top-end',
              showConfirmButton: false,
              timer: 2000,
              timerProgressBar: true,
            })
          }
        }
      }
      
      setSessions(newSessions)
      setExtraCharges((extraChargesData.extraCharges || []).filter((ec: ExtraCharge) => ec.active))
      setPreviousSessionIds(newSessionIdsSet)
    } catch (error) {
      console.error('Error fetching data:', error)
      if (showLoading) {
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
      }
    } finally {
      if (showLoading) {
        setLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    fetchActiveSessions(true) // Show loading on initial load

    // Setup socket.io for real-time updates
    const socket = getSocket()

    socket.on('billing:closed', () => {
      // When a billing is closed, refresh sessions silently (no loading)
      fetchActiveSessions(false)
    })

    socket.on('session:opened', () => {
      // When a new session is opened, refresh sessions silently (no loading)
      fetchActiveSessions(false)
    })

    socket.on('order:new', () => {
      // When a new order is created, refresh to update order count silently (no loading)
      fetchActiveSessions(false)
    })

    return () => {
      socket.off('billing:closed')
      socket.off('session:opened')
      socket.off('session:cancelled')
      socket.off('order:new')
    }
  }, [fetchActiveSessions])

  const handleCloseTable = async () => {
    if (!selectedSession) {
      Swal.fire({
        icon: 'warning',
        title: 'กรุณาเลือกโต๊ะ',
        text: 'กรุณาเลือกโต๊ะที่ต้องการปิด',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
      })
      return
    }

    const result = await Swal.fire({
      title: 'ยืนยันการปิดโต๊ะ',
      text: 'คุณต้องการปิดโต๊ะและสร้างบิลหรือไม่?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'ปิดโต๊ะ',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#FF6A8B',
    })

    if (!result.isConfirmed) return

    setClosing(true)

    try {
      const response = await fetch('/api/billing/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: parseInt(selectedSession, 10),
          paymentMethod,
          extraChargeIds: selectedExtraCharges,
          promotionId: selectedPromotionId ? parseInt(selectedPromotionId, 10) : null,
          discountType: discountType || null,
          discountValue: discountValue ? parseFloat(discountValue) : null,
          vatRate: vatRate ? parseFloat(vatRate) : null,
          receivedAmount: receivedAmount ? parseFloat(receivedAmount) : null,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to close table')
      }

      const data = await response.json()
      const billing = data.billing

      const paymentMethodText = paymentMethod === 'CASH' ? 'เงินสด' : 'QR Code'
      Swal.fire({
        icon: 'success',
        title: 'ปิดโต๊ะสำเร็จ',
        text: `ยอดรวม: ${billing.subtotal.toFixed(2)} บาท | ค่าบริการ: ${billing.extraCharge.toFixed(2)} บาท | ส่วนลด: ${billing.discount.toFixed(2)} บาท | ยอดสุทธิ: ${billing.grandTotal.toFixed(2)} บาท | วิธีชำระ: ${paymentMethodText}`,
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 5000,
        timerProgressBar: true,
      })

      // Reset form
      resetForm()
      
      // Refresh sessions
      fetchActiveSessions()
    } catch (error: any) {
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: error.message || 'ไม่สามารถปิดโต๊ะได้',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
      })
    } finally {
      setClosing(false)
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('th-TH', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getDuration = (startTime: string) => {
    const start = new Date(startTime)
    const now = new Date()
    const diff = Math.floor((now.getTime() - start.getTime()) / 1000 / 60) // minutes
    const hours = Math.floor(diff / 60)
    const minutes = diff % 60
    return `${hours} ชม. ${minutes} นาที`
  }

  // Helper function to get extra charge IDs from session
  const getSessionExtraChargeIds = (session: ActiveSession): number[] => {
    return Array.isArray(session.extraChargeIds) ? session.extraChargeIds : []
  }

  // Calculate billing preview
  const [billingPreview, setBillingPreview] = useState<{
    subtotal: number
    extraCharge: number
    discount: number
    vat: number
    vatRate: number
    grandTotal: number
  } | null>(null)

  useEffect(() => {
    if (!selectedSession) {
      setBillingPreview(null)
      return
    }

    const fetchPreview = async () => {
      try {
        const response = await fetch('/api/billing/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: parseInt(selectedSession, 10),
            extraChargeIds: selectedExtraCharges,
            promotionId: selectedPromotionId ? parseInt(selectedPromotionId, 10) : null,
            discountType: discountType || null,
            discountValue: discountValue ? parseFloat(discountValue) : null,
            vatRate: vatRate ? parseFloat(vatRate) : null,
          }),
        })

        if (response.ok) {
          const data = await response.json()
          setBillingPreview(data)
        }
      } catch (error) {
        console.error('Error fetching billing preview:', error)
      }
    }

    // Debounce preview fetch
    const timeoutId = setTimeout(fetchPreview, 300)
    return () => clearTimeout(timeoutId)
  }, [selectedSession, selectedExtraCharges, selectedPromotionId, discountType, discountValue, vatRate])

  // Calculate change
  const change = useMemo(() => {
    if (!billingPreview || paymentMethod !== 'CASH' || !receivedAmount) return null
    const received = parseFloat(receivedAmount) || 0
    return Math.max(0, received - billingPreview.grandTotal)
  }, [billingPreview, paymentMethod, receivedAmount])

  // Cash button denominations
  const cashButtons = [1000, 500, 100, 50, 20, 10, 5, 2, 1]

  // Handle cash button click
  const handleCashButtonClick = (amount: number) => {
    const current = parseFloat(receivedAmount) || 0
    setReceivedAmount((current + amount).toString())
  }

  // Handle session selection
  const handleSelectSession = (sessionId: string) => {
    setSelectedSession(sessionId)
    const session = sessions.find(s => s.id.toString() === sessionId)
    if (session) {
      setSelectedExtraCharges(getSessionExtraChargeIds(session))
    }
  }

  // Reset form
  const resetForm = () => {
    setSelectedSession('')
    setPaymentMethod('CASH')
    setSelectedExtraCharges([])
    setSelectedPromotionId('')
    setDiscountType('')
    setDiscountValue('')
    setVatRate('')
    setReceivedAmount('')
  }

  // Helper function to check if session can be cancelled
  const canCancelSession = (session: ActiveSession): boolean => {
    // Can cancel if no orders at all
    return session._count.orders === 0
  }

  const handleCancelSession = async (session: ActiveSession, e: React.MouseEvent) => {
    e.stopPropagation()

    if (!canCancelSession(session)) {
      Swal.fire({
        icon: 'warning',
        title: 'ไม่สามารถยกเลิกได้',
        text: 'Session นี้มีออเดอร์อยู่แล้ว กรุณาปิดบิลแทน',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
      })
      return
    }

    const result = await Swal.fire({
      title: 'ยืนยันการยกเลิก',
      html: `
        <div class="text-left">
          <p class="mb-2">คุณต้องการยกเลิก session นี้หรือไม่?</p>
          <div class="mt-3 space-y-1 text-sm">
            <p><strong>โต๊ะ:</strong> ${session.table.name}</p>
            <p><strong>จำนวนคน:</strong> ${session.peopleCount} คน</p>
            ${session.package ? `<p><strong>แพ็กเกจ:</strong> ${session.package.name}</p>` : ''}
            <p><strong>ออเดอร์:</strong> ${session._count.orders} ออเดอร์</p>
          </div>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'ยกเลิก Session',
      cancelButtonText: 'ไม่ยกเลิก',
      confirmButtonColor: '#FF8C42',
      cancelButtonColor: '#6B7280',
    })

    if (!result.isConfirmed) return

    setCancelling(session.id)

    try {
      const response = await fetch('/api/session/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.id,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to cancel session')
      }

      Swal.fire({
        icon: 'success',
        title: 'ยกเลิกสำเร็จ',
        text: `ยกเลิก session สำหรับ ${session.table.name} เรียบร้อยแล้ว`,
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
      })

      // Refresh sessions silently
      fetchActiveSessions(false)
    } catch (error: any) {
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: error.message || 'ไม่สามารถยกเลิก session ได้',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
      })
    } finally {
      setCancelling(null)
    }
  }


  if (loading) {
    return (
      <div>
        <Skeleton className="h-7 w-32 mb-4 sm:mb-6" />
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6">
          {/* Sessions List Skeleton */}
          <div className="lg:col-span-2 space-y-3">
            {[...Array(3)].map((_, i) => (
              <SessionCardSkeleton key={i} />
            ))}
          </div>
          {/* Billing Form Skeleton */}
          <div className="lg:col-span-3">
            <BillingFormSkeleton />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">
        {t('admin.close_table')}
      </h1>

      {sessions.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Receipt className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">ไม่มีโต๊ะที่เปิดอยู่</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6">
          {/* Active Sessions List */}
          <div className="lg:col-span-2 space-y-3">
            {sessions.map((session) => (
              <Card
                key={session.id}
                className={`cursor-pointer transition-all duration-500 ${
                  selectedSession === session.id.toString()
                    ? 'ring-2 ring-primary'
                    : ''
                } ${
                  newSessionIds.has(session.id)
                    ? 'ring-2 ring-success bg-success/10 shadow-lg scale-[1.02]'
                    : ''
                } animate-in fade-in slide-in-from-top-2`}
                onClick={() => {
                  handleSelectSession(session.id.toString())
                }}
              >
                <CardHeader className="p-4">
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <CardTitle className="text-base font-semibold truncate">
                          {session.table.name}
                        </CardTitle>
                        {canCancelSession(session) && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-warning/90 dark:bg-warning/10 text-warning-foreground dark:text-warning border border-warning dark:border-warning/20 shrink-0">
                            <AlertCircle className="w-3 h-3" />
                            ยังไม่มีออเดอร์
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          <span>{session.peopleCount} คน</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{getDuration(session.startTime)}</span>
                        </div>
                        {session.package && (
                          <div className="flex items-center gap-1">
                            <PackageIcon className="w-3 h-3" />
                            <span className="truncate">{session.package.name}</span>
                          </div>
                        )}
                        <div className="text-primary font-medium">
                          {session._count.orders} ออเดอร์
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      {canCancelSession(session) && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2 text-xs border-warning dark:border-warning/60 bg-warning/90 dark:bg-warning/10 text-warning-foreground dark:text-warning font-medium hover:bg-warning dark:hover:bg-warning/20 hover:border-warning dark:hover:border-warning/80"
                          onClick={(e) => handleCancelSession(session, e)}
                          disabled={cancelling === session.id}
                        >
                          {cancelling === session.id ? (
                            <>
                              <div className="animate-spin rounded-full h-2.5 w-2.5 border-b-2 border-warning-foreground dark:border-warning/80 mr-1"></div>
                              <span className="hidden sm:inline">ยกเลิก</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3 sm:mr-1" />
                              <span className="hidden sm:inline">ยกเลิก</span>
                            </>
                          )}
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-xs border-border/80 hover:border-primary/50 hover:text-primary"
                        onClick={(e) => {
                          e.stopPropagation()
                          window.open(`/api/qr/pdf?sessionId=${session.id}`, '_blank')
                        }}
                      >
                        <QrCode className="w-3 h-3 sm:mr-1" />
                        <span className="hidden sm:inline">QR</span>
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>

          {/* Close Table Form */}
          <div className="lg:col-span-3">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle>ปิดโต๊ะ</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
              {selectedSession && (() => {
                const session = sessions.find(s => s.id.toString() === selectedSession)
                if (!session) return null
                
                return (
                  <div className="flex justify-between items-center mb-2 pb-2 border-b">
                    <div>
                      <p className="font-medium">{session.table.name}</p>
                      <p className="text-sm text-muted-foreground">{session.peopleCount} คน</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        window.open(`/api/qr/pdf?sessionId=${selectedSession}`, '_blank')
                      }}
                    >
                      <QrCode className="w-3 h-3 mr-1" />
                      พิมพ์ QR Code
                    </Button>
                  </div>
                )
              })()}

              <div className="grid gap-2">
                <label className="text-sm font-medium">วิธีการชำระเงิน *</label>
                <Select
                  value={paymentMethod}
                  onValueChange={setPaymentMethod}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH">เงินสด</SelectItem>
                    <SelectItem value="QR">QR Code</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {extraCharges.length > 0 && (
                <div className="grid gap-2">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-medium">ค่าบริการเพิ่มเติม</label>
                    {selectedSession && (() => {
                      const session = sessions.find(s => s.id.toString() === selectedSession)
                      if (!session) return null
                      
                      const sessionExtraChargeIds = getSessionExtraChargeIds(session)
                      const hasChanges = JSON.stringify([...sessionExtraChargeIds].sort()) !== JSON.stringify([...selectedExtraCharges].sort())
                      return hasChanges ? (
                        <span className="text-xs text-muted-foreground">(แก้ไขจากที่เลือกตอนเปิดโต๊ะ)</span>
                      ) : sessionExtraChargeIds.length > 0 ? (
                        <span className="text-xs text-muted-foreground">(จากที่เลือกตอนเปิดโต๊ะ)</span>
                      ) : null
                    })()}
                  </div>
                  <div className="space-y-2 border rounded-lg p-3 max-h-48 overflow-y-auto">
                    {extraCharges.map((extraCharge) => {
                      const isSelected = selectedExtraCharges.includes(extraCharge.id)
                      const selectedSessionData = sessions.find(s => s.id.toString() === selectedSession)
                      const peopleCount = selectedSessionData?.peopleCount || 0
                      
                      const chargeLabel = extraCharge.chargeType === 'PER_PERSON'
                        ? `ต่อคน`
                        : `ต่อเซสชัน`
                      
                      const totalAmount = extraCharge.chargeType === 'PER_PERSON'
                        ? extraCharge.price * peopleCount
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
                            </p>
                            {isSelected && selectedSession && (
                              <p className="text-xs text-primary font-semibold mt-0.5">
                                รวม: {totalAmount.toLocaleString()} บาท
                              </p>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Discount Section */}
              <div className="grid gap-2">
                <label className="text-sm font-medium">ส่วนลด</label>
                <div className="space-y-2">
                  <Select
                    value={selectedPromotionId || 'none'}
                    onValueChange={(value) => {
                      if (value === 'none') {
                        setSelectedPromotionId('')
                      } else {
                        setSelectedPromotionId(value)
                      }
                      setDiscountType('')
                      setDiscountValue('')
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="เลือกโปรโมชั่น (ถ้ามี)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">ไม่มีโปรโมชั่น</SelectItem>
                      {promotions.map((promo) => (
                        <SelectItem key={promo.id} value={promo.id.toString()}>
                          {promo.name} ({promo.type === 'PERCENT' ? `${promo.value}%` : `${promo.value.toLocaleString()} บาท`})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  {!selectedPromotionId && (
                    <div className="grid grid-cols-2 gap-2">
                      <Select
                        value={discountType || undefined}
                        onValueChange={(value) => {
                          setDiscountType(value as 'PERCENT' | 'FIXED')
                          setDiscountValue('')
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="ประเภท" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PERCENT">%</SelectItem>
                          <SelectItem value="FIXED">บาท</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        placeholder={discountType === 'PERCENT' ? 'เปอร์เซ็นต์' : 'จำนวนเงิน'}
                        value={discountValue}
                        onChange={(e) => setDiscountValue(e.target.value)}
                        disabled={!discountType}
                        min="0"
                        step={discountType === 'PERCENT' ? '0.01' : '1'}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* VAT Section */}
              <div className="grid gap-2">
                <label className="text-sm font-medium">ภาษีมูลค่าเพิ่ม (VAT)</label>
                <Input
                  type="number"
                  placeholder="เช่น 7 สำหรับ 7%"
                  value={vatRate}
                  onChange={(e) => setVatRate(e.target.value)}
                  min="0"
                  max="100"
                  step="0.01"
                />
              </div>

              {/* Cash Payment: Received Amount */}
              {paymentMethod === 'CASH' && (
                <div className="grid gap-2">
                  <label className="text-sm font-medium">รับเงิน</label>
                  <Input
                    type="number"
                    placeholder="จำนวนเงินที่รับ"
                    value={receivedAmount}
                    onChange={(e) => setReceivedAmount(e.target.value)}
                    min="0"
                    step="0.01"
                    className="text-lg font-semibold"
                  />
                  {/* Cash Buttons */}
                  <div className="grid grid-cols-5 gap-2 mt-2">
                    {cashButtons.map((amount) => (
                      <Button
                        key={amount}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleCashButtonClick(amount)}
                        className="font-semibold hover:bg-primary hover:text-primary-foreground transition-colors"
                      >
                        {amount.toLocaleString()}
                      </Button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">กดปุ่มเพื่อเพิ่มจำนวนเงิน</p>
                </div>
              )}

              {/* Billing Summary */}
              {billingPreview && selectedSession && (() => {
                const session = sessions.find(s => s.id.toString() === selectedSession)
                if (!session) return null
                
                return (
                  <div className="border rounded-lg p-4 space-y-2 bg-muted/30">
                    {/* Session Info */}
                    <div className="pb-2 mb-2 border-b">
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>จำนวนคน</span>
                        <span>{session.peopleCount} คน</span>
                      </div>
                      {session.package && (
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>แพ็กเกจ</span>
                          <span>{session.package.name} ({session.package.pricePerPerson.toFixed(2)} บาท/คน)</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Billing Breakdown */}
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">ราคารวม</span>
                      <span className="font-medium">{billingPreview.subtotal.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท</span>
                    </div>
                    {billingPreview.extraCharge > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">ค่าบริการเพิ่มเติม</span>
                        <span className="font-medium">{billingPreview.extraCharge.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท</span>
                      </div>
                    )}
                    {billingPreview.discount > 0 && (
                      <div className="flex justify-between text-sm text-success">
                        <span>ส่วนลด</span>
                        <span className="font-medium">-{billingPreview.discount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท</span>
                      </div>
                    )}
                    {billingPreview.vat > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">VAT ({billingPreview.vatRate}%)</span>
                        <span className="font-medium">{billingPreview.vat.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท</span>
                      </div>
                    )}
                    <div className="border-t pt-2 mt-2">
                      <div className="flex justify-between text-base font-bold">
                        <span>ยอดสุทธิ</span>
                        <span className="text-primary">{billingPreview.grandTotal.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท</span>
                      </div>
                    </div>
                    {paymentMethod === 'CASH' && receivedAmount && change !== null && (
                      <div className="flex justify-between text-sm mt-2 pt-2 border-t">
                        <span className="text-muted-foreground">รับเงิน</span>
                        <span className="font-medium">{parseFloat(receivedAmount).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท</span>
                      </div>
                    )}
                    {paymentMethod === 'CASH' && change !== null && (
                      <div className="flex justify-between text-base font-semibold text-success">
                        <span>ทอน</span>
                        <span>{change.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท</span>
                      </div>
                    )}
                  </div>
                )
              })()}

              <Button
                onClick={handleCloseTable}
                disabled={!selectedSession || closing || (paymentMethod === 'CASH' && (!receivedAmount || change === null || change < 0))}
                className="w-full"
              >
                {closing ? 'กำลังปิดโต๊ะ...' : 'ปิดโต๊ะและสร้างบิล'}
              </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
