export type Store = { id: string; slug: string; name: string; currency: string; status?: 'ACTIVE' | 'SUSPENDED' }

export type Collection = { id: string; name: string; slug: string }

export type Variant = {
  id: string
  sku: string | null
  price: string
  compareAtPrice: string | null
  stock: number
  optionValues: Record<string, string>
}

export type Product = {
  id: string
  name: string
  description: string | null
  vendor: string | null
  tags: string[]
  seoTitle: string | null
  seoDescription: string | null
  status: 'DRAFT' | 'ACTIVE'
  createdAt: string
  category: { slug: string; name: string } | null
  collections: Array<{ collection: Collection }>
  images: Array<{ id: string; url: string; alt: string | null }>
  options: Array<{ id: string; name: string; values: Array<{ id: string; value: string }> }>
  variants: Variant[]
}

export type PaymentMethod = 'COD' | 'VNPAY'

export type Order = {
  id: string
  status: string
  subtotal: string
  discountCode: string | null
  discountAmount: string
  total: string
  items: Array<{ id: string; productNameSnapshot: string; variantLabelSnapshot: string; unitPrice: string; quantity: number }>
  payments: Array<{ method: PaymentMethod; status: string }>
  paymentUrl?: string | null
}

export type LastOrder = { slug: string; id: string; email: string }
