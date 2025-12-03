import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface CartItem {
  menuItemId: number
  name: string
  price: number
  qty: number
  note?: string
  itemType?: 'BUFFET_INCLUDED' | 'A_LA_CARTE' // เพิ่ม itemType
}

interface CartStore {
  items: CartItem[]
  addItem: (item: Omit<CartItem, 'qty'> & { qty?: number }) => void
  removeItem: (menuItemId: number) => void
  updateItem: (menuItemId: number, qty: number, note?: string) => void
  clearCart: () => void
  getTotal: () => number
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item) => {
        const existingItem = get().items.find(
          (i) => i.menuItemId === item.menuItemId
        )
        if (existingItem) {
          set({
            items: get().items.map((i) =>
              i.menuItemId === item.menuItemId
                ? { ...i, qty: i.qty + (item.qty || 1) }
                : i
            ),
          })
        } else {
          set({
            items: [...get().items, { ...item, qty: item.qty || 1 }],
          })
        }
      },
      removeItem: (menuItemId) => {
        set({
          items: get().items.filter((i) => i.menuItemId !== menuItemId),
        })
      },
      updateItem: (menuItemId, qty, note) => {
        if (qty <= 0) {
          get().removeItem(menuItemId)
          return
        }
        set({
          items: get().items.map((i) =>
            i.menuItemId === menuItemId
              ? { ...i, qty, note: note !== undefined ? note : i.note }
              : i
          ),
        })
      },
      clearCart: () => {
        set({ items: [] })
      },
      getTotal: () => {
        return get().items.reduce(
          (total, item) => {
            // ถ้าเป็น BUFFET_INCLUDED = ฟรี (ไม่คิดเงิน)
            const itemPrice = item.itemType === 'BUFFET_INCLUDED' ? 0 : item.price
            return total + itemPrice * item.qty
          },
          0
        )
      },
    }),
    {
      name: 'cart-storage',
    }
  )
)

