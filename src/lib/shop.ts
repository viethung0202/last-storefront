import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { apiRequest } from './api'
import { readStorage, variantLabel } from './format'
import type { Collection, LastOrder, Product, Store, Variant } from './types'

export type CartLine = { variant: Variant; product: Product; quantity: number; label: string }

// Cart persists only {variantId, quantity}; name/price/stock are derived from live products,
// so renamed, repriced or deleted variants are handled for free.
export function useCart(slug: string, products: Product[]) {
  const key = `hula.cart.v3.${slug}`
  const [items, setItems] = useState<Array<{ variantId: string; quantity: number }>>(() => readStorage(key) ?? [])
  const save = (next: typeof items) => {
    setItems(next)
    localStorage.setItem(key, JSON.stringify(next))
  }

  const lines = useMemo<CartLine[]>(
    () =>
      items.flatMap((item) => {
        const product = products.find((p) => p.variants.some((v) => v.id === item.variantId))
        const variant = product?.variants.find((v) => v.id === item.variantId)
        const quantity = variant ? Math.min(item.quantity, variant.stock) : 0
        return product && variant && quantity > 0
          ? [{ product, variant, quantity, label: variantLabel(variant) }]
          : []
      }),
    [items, products],
  )
  const subtotal = lines.reduce((sum, l) => sum + Number(l.variant.price) * l.quantity, 0)
  const count = lines.reduce((sum, l) => sum + l.quantity, 0)

  return {
    lines,
    subtotal,
    count,
    add(variant: Variant, quantity: number) {
      const have = items.find((i) => i.variantId === variant.id)?.quantity ?? 0
      const next = Math.min(have + quantity, variant.stock)
      save([...items.filter((i) => i.variantId !== variant.id), { variantId: variant.id, quantity: next }])
    },
    setQuantity(variantId: string, quantity: number) {
      save(items.map((i) => (i.variantId === variantId ? { ...i, quantity: Math.max(1, quantity) } : i)))
    },
    remove: (variantId: string) => save(items.filter((i) => i.variantId !== variantId)),
    clear: () => save([]),
  }
}

// Applied discount code; re-checked against the server whenever the subtotal changes.
export function useDiscount(slug: string, subtotal: number) {
  const [code, setCode] = useState('')
  const [amount, setAmount] = useState(0)
  const [error, setError] = useState('')

  const check = (c: string) =>
    apiRequest<{ code: string; amount: string }>(`/stores/${slug}/discounts/validate`, {
      method: 'POST',
      body: JSON.stringify({ code: c, subtotal: subtotal.toFixed(2) }),
    })

  useEffect(() => {
    if (!code) return
    check(code)
      .then((d) => setAmount(Number(d.amount)))
      .catch((e: Error) => {
        setCode('')
        setAmount(0)
        setError(e.message)
      })
  }, [subtotal])

  return {
    code,
    amount,
    error,
    async apply(input: string) {
      setError('')
      try {
        const d = await check(input)
        setCode(d.code)
        setAmount(Number(d.amount))
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Invalid code')
      }
    },
    clear() {
      setCode('')
      setAmount(0)
      setError('')
    },
  }
}

export type Shop = {
  store: Store
  products: Product[] // ACTIVE only
  collections: Collection[]
  money: (amount: number | string) => string
  cart: ReturnType<typeof useCart>
  discount: ReturnType<typeof useDiscount>
  openCart: () => void
  refetchProducts: () => void
  lastOrder: LastOrder | null
  setLastOrder: (order: LastOrder) => void
}

export const ShopContext = createContext<Shop>(null as unknown as Shop)
export const useShop = () => useContext(ShopContext)
