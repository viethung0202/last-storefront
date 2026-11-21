import { useShop } from '../lib/shop'
import type { Route } from '../lib/route'

export function Header({ route }: { route: Route }) {
  const { store, collections, cart, openCart } = useShop()
  const active = (name: string, slug?: string) =>
    route.name === name && (!slug || (route.name === 'collection' && route.slug === slug)) ? 'active' : ''
  return (
    <>
      <div className="announcement">Welcome to {store.name}</div>
      <header className="site-header">
        <a className="logo" href="#/">
          {store.name}
        </a>
        <nav aria-label="Main">
          <a href="#/" className={active('home')}>
            Home
          </a>
          <a href="#/collections/all" className={active('collection', 'all')}>
            Catalog
          </a>
          {collections.map((c) => (
            <a key={c.id} href={`#/collections/${c.slug}`} className={active('collection', c.slug)}>
              {c.name}
            </a>
          ))}
        </nav>
        <button type="button" className="cart-button" onClick={openCart} aria-label={`Open cart, ${cart.count} items`}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
            <path d="M5 8h14l-1.2 11H6.2L5 8Z" />
            <path d="M9 8V6a3 3 0 0 1 6 0v2" />
          </svg>
          {cart.count > 0 ? <span className="cart-count">{cart.count}</span> : null}
        </button>
      </header>
    </>
  )
}
