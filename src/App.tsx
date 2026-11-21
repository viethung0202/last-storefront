import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { apiRequest, useMutation, useQuery } from './lib/api'
import './App.css'

type Store = {
  id: string
  slug: string
  name: string
  currency: string
}

// fashion.localhost / fashion.example.com -> resolve store by host; plain localhost/IP -> manual slug form
const storeHost = /^[\d.]+$/.test(location.hostname) || !location.hostname.includes('.')
  ? null
  : location.hostname

type ProductCategory = {
  slug: string
  name: string
}

type Collection = {
  id: string
  name: string
  slug: string
}

type Product = {
  id: string
  name: string
  description: string | null
  status: 'DRAFT' | 'ACTIVE'
  category: ProductCategory | null
  collections: Array<{ collection: Collection }>
  variants: Array<{
    id: string
    price: string
    stock: number
  }>
}

type CartItem = {
  productId: string
  variantId: string
  name: string
  price: number
  stock: number
  quantity: number
}

type PaymentMethod = 'COD' | 'VNPAY'

type Order = {
  id: string
  total: string
  status: string
  payments: Array<{ method: PaymentMethod; status: string }>
  paymentUrl?: string | null
}

type LastOrder = { slug: string; id: string; email: string }

function App() {
  const [storeSlug, setStoreSlug] = useState(
    () => localStorage.getItem('hula.storefront.slug') ?? '',
  )
  const [manualSlug, setManualSlug] = useState(storeSlug)
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null)
  const [activeCollectionId, setActiveCollectionId] = useState('ALL')
  const [cart, setCart] = useState<CartItem[]>(() => readStorage('hula.cart.v2') ?? [])
  const [checkoutForm, setCheckoutForm] = useState({
    guestName: '',
    guestEmail: '',
    paymentMethod: 'COD' as PaymentMethod,
  })
  const [lastOrder, setLastOrder] = useState<LastOrder | null>(() =>
    readStorage('hula.lastOrder'),
  )
  const [message, setMessage] = useState('')

  const storeQuery = useQuery<Store | null>(
    ['store', storeHost ?? manualSlug],
    () =>
      apiRequest<Store>(
        storeHost ? `/stores/by-host/${storeHost}` : `/stores/${manualSlug}`,
      ),
    { enabled: Boolean(storeHost ?? manualSlug), initialData: null },
  )
  const activeSlug = storeQuery.data?.slug ?? ''
  const money = (amount: number | string) =>
    formatMoney(amount, storeQuery.data?.currency ?? 'VND')

  const productsQuery = useQuery<Product[]>(
    ['products', activeSlug],
    () => apiRequest<Product[]>(`/stores/${activeSlug}/products`),
    { enabled: Boolean(activeSlug), initialData: [] },
  )

  const collectionsQuery = useQuery<Collection[]>(
    ['collections', activeSlug],
    () => apiRequest<Collection[]>(`/stores/${activeSlug}/collections`),
    { enabled: Boolean(activeSlug), initialData: [] },
  )

  const methodsQuery = useQuery<Record<PaymentMethod, boolean>>(
    ['payment-methods', activeSlug],
    () => apiRequest(`/stores/${activeSlug}/payment-methods`),
    { enabled: Boolean(activeSlug), initialData: { COD: false, VNPAY: false } },
  )
  const enabledMethods = (['COD', 'VNPAY'] as const).filter(
    (method) => methodsQuery.data[method],
  )

  // Shows the status the backend recorded (VNPAY: set by IPN). The ?vnp_* params
  // VNPAY appends on redirect are never trusted as proof of payment.
  const trackedOrder = lastOrder?.slug === activeSlug ? lastOrder : null
  const lastOrderQuery = useQuery<Order | null>(
    ['last-order', trackedOrder?.id],
    () =>
      apiRequest(
        `/stores/${activeSlug}/orders/${trackedOrder?.id}?email=${encodeURIComponent(trackedOrder?.email ?? '')}`,
      ),
    { enabled: Boolean(trackedOrder), initialData: null },
  )
  const returnedFromVnpay = new URLSearchParams(location.search).has('vnp_ResponseCode')

  const checkoutMutation = useMutation<
    typeof checkoutForm,
    Order
  >(
    (input) =>
      apiRequest(`/stores/${activeSlug}/orders`, {
        method: 'POST',
        body: JSON.stringify({
          guestName: input.guestName,
          guestEmail: input.guestEmail,
          paymentMethod: input.paymentMethod,
          returnUrl: `${location.origin}/`,
          items: cart.map((item) => ({
            variantId: item.variantId,
            quantity: item.quantity,
          })),
        }),
      }),
    {
      onSuccess: (order, input) => {
        const tracked = { slug: activeSlug, id: order.id, email: input.guestEmail }
        setLastOrder(tracked)
        localStorage.setItem('hula.lastOrder', JSON.stringify(tracked))
        setCart([])
        localStorage.removeItem('hula.cart.v2')
        if (order.paymentUrl) {
          location.href = order.paymentUrl
          return
        }
        setCheckoutForm({ ...checkoutForm, guestName: '', guestEmail: '' })
        productsQuery.refetch()
        setMessage(`Order ${order.id.slice(-6)} placed: ${money(order.total)}`)
      },
      onError: setMessage,
    },
  )

  const activeProducts = productsQuery.data.filter(
    (product) => product.status === 'ACTIVE',
  )
  const visibleProducts = activeProducts.filter(
    (product) =>
      activeCollectionId === 'ALL' ||
      product.collections.some(
        (item) => item.collection.id === activeCollectionId,
      ),
  )
  const selectedProduct =
    visibleProducts.find((product) => product.id === selectedProductId) ??
    visibleProducts[0]
  const cartTotal = useMemo(
    () =>
      cart.reduce(
        (total, item) => total + item.price * item.quantity,
        0,
      ),
    [cart],
  )

  function openStore(event: FormEvent) {
    event.preventDefault()
    const slug = storeSlug.trim()
    setManualSlug(slug)
    setSelectedProductId(null)
    setActiveCollectionId('ALL')
    setMessage('')
    localStorage.setItem('hula.storefront.slug', slug)
  }

  function addToCart(product: Product) {
    const variant = product.variants[0]
    if (!variant || variant.stock <= 0) {
      setMessage('This product is out of stock')
      return
    }
    const nextCart = cart.some((item) => item.variantId === variant.id)
      ? cart.map((item) =>
          item.variantId === variant.id
            ? {
                ...item,
                quantity: Math.min(item.quantity + 1, item.stock),
              }
            : item,
        )
      : [
          ...cart,
          {
            productId: product.id,
            variantId: variant.id,
            name: product.name,
            price: Number(variant.price),
            stock: variant.stock,
            quantity: 1,
          },
        ]
    saveCart(nextCart)
    setMessage(`${product.name} added to cart`)
  }

  function updateQuantity(variantId: string, quantity: number) {
    const nextCart = cart
      .map((item) =>
        item.variantId === variantId
          ? { ...item, quantity: Math.max(1, Math.min(quantity, item.stock)) }
          : item,
      )
      .filter((item) => item.quantity > 0)
    saveCart(nextCart)
  }

  function removeCartItem(variantId: string) {
    saveCart(cart.filter((item) => item.variantId !== variantId))
  }

  function saveCart(nextCart: CartItem[]) {
    setCart(nextCart)
    localStorage.setItem('hula.cart.v2', JSON.stringify(nextCart))
  }

  function checkout(event: FormEvent) {
    event.preventDefault()
    setMessage('')
    if (cart.length === 0) {
      setMessage('Cart is empty')
      return
    }
    checkoutMutation.mutate(checkoutForm).catch(() => undefined)
  }

  return (
    <main className="shop-shell">
      <header className="shop-header">
        <div>
          <p className="eyebrow">Hula Storefront</p>
          <h1>{storeQuery.data?.name ?? 'Open a store'}</h1>
        </div>
        {storeHost ? null : (
          <form onSubmit={openStore} className="store-form">
            <input
              value={storeSlug}
              onChange={(event) => setStoreSlug(event.target.value)}
              placeholder="store slug"
            />
            <button type="submit">Open</button>
          </form>
        )}
      </header>

      {message || storeQuery.error || productsQuery.error ? (
        <div className="notice">
          {message || storeQuery.error || productsQuery.error}
        </div>
      ) : null}

      {!activeSlug ? (
        <section className="hero-panel">
          <p className="eyebrow">Start shopping</p>
          <h2>Enter a store slug to browse products.</h2>
        </section>
      ) : (
        <section className="shop-grid">
          <section className="product-browser">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Products</p>
                <h2>{visibleProducts.length} active items</h2>
              </div>
              <button
                type="button"
                className="secondary"
                onClick={() => productsQuery.refetch()}
              >
                {productsQuery.isLoading ? 'Loading...' : 'Refresh'}
              </button>
            </div>
            <div className="collection-tabs">
              <button
                type="button"
                className={activeCollectionId === 'ALL' ? 'active' : ''}
                onClick={() => {
                  setActiveCollectionId('ALL')
                  setSelectedProductId(null)
                }}
              >
                All products
              </button>
              {collectionsQuery.data.map((collection) => (
                <button
                  type="button"
                  className={activeCollectionId === collection.id ? 'active' : ''}
                  key={collection.id}
                  onClick={() => {
                    setActiveCollectionId(collection.id)
                    setSelectedProductId(null)
                  }}
                >
                  {collection.name}
                </button>
              ))}
            </div>

            <div className="product-grid">
              {visibleProducts.map((product) => {
                const variant = product.variants[0]
                return (
                  <button
                    type="button"
                    className={
                      selectedProduct?.id === product.id
                        ? 'product-card selected'
                        : 'product-card'
                    }
                    key={product.id}
                    onClick={() => setSelectedProductId(product.id)}
                  >
                    <span className="product-thumb">
                      {(product.name || '?').slice(0, 1)}
                    </span>
                    <strong className="product-name">
                      {product.name || 'Unnamed product'}
                    </strong>
                    <span>{variant ? money(variant.price) : '-'}</span>
                    <small>{product.category?.name ?? 'No category'}</small>
                    <small>{variant?.stock ?? 0} in stock</small>
                  </button>
                )
              })}
              {visibleProducts.length === 0 ? (
                <div className="empty">
                  {activeProducts.length === 0
                    ? 'No active products in this store.'
                    : 'No products in this collection.'}
                </div>
              ) : null}
            </div>
          </section>

          <aside className="side-stack">
            <section className="panel detail-panel">
              {selectedProduct ? (
                <>
                  <p className="eyebrow">Product detail</p>
                  <h2>{selectedProduct.name}</h2>
                  <p>{selectedProduct.description || 'No description yet.'}</p>
                  <div className="meta-list">
                    <span>{selectedProduct.category?.name ?? 'No category'}</span>
                    <span>
                      {selectedProduct.collections.length
                        ? selectedProduct.collections
                            .map((item) => item.collection.name)
                            .join(', ')
                        : 'No collections'}
                    </span>
                  </div>
                  <div className="price-line">
                    <strong>
                      {money(selectedProduct.variants[0]?.price ?? 0)}
                    </strong>
                    <span>{selectedProduct.variants[0]?.stock ?? 0} in stock</span>
                  </div>
                  <button type="button" onClick={() => addToCart(selectedProduct)}>
                    Add to cart
                  </button>
                </>
              ) : (
                <div className="empty">Select a product to see details.</div>
              )}
            </section>

            <section className="panel cart-panel">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Cart</p>
                  <h2>{cart.length} items</h2>
                </div>
                <strong>{money(cartTotal)}</strong>
              </div>
              <div className="cart-list">
                {cart.map((item) => (
                  <article className="cart-row" key={item.variantId}>
                    <div>
                      <strong>{item.name}</strong>
                      <span>{money(item.price)}</span>
                    </div>
                    <input
                      inputMode="numeric"
                      value={item.quantity}
                      onChange={(event) =>
                        updateQuantity(item.variantId, Number(event.target.value))
                      }
                    />
                    <button
                      type="button"
                      className="ghost"
                      onClick={() => removeCartItem(item.variantId)}
                    >
                      Remove
                    </button>
                  </article>
                ))}
                {cart.length === 0 ? <div className="empty">Cart is empty.</div> : null}
              </div>

              <form onSubmit={checkout} className="checkout-form">
                <label>
                  Name
                  <input
                    value={checkoutForm.guestName}
                    onChange={(event) =>
                      setCheckoutForm({
                        ...checkoutForm,
                        guestName: event.target.value,
                      })
                    }
                  />
                </label>
                <label>
                  Email
                  <input
                    type="email"
                    value={checkoutForm.guestEmail}
                    onChange={(event) =>
                      setCheckoutForm({
                        ...checkoutForm,
                        guestEmail: event.target.value,
                      })
                    }
                  />
                </label>
                <fieldset className="payment-methods">
                  <legend>Payment</legend>
                  {enabledMethods.map((method) => (
                    <label key={method}>
                      <input
                        type="radio"
                        name="paymentMethod"
                        checked={checkoutForm.paymentMethod === method}
                        onChange={() =>
                          setCheckoutForm({ ...checkoutForm, paymentMethod: method })
                        }
                      />
                      {method === 'COD' ? 'Cash on delivery' : 'VNPAY'}
                    </label>
                  ))}
                  {enabledMethods.length === 0 ? (
                    <small>This store has no payment method enabled.</small>
                  ) : null}
                </fieldset>
                <button
                  type="submit"
                  disabled={
                    checkoutMutation.isPending ||
                    !enabledMethods.includes(checkoutForm.paymentMethod)
                  }
                >
                  {checkoutMutation.isPending ? 'Placing order...' : 'Place order'}
                </button>
              </form>
            </section>

            {lastOrderQuery.data ? (
              <section className="panel">
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">Your last order</p>
                    <h2>#{lastOrderQuery.data.id.slice(-6)}</h2>
                  </div>
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => lastOrderQuery.refetch()}
                  >
                    Refresh
                  </button>
                </div>
                <div className="meta-list">
                  <span>Total: {money(lastOrderQuery.data.total)}</span>
                  <span>Order: {lastOrderQuery.data.status}</span>
                  <span>
                    Payment: {lastOrderQuery.data.payments[0]?.method}{' '}
                    {lastOrderQuery.data.payments[0]?.status}
                  </span>
                </div>
                {returnedFromVnpay && lastOrderQuery.data.payments[0]?.status === 'PENDING' ? (
                  <small>Waiting for VNPAY to confirm the payment...</small>
                ) : null}
              </section>
            ) : null}
          </aside>
        </section>
      )}
    </main>
  )
}

function readStorage<T>(key: string): T | null {
  const saved = localStorage.getItem(key)
  return saved ? JSON.parse(saved) : null
}

function formatMoney(amount: number | string, currency = 'VND') {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    // VND defaults to 0 decimals; keep stored cents visible instead of rounding them away
    maximumFractionDigits: 2,
  }).format(
    Number(amount),
  )
}

export default App
