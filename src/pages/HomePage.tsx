import { useQuery, apiRequest } from '../lib/api'
import { useShop } from '../lib/shop'
import type { Order } from '../lib/types'
import { Placeholder, ProductCard } from '../components/ProductCard'

// Shows the status the backend recorded (VNPAY: set by IPN). The ?vnp_* params
// VNPAY appends on redirect are never trusted as proof of payment.
export function LastOrder() {
  const { store, lastOrder, money } = useShop()
  const tracked = lastOrder?.slug === store.slug ? lastOrder : null
  const query = useQuery<Order | null>(
    ['last-order', tracked?.id],
    () => apiRequest(`/stores/${store.slug}/orders/${tracked?.id}?email=${encodeURIComponent(tracked?.email ?? '')}`),
    { enabled: Boolean(tracked), initialData: null },
  )
  const order = query.data
  if (!order) return null
  const returned = new URLSearchParams(location.search).has('vnp_ResponseCode')
  return (
    <section className="section last-order">
      <h2>Your last order #{order.id.slice(-6)}</h2>
      <p>
        Total {money(order.total)} · Order {order.status} · Payment {order.payments[0]?.method} {order.payments[0]?.status}{' '}
        <button type="button" className="link" onClick={() => query.refetch()}>
          Refresh
        </button>
      </p>
      {returned && order.payments[0]?.status === 'PENDING' ? <p className="muted">Waiting for VNPAY to confirm the payment...</p> : null}
    </section>
  )
}

export function HomePage() {
  const { store, products, collections } = useShop()
  return (
    <>
      <section className="hero">
        <div>
          <h1>{store.name}</h1>
          <p>Discover our latest products.</p>
          <a className="btn" href="#/collections/all">
            Shop all
          </a>
        </div>
      </section>
      {collections.length > 0 ? (
        <section className="section">
          <h2>Collections</h2>
          <div className="grid collections">
            {collections.map((c) => {
              const inCollection = products.filter((p) => p.collections.some((x) => x.collection.id === c.id))
              const image = inCollection.find((p) => p.images[0])?.images[0]
              return (
                <a className="card" key={c.id} href={`#/collections/${c.slug}`}>
                  <div className="card-media">{image ? <img src={image.url} alt="" loading="lazy" /> : <Placeholder name={c.name} />}</div>
                  <strong className="card-title">{c.name}</strong>
                  <small className="vendor">{inCollection.length} products</small>
                </a>
              )
            })}
          </div>
        </section>
      ) : null}
      <section className="section">
        <h2>Featured products</h2>
        {products.length === 0 ? <p className="muted">No products yet.</p> : null}
        <div className="grid">
          {products.slice(0, 8).map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
        {products.length > 8 ? (
          <p className="center">
            <a className="btn secondary" href="#/collections/all">
              View all
            </a>
          </p>
        ) : null}
      </section>
    </>
  )
}
