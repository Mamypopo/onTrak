'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { determineItemType } from '@/lib/menu-item-type'
import { useSearchParams, useRouter } from 'next/navigation'
import { Plus, Minus, ShoppingCart, CheckCircle2, Filter, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useTranslations } from '@/lib/i18n'
import { useCartStore } from '@/store/cart-store'
import { LanguageSwitcher } from '@/components/language-switcher'
import { ThemeToggle } from '@/components/theme-toggle'
import { getSocket } from '@/lib/socket-client'
import Swal from 'sweetalert2'
import { CategorySkeleton } from '@/components/skeletons'
import { Skeleton } from '@/components/ui/skeleton'

interface MenuItem {
  id: number
  name: string
  description?: string | null
  price: number
  imageUrl?: string
  isAvailable: boolean
  isBuffetItem?: boolean
  isALaCarteItem?: boolean
  isFreeInBuffet?: boolean
  isFeatured?: boolean
  isPopular?: boolean
}

interface Category {
  id: number
  name: string
  items: MenuItem[]
}

export default function MenuPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const t = useTranslations()
  const sessionId = searchParams.get('session')
  const [categories, setCategories] = useState<Category[]>([])
  const [sessionType, setSessionType] = useState<'buffet' | 'a_la_carte'>('a_la_carte')
  const [loading, setLoading] = useState(true)
  const { addItem, items, getTotal } = useCartStore()
  const [itemQuantities, setItemQuantities] = useState<Record<number, number>>({})
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [itemNote, setItemNote] = useState<string>('')
  const [isExpired, setIsExpired] = useState(false)
  const hasLoadedRef = useRef(false) // ติดตามว่าโหลดครั้งแรกเสร็จแล้วหรือยัง
  const fetchingRef = useRef(false) // ป้องกันการเรียก fetchMenu พร้อมกันหลายครั้ง
  const lastSessionIdRef = useRef<string | null>(null) // ติดตาม sessionId ที่ fetch แล้ว
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null) // สำหรับ debounce socket event

  const fetchMenu = useCallback(async (silent = false) => {
    // ป้องกันการเรียกซ้ำถ้ากำลัง fetch อยู่แล้ว
    if (fetchingRef.current) {
      return
    }

    try {
      fetchingRef.current = true
      if (!silent) {
        setLoading(true)
      }
      const sessionIdNum = sessionId ? parseInt(sessionId, 10) : null
      const url = sessionIdNum
        ? `/api/menu?sessionId=${sessionIdNum}`
        : '/api/menu'
      
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error('Failed to fetch menu')
      }
      const data = await response.json()
      setCategories(data.categories || [])
      setSessionType(data.sessionType || 'a_la_carte')
      // Check if session is expired
      if (data.isExpired) {
        setIsExpired(true)
      } else {
        setIsExpired(false)
      }
      if (!silent) {
        hasLoadedRef.current = true // บันทึกว่าโหลดครั้งแรกเสร็จแล้ว
        lastSessionIdRef.current = sessionId // บันทึก sessionId ที่ fetch แล้ว
      }
    } catch (error) {
      console.error('Error fetching menu:', error)
      // Could add error state here if needed
    } finally {
      fetchingRef.current = false
      if (!silent) {
        setLoading(false)
      }
    }
  }, [sessionId])

  useEffect(() => {
    if (!sessionId) {
      router.push('/')
      return
    }

    // เรียก fetchMenu เฉพาะเมื่อ sessionId เปลี่ยน (ไม่ใช่แค่ re-render)
    const shouldFetch = lastSessionIdRef.current !== sessionId
    if (shouldFetch) {
      hasLoadedRef.current = false // รีเซ็ต flag เมื่อ sessionId เปลี่ยน
      lastSessionIdRef.current = sessionId // อัพเดท sessionId ที่จะ fetch
      fetchMenu()
    }

    // Setup socket listener for real-time updates
    const socket = getSocket()
    const handleMenuUnavailable = () => {
      // Silently update menu when availability changes (no loading spinner)
      // ใช้ debounce เพื่อป้องกันการ update หลายครั้งติดกัน
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
      debounceTimeoutRef.current = setTimeout(() => {
        fetchMenu(true)
      }, 200)
    }
    socket.on('menu:unavailable', handleMenuUnavailable)

    // Setup mobile detection
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)

    // Cleanup
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
        debounceTimeoutRef.current = null
      }
      socket.off('menu:unavailable', handleMenuUnavailable)
      window.removeEventListener('resize', checkMobile)
    }
  }, [sessionId, fetchMenu, router])

  // Get quantity to add (from local state only, default to 1)
  // ไม่ sync กับ cart เพื่อให้ผู้ใช้เลือกจำนวนใหม่ได้เสมอ
  const getQuantity = (menuItemId: number) => {
    return itemQuantities[menuItemId] || 1
  }

  // Get quantity in cart for an item
  const getCartQuantity = (menuItemId: number) => {
    const cartItem = items.find(i => i.menuItemId === menuItemId)
    return cartItem ? cartItem.qty : 0
  }

  // Get total items in cart
  const getTotalCartItems = () => {
    return items.reduce((total, item) => total + item.qty, 0)
  }

  const updateQuantity = (menuItemId: number, delta: number) => {
    const currentQty = getQuantity(menuItemId)
    const newQty = Math.max(1, currentQty + delta)
    setItemQuantities(prev => ({ ...prev, [menuItemId]: newQty }))
  }

  const setQuantity = (menuItemId: number, qty: number) => {
    const newQty = Math.max(1, qty)
    setItemQuantities(prev => ({ ...prev, [menuItemId]: newQty }))
  }

  const handleItemClick = (item: MenuItem) => {
    if (!item.isAvailable) return
    setSelectedItem(item)
    setIsDetailOpen(true)
    // Set initial quantity to 1 if not set
    if (!itemQuantities[item.id]) {
      setItemQuantities(prev => ({ ...prev, [item.id]: 1 }))
    }
    // Reset note when opening new item
    setItemNote('')
  }

  const handleAddToCart = (item: MenuItem) => {
    if (!item.isAvailable) {
      Swal.fire({
        icon: 'warning',
        title: 'สินค้าไม่พร้อมให้บริการ',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
      })
      return
    }

    // Block if session is expired
    if (isExpired) {
      Swal.fire({
        icon: 'warning',
        title: 'Session หมดอายุแล้ว',
        text: 'ไม่สามารถสั่งอาหารได้ กรุณาติดต่อพนักงาน',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
      })
      return
    }

    const qty = getQuantity(item.id)

    // กำหนด itemType ตาม session type และ item properties
    const itemType = determineItemType(sessionType, item)

    addItem({
      menuItemId: item.id,
      name: item.name,
      price: itemType === 'BUFFET_INCLUDED' ? 0 : item.price, // ฟรีถ้าเป็น BUFFET_INCLUDED
      qty,
      itemType,
      note: itemNote.trim() || undefined,
    })

    // Reset quantity to 1 after adding (ไม่ใช้จำนวนจาก cart)
    setItemQuantities(prev => ({ ...prev, [item.id]: 1 }))

    Swal.fire({
      icon: 'success',
      title: t('menu.items_added', { qty }),
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
    })

    // Close detail view after adding
    setIsDetailOpen(false)
    setSelectedItem(null)
    setItemNote('')
  }


  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-20 sm:pb-24">
        <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex justify-between items-center mb-4 sm:mb-6 gap-2">
            <Skeleton className="h-7 w-32" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-9 w-9 rounded" />
              <Skeleton className="h-9 w-9 rounded" />
            </div>
          </div>
          {[...Array(3)].map((_, i) => (
            <CategorySkeleton key={i} />
          ))}
        </div>
      </div>
    )
  }

  const totalCartItems = getTotalCartItems()

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-24">
      <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Button
              onClick={() => router.push(`/session/${sessionId}`)}
              variant="ghost"
              className="flex-shrink-0 text-sm sm:text-base"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">{t('common.back')}</span>
            </Button>
            <h1 className="text-xl sm:text-2xl font-bold truncate">{t('menu.title')}</h1>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder={t('menu.filter_category')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('menu.all_categories')}</SelectItem>
                {categories.map((category) => {
                  const hasItems = sessionType === 'buffet'
                    ? category.items.some(item => item.isBuffetItem || (item.isALaCarteItem && !item.isBuffetItem))
                    : category.items.some(item => item.isALaCarteItem)
                  if (!hasItems) return null
                  return (
                    <SelectItem key={category.id} value={category.id.toString()}>
                      {category.name}
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
            <ThemeToggle />
            <LanguageSwitcher />
            {/* Cart Button - Hidden on mobile (footer handles it), shown on desktop */}
            <Button
              onClick={() => router.push(`/cart?session=${sessionId}`)}
              variant="outline"
              size="icon"
              className="relative flex-shrink-0 hidden md:flex"
            >
              <ShoppingCart className="w-5 h-5" />
              {totalCartItems > 0 && (
                <span className="absolute -top-2 -right-2 inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                  {totalCartItems > 99 ? '99+' : totalCartItems}
                </span>
              )}
            </Button>
          </div>
        </div>

        {/* All Categories */}
        {categories
          .filter((category) => {
            // กรองตามหมวดหมู่ที่เลือก
            if (selectedCategory !== 'all') {
              return category.id.toString() === selectedCategory
            }
            return true
          })
          .map((category) => {
            // กรอง items ตาม session type
            const filteredItems = sessionType === 'buffet'
              ? category.items.filter(item => item.isBuffetItem || item.isALaCarteItem)
              : category.items.filter(item => item.isALaCarteItem)

            // ถ้าไม่มี items ในหมวดนี้ ให้ข้าม
            if (filteredItems.length === 0) {
              return null
            }

            return (
              <div key={category.id} className={`mb-6 sm:mb-8 ${hasLoadedRef.current ? '' : 'animate-fade-in-up'}`}>
                <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-primary">{category.name}</h2>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  {filteredItems.map((item, itemIndex) => {
                    // ตรวจสอบว่าเป็นเมนูบุฟเฟ่ต์หรือไม่ (สำหรับแสดงราคา)
                    const isBuffetItem = sessionType === 'buffet' && item.isBuffetItem && !item.isALaCarteItem
                    
                    return (
                      <Card
                        key={item.id}
                        onClick={() => handleItemClick(item)}
                        className={`overflow-hidden transition-all duration-300 relative ${
                          hasLoadedRef.current ? '' : 'animate-fade-in-up'
                        } ${
                          !item.isAvailable 
                            ? 'opacity-60 cursor-not-allowed' 
                            : 'hover:shadow-lg hover:scale-[1.02] hover:border-primary/50 cursor-pointer hover-lift active-scale'
                        }`}
                        style={hasLoadedRef.current ? undefined : {
                          animationDelay: `${itemIndex * 0.03}s`
                        }}
                      >
                        {!item.isAvailable && (
                          <div className="absolute top-2 right-2 z-10">
                            <span className="inline-flex items-center px-2 py-1 rounded-md bg-destructive/90 text-destructive-foreground text-xs font-semibold shadow-sm">
                              {t('menu.out_of_stock')}
                            </span>
                          </div>
                        )}
                        <CardContent className="p-3 sm:p-4">
                          <div className="flex gap-3 sm:gap-4">
                            {/* รูปภาพด้านซ้าย */}
                            {item.imageUrl ? (
                              <div className="w-24 h-24 sm:w-28 sm:h-28 flex-shrink-0 rounded-lg overflow-hidden bg-muted shadow-sm">
                                <img
                                  src={item.imageUrl}
                                  alt={item.name}
                                  className="w-full h-full object-cover transition-transform duration-200 hover:scale-110"
                                />
                              </div>
                            ) : (
                              <div className="w-24 h-24 sm:w-28 sm:h-28 flex-shrink-0 rounded-lg bg-muted/50 flex items-center justify-center">
                                <span className="text-muted-foreground text-xs">ไม่มีรูป</span>
                              </div>
                            )}
                            
                            {/* เนื้อหาด้านขวา */}
                            <div className="flex-1 min-w-0 flex flex-col justify-between">
                              <div className="flex-1">
                                <div className="flex items-start justify-between gap-2 mb-1.5">
                                  <h3 className="font-semibold text-sm sm:text-base line-clamp-2 flex-1 leading-tight">{item.name}</h3>
                                  {getCartQuantity(item.id) > 0 && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold flex-shrink-0 animate-in fade-in slide-in-from-top-1">
                                      <CheckCircle2 className="w-3 h-3" />
                                      {getCartQuantity(item.id)}
                                    </span>
                                  )}
                                </div>
                                {item.description && (
                                  <p className="text-xs text-muted-foreground line-clamp-2 mb-1.5 leading-relaxed">
                                    {item.description}
                                  </p>
                                )}
                                <p className="text-sm sm:text-base mb-2 sm:mb-3">
                                  {isBuffetItem ? (
                                    <span className="text-muted-foreground text-xs sm:text-sm">{t('menu.buffet_included')}</span>
                                  ) : (
                                    <span className="text-primary font-bold text-base sm:text-lg">฿{item.price.toLocaleString()}</span>
                                  )}
                                </p>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </div>
            )
          })}
      </div>

      {/* Menu Detail Sheet (Mobile) / Dialog (Desktop) */}
      {selectedItem && (
        <>
          {/* Mobile: Bottom Sheet */}
          <Sheet open={isDetailOpen && isMobile} onOpenChange={setIsDetailOpen}>
            <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl">
              <SheetHeader>
                <SheetTitle className="text-xl">{selectedItem.name}</SheetTitle>
                <SheetDescription>
                  {sessionType === 'buffet' && selectedItem.isBuffetItem && !selectedItem.isALaCarteItem
                    ? 'รวมในบุฟเฟ่ต์'
                    : `฿${selectedItem.price.toLocaleString()}`}
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-6">
                {selectedItem.imageUrl && (
                  <div className="w-full h-48 rounded-lg overflow-hidden bg-muted">
                    <img
                      src={selectedItem.imageUrl}
                      alt={selectedItem.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                {selectedItem.description && (
                  <div className="text-sm text-muted-foreground leading-relaxed">
                    {selectedItem.description}
                  </div>
                )}
                <div className="flex items-center justify-center gap-4">
                  <Button
                    onClick={() => updateQuantity(selectedItem.id, -1)}
                    variant="outline"
                    size="icon"
                    className="h-12 w-12"
                    disabled={getQuantity(selectedItem.id) <= 1}
                  >
                    <Minus className="w-5 h-5" />
                  </Button>
                  <span className="text-3xl font-bold w-16 text-center">
                    {getQuantity(selectedItem.id)}
                  </span>
                  <Button
                    onClick={() => updateQuantity(selectedItem.id, 1)}
                    variant="outline"
                    size="icon"
                    className="h-12 w-12"
                  >
                    <Plus className="w-5 h-5" />
                  </Button>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="item-note" className="text-sm">{t('menu.note_optional')}</Label>
                  <Input
                    id="item-note"
                    placeholder={t('menu.note_placeholder')}
                    value={itemNote}
                    onChange={(e) => setItemNote(e.target.value)}
                    className="text-sm"
                  />
                </div>
              </div>
              <SheetFooter className="mt-auto pt-4">
                <Button
                  onClick={() => handleAddToCart(selectedItem)}
                  className="w-full h-12 text-lg"
                  size="lg"
                  disabled={!selectedItem.isAvailable}
                >
                  <Plus className="w-5 h-5 mr-2" />
                  {t('menu.add_to_cart')}
                </Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>

          {/* Desktop: Dialog */}
          <Dialog open={isDetailOpen && !isMobile} onOpenChange={setIsDetailOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="text-2xl">{selectedItem.name}</DialogTitle>
                <DialogDescription className="text-lg">
                  {sessionType === 'buffet' && selectedItem.isBuffetItem && !selectedItem.isALaCarteItem
                    ? t('menu.buffet_included')
                    : `฿${selectedItem.price.toLocaleString()}`}
                </DialogDescription>
              </DialogHeader>
              <div className="mt-4 space-y-4">
                {selectedItem.imageUrl && (
                  <div className="w-full h-64 rounded-lg overflow-hidden bg-muted">
                    <img
                      src={selectedItem.imageUrl}
                      alt={selectedItem.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                {selectedItem.description && (
                  <div className="text-sm text-muted-foreground leading-relaxed">
                    {selectedItem.description}
                  </div>
                )}
                <div className="flex items-center justify-center gap-4">
                  <Button
                    onClick={() => updateQuantity(selectedItem.id, -1)}
                    variant="outline"
                    size="icon"
                    className="h-12 w-12"
                    disabled={getQuantity(selectedItem.id) <= 1}
                  >
                    <Minus className="w-5 h-5" />
                  </Button>
                  <span className="text-3xl font-bold w-16 text-center">
                    {getQuantity(selectedItem.id)}
                  </span>
                  <Button
                    onClick={() => updateQuantity(selectedItem.id, 1)}
                    variant="outline"
                    size="icon"
                    className="h-12 w-12"
                  >
                    <Plus className="w-5 h-5" />
                  </Button>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="item-note-desktop" className="text-sm">{t('menu.note_optional')}</Label>
                  <Input
                    id="item-note-desktop"
                    placeholder={t('menu.note_placeholder')}
                    value={itemNote}
                    onChange={(e) => setItemNote(e.target.value)}
                    className="text-sm"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={() => handleAddToCart(selectedItem)}
                  className="w-full h-12 text-lg"
                  size="lg"
                  disabled={!selectedItem.isAvailable}
                >
                  <Plus className="w-5 h-5 mr-2" />
                  {t('menu.add_to_cart')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  )
}

