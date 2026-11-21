import { useState } from 'react'
import type { FormEvent } from 'react'
import { apiRequest, useMutation, useQuery } from '../lib/api'
import { useShop } from '../lib/shop'
import type { Order, PaymentMethod } from '../lib/types'
import { DiscountBox } from '../components/CartDrawer'

export function CheckoutPage() {
  const { store, cart, discount, money, setLastOrder, refetchProducts } = useShop()
  const [form, setForm] = useState({ guestName: '', guestEmail: '', paymentMethod: 'COD' as PaymentMethod })
  const [error, setError] = useState('')
  const [placed, setPlaced] = useState<Order | null>(null)

  const methods = useQuery<Record<PaymentMethod, boolean>>(
    ['payment-methods', store.slug],
    () => apiRequest(`/stores/${store.slug}/payment-methods`),
    { initialData: { COD: false, VNPAY: false } },
  )
  const enabled = (['COD', 'VNPAY'] as const).filter((m) => methods.data[m])
  const method = enabled.includes(form.paymentMethod) ? form.paymentMethod : enabled[0]

  const place = useMutation<typeof form, Order>(
    (input) =>
      apiRequest(`/stores/${store.slug}/orders`, {
        method: 'POST',
        body: JSON.stringify({
          guestName: input.guestName,
          guestEmail: input.guestEmail,
          paymentMethod: method,
          discountCode: discount.code || undefined,
          returnUrl: `${location.origin}/`,
          items: cart.lines.map((l) => ({ variantId: l.variant.id, quantity: l.quantity })),
        }),
      }),
    {
      onSuccess: (order, input) => {
        setLastOrder({ slug: store.slug, id: order.id, email: input.guestEmail })
        cart.clear()
        discount.clear()
        if (order.paymentUrl) {
          location.href = order.paymentUrl
          return
        }
        refetchProducts() // stock changed
        setPlaced(order)
      },
      onError: setError,
    },
  )

  if (placed) {
    return (
      <section className="section narrow">
        <h1>Thank you!</h1>
        <p>Order #{placed.id.slice(-6)} was placed. We'll send updates to {form.guestEmail}.</p>
        <div className="summary">
          {placed.items.map((i) => (
            <p className="total-line" key={i.id}>
              <span>
                {i.productNameSnapshot} {i.variantLabelSnapshot !== 'Default' ? `(${i.variantLabelSnapshot})` : ''} × {i.quantity}
              </span>
              <span>{money(Number(i.unitPrice) * i.quantity)}</span>
            </p>
          ))}
          <p className="total-line">
            <span>Subtotal</span>
            <span>{money(placed.subtotal)}</span>
          </p>
          {Number(placed.discountAmount) > 0 ? (
            <p className="total-line">
              <span>Discount {placed.discountCode}</span>
              <span>-{money(placed.discountAmount)}</span>
            </p>
          ) : null}
          <p className="total-line grand">
            <span>Total</span>
            <span>{money(placed.total)}</span>
          </p>
          <p className="muted">
            Payment: {placed.payments[0]?.method} {placed.payments[0]?.status}
          </p>
        </div>
        <a className="btn" href="#/collections/all">
          Continue shopping
        </a>
      </section>
    )
  }

  if (cart.lines.length === 0) {
    return (
      <section className="section narrow">
        <h1>Your cart is empty</h1>
        <a className="btn" href="#/collections/all">
          Continue shopping
        </a>
      </section>
    )
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    setError('')
    place.mutate(form).catch(() => undefined)
  }

  return (
    <section className="section checkout">
      <form onSubmit={submit} className="checkout-form">
        <h1>Checkout</h1>
        <h2>Contact</h2>
        <label>
          Full name
          <input required value={form.guestName} onChange={(e) => setForm({ ...form, guestName: e.target.value })} autoComplete="name" />
        </label>
        <label>
          Email
          <input required type="email" value={form.guestEmail} onChange={(e) => setForm({ ...form, guestEmail: e.target.value })} autoComplete="email" />
        </label>
        <fieldset>
          <legend>Payment</legend>
          {enabled.map((m) => (
            <label className="radio" key={m}>
              <input type="radio" name="paymentMethod" checked={method === m} onChange={() => setForm({ ...form, paymentMethod: m })} />
              {m === 'COD' ? 'Cash on delivery' : 'VNPAY'}
            </label>
          ))}
          {enabled.length === 0 ? <p className="muted">This store has no payment method enabled.</p> : null}
        </fieldset>
        {error ? <p className="error" role="alert">{error}</p> : null}
        <button type="submit" className="btn wide" disabled={place.isPending || !method}>
          {place.isPending ? 'Placing order...' : 'Place order'}
        </button>
      </form>
      <aside className="summary">
        <h2>Order summary</h2>
        {cart.lines.map(({ variant, product, quantity, label }) => (
          <p className="total-line" key={variant.id}>
            <span>
              {product.name} {label ? `(${label})` : ''} × {quantity}
            </span>
            <span>{money(Number(variant.price) * quantity)}</span>
          </p>
        ))}
        <DiscountBox />
        <p className="total-line">
          <span>Subtotal</span>
          <span>{money(cart.subtotal)}</span>
        </p>
        {discount.code ? (
          <p className="total-line">
            <span>Discount {discount.code}</span>
            <span>-{money(discount.amount)}</span>
          </p>
        ) : null}
        <p className="total-line grand">
          <span>Total</span>
          <span>{money(cart.subtotal - discount.amount)}</span>
        </p>
      </aside>
    </section>
  )
}
