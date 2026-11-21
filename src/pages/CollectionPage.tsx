import { useState } from 'react'
import { minPrice } from '../lib/format'
import { useShop } from '../lib/shop'
import { ProductCard } from '../components/ProductCard'

type Sort = 'newest' | 'price-asc' | 'price-desc'

// slug "all" = whole catalog. Filtering and sorting are client-side (the API returns every product).
export function CollectionPage({ slug }: { slug: string }) {
  const { products, collections } = useShop()
  const [sort, setSort] = useState<Sort>('newest')
  const [tag, setTag] = useState('')
  const collection = slug === 'all' ? null : collections.find((c) => c.slug === slug)
  if (slug !== 'all' && !collection) {
    return (
      <section className="section">
        <h1>Collection not found</h1>
        <a href="#/collections/all">Back to catalog</a>
      </section>
    )
  }

  const inCollection = products.filter((p) => !collection || p.collections.some((x) => x.collection.id === collection.id))
  const tags = [...new Set(inCollection.flatMap((p) => p.tags))].sort()
  const shown = inCollection
    .filter((p) => !tag || p.tags.includes(tag))
    .sort((a, b) =>
      sort === 'price-asc' ? minPrice(a) - minPrice(b) : sort === 'price-desc' ? minPrice(b) - minPrice(a) : b.createdAt.localeCompare(a.createdAt),
    )

  return (
    <section className="section">
      <h1>{collection?.name ?? 'Catalog'}</h1>
      <div className="toolbar">
        {tags.length > 0 ? (
          <div className="chips" role="group" aria-label="Filter by tag">
            <button type="button" className={tag === '' ? 'chip active' : 'chip'} onClick={() => setTag('')}>
              All
            </button>
            {tags.map((t) => (
              <button type="button" key={t} className={tag === t ? 'chip active' : 'chip'} onClick={() => setTag(t)}>
                {t}
              </button>
            ))}
          </div>
        ) : (
          <span />
        )}
        <label className="sort">
          Sort by
          <select value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
            <option value="newest">Newest</option>
            <option value="price-asc">Price, low to high</option>
            <option value="price-desc">Price, high to low</option>
          </select>
        </label>
      </div>
      <p className="muted">{shown.length} products</p>
      <div className="grid">
        {shown.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
      {shown.length === 0 ? <p className="muted">No products match.</p> : null}
    </section>
  )
}
