import { minPrice, onSale, soldOut } from '../lib/format'
import { useShop } from '../lib/shop'
import type { Product } from '../lib/types'

export function Placeholder({ name }: { name: string }) {
  return (
    <div className="placeholder" aria-hidden="true">
      {(name || '?').slice(0, 1).toUpperCase()}
    </div>
  )
}

export function ProductCard({ product }: { product: Product }) {
  const { money } = useShop()
  const cover = product.images[0]
  const sale = onSale(product)
  const out = soldOut(product)
  const compare = product.variants.find((v) => v.compareAtPrice && Number(v.compareAtPrice) > Number(v.price))
  return (
    <a className="card" href={`#/products/${product.id}`}>
      <div className="card-media">
        {cover ? <img src={cover.url} alt={cover.alt || product.name} loading="lazy" /> : <Placeholder name={product.name} />}
        {out ? <span className="badge">Sold out</span> : sale ? <span className="badge sale">Sale</span> : null}
      </div>
      {product.vendor ? <small className="vendor">{product.vendor}</small> : null}
      <strong className="card-title">{product.name}</strong>
      <span className="price">
        {product.variants.length > 1 ? 'From ' : ''}
        {money(minPrice(product))}
        {sale && compare ? <s>{money(compare.compareAtPrice!)}</s> : null}
      </span>
    </a>
  )
}
