import type { Product } from './types'

export function readStorage<T>(key: string): T | null {
  try {
    const saved = localStorage.getItem(key)
    return saved ? JSON.parse(saved) : null
  } catch {
    return null
  }
}

export function formatMoney(amount: number | string, currency = 'VND') {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    // VND defaults to 0 decimals; keep stored cents visible instead of rounding them away
    maximumFractionDigits: 2,
  }).format(Number(amount))
}

export const minPrice = (p: Product) => Math.min(...p.variants.map((v) => Number(v.price)))
export const soldOut = (p: Product) => p.variants.every((v) => v.stock <= 0)
// "Sale" when any variant shows a higher compare-at price
export const onSale = (p: Product) => p.variants.some((v) => v.compareAtPrice && Number(v.compareAtPrice) > Number(v.price))
export const variantLabel = (v: { optionValues: Record<string, string> }) => Object.values(v.optionValues).join(' / ')
