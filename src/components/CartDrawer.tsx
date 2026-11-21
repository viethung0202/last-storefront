import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useShop } from '../lib/shop'
import { Placeholder } from './ProductCard'

export function DiscountBox() {
  const { discount, money } = useShop()
  const [input, setInput] = useState('')
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (input.trim()) await discount.apply(input.trim())
  }
  return (
    <div className="discount-box">
      {discount.code ? (
        <p className="applied">
          <strong>{discount.code}</strong> applied: -{money(discount.amount)}{' '}
          <button type="button" className="link" onClick={discount.clear}>
            Remove
          </button>
        </p>
      ) : (
        <form onSubmit={submit} className="inline-form">
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Discount code" aria-label="Discount code" />
          <button type="submit" className="btn secondary">
            Apply
          </button>
        </form>
      )}
      {discount.error ? <p className="error" role="alert">{discount.error}</p> : null}
    </div>
  )
}

export function CartDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { cart, discount, money } = useShop()

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="drawer-root">
      <div className="overlay" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-modal="true" aria-label="Cart">
        <div className="drawer-head">
          <h2>Cart</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close cart">
            ×
          </button>
        </div>
        <div className="drawer-body">
          {cart.lines.length === 0 ? <p className="muted">Your cart is empty.</p> : null}
          {cart.lines.map(({ variant, product, quantity, label }) => (
            <article className="line" key={variant.id}>
              <div className="line-img">
                {product.images[0] ? <img src={product.images[0].url} alt={product.images[0].alt || product.name} /> : <Placeholder name={product.name} />}
              </div>
              <div className="line-info">
                <a href={`#/products/${product.id}`} onClick={onClose}>
                  {product.name}
                </a>
                {label ? <small>{label}</small> : null}
                <span>{money(variant.price)}</span>
                <div className="qty">
                  <button type="button" onClick={() => cart.setQuantity(variant.id, quantity - 1)} disabled={quantity <= 1} aria-label="Decrease quantity">
                    −
                  </button>
                  <span aria-live="polite">{quantity}</span>
                  <button type="button" onClick={() => cart.setQuantity(variant.id, quantity + 1)} disabled={quantity >= variant.stock} aria-label="Increase quantity">
                    +
                  </button>
                  <button type="button" className="link" onClick={() => cart.remove(variant.id)}>
                    Remove
                  </button>
                </div>
              </div>
              <strong>{money(Number(variant.price) * quantity)}</strong>
            </article>
          ))}
        </div>
        {cart.lines.length > 0 ? (
          <div className="drawer-foot">
            <DiscountBox />
            <p className="total-line">
              <span>Subtotal</span>
              <span>{money(cart.subtotal)}</span>
            </p>
            {discount.code ? (
              <p className="total-line">
                <span>Discount</span>
                <span>-{money(discount.amount)}</span>
              </p>
            ) : null}
            <p className="total-line grand">
              <span>Estimated total</span>
              <span>{money(cart.subtotal - discount.amount)}</span>
            </p>
            <a className="btn" href="#/checkout" onClick={onClose}>
              Check out
            </a>
          </div>
        ) : null}
      </aside>
    </div>
  )
}
