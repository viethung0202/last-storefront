import { useEffect, useState } from 'react'
import { useShop } from '../lib/shop'
import type { Product, Variant } from '../lib/types'
import { Placeholder } from '../components/ProductCard'

const matches = (v: Variant, picked: Record<string, string>) => Object.entries(picked).every(([k, val]) => v.optionValues[k] === val)

export function ProductPage({ id }: { id: string }) {
  const { products, store, money, cart, openCart } = useShop()
  const product = products.find((p) => p.id === id)

  useEffect(() => {
    if (!product) return
    document.title = product.seoTitle || `${product.name} – ${store.name}`
    const meta = document.querySelector('meta[name="description"]') ?? document.head.appendChild(Object.assign(document.createElement('meta'), { name: 'description' }))
    meta.setAttribute('content', product.seoDescription || product.description || '')
  }, [product, store.name])

  if (!product) {
    return (
      <section className="section">
        <h1>Product not found</h1>
        <a href="#/collections/all">Back to catalog</a>
      </section>
    )
  }
  // key resets picked options/image when navigating between products
  return <ProductView key={product.id} product={product} money={money} onAdd={(v, q) => { cart.add(v, q); openCart() }} />
}

function ProductView({ product, money, onAdd }: { product: Product; money: (a: string | number) => string; onAdd: (v: Variant, q: number) => void }) {
  const first = product.variants.find((v) => v.stock > 0) ?? product.variants[0]
  const [picked, setPicked] = useState<Record<string, string>>(first?.optionValues ?? {})
  const [image, setImage] = useState(0)
  const [qty, setQty] = useState(1)
  const variant = product.variants.find((v) => matches(v, picked))
  const hasStock = Boolean(variant && variant.stock > 0)
  const sale = variant?.compareAtPrice && Number(variant.compareAtPrice) > Number(variant.price)
  const img = product.images[image]

  return (
    <section className="section product">
      <div className="gallery">
        <div className="gallery-main">{img ? <img src={img.url} alt={img.alt || product.name} /> : <Placeholder name={product.name} />}</div>
        {product.images.length > 1 ? (
          <div className="thumbs">
            {product.images.map((i, n) => (
              <button type="button" key={i.id} className={n === image ? 'thumb active' : 'thumb'} onClick={() => setImage(n)} aria-label={`Show image ${n + 1}`}>
                <img src={i.url} alt="" />
              </button>
            ))}
          </div>
        ) : null}
      </div>
      <div className="product-info">
        {product.vendor ? <small className="vendor">{product.vendor}</small> : null}
        <h1>{product.name}</h1>
        <p className="price big">
          {variant ? money(variant.price) : '—'}
          {sale ? <s>{money(variant!.compareAtPrice!)}</s> : null}
          {sale ? <span className="badge sale">Sale</span> : null}
        </p>
        {product.options.map((option) => (
          <fieldset className="option" key={option.id}>
            <legend>
              {option.name}: <strong>{picked[option.name]}</strong>
            </legend>
            {option.values.map(({ id, value }) => {
              const candidate = { ...picked, [option.name]: value }
              const available = product.variants.some((v) => matches(v, candidate) && v.stock > 0)
              return (
                <button
                  type="button"
                  key={id}
                  className={picked[option.name] === value ? 'pill active' : available ? 'pill' : 'pill unavailable'}
                  aria-pressed={picked[option.name] === value}
                  disabled={!available && picked[option.name] !== value}
                  onClick={() => {
                    setPicked(candidate)
                    setQty(1)
                  }}
                >
                  {value}
                </button>
              )
            })}
          </fieldset>
        ))}
        <p className="muted">{!variant ? 'This combination is unavailable.' : hasStock ? `${variant.stock} in stock` : 'Sold out'}</p>
        <div className="qty big">
          <button type="button" onClick={() => setQty(qty - 1)} disabled={qty <= 1} aria-label="Decrease quantity">
            −
          </button>
          <span aria-live="polite">{qty}</span>
          <button type="button" onClick={() => setQty(qty + 1)} disabled={!variant || qty >= variant.stock} aria-label="Increase quantity">
            +
          </button>
        </div>
        <button type="button" className="btn wide" disabled={!hasStock} onClick={() => variant && onAdd(variant, qty)}>
          {hasStock ? 'Add to cart' : 'Sold out'}
        </button>
        {product.description ? <div className="description">{product.description}</div> : null}
        {product.tags.length > 0 ? <p className="muted">Tags: {product.tags.join(', ')}</p> : null}
      </div>
    </section>
  )
}
