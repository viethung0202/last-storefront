import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { apiRequest, useQuery } from './lib/api'
import { formatMoney, readStorage } from './lib/format'
import { useRoute } from './lib/route'
import { ShopContext, useCart, useDiscount } from './lib/shop'
import type { Collection, LastOrder, Product, Store } from './lib/types'
import { CartDrawer } from './components/CartDrawer'
import { Footer } from './components/Footer'
import { Header } from './components/Header'
import { CheckoutPage } from './pages/CheckoutPage'
import { CollectionPage } from './pages/CollectionPage'
import { BuilderPage } from './pages/BuilderPage'
import { HomePage, LastOrder as LastOrderPanel } from './pages/HomePage'
import { ProductPage } from './pages/ProductPage'
import './App.css'

// fashion.localhost / fashion.example.com -> resolve store by host; plain localhost/IP -> manual slug form
const storeHost = /^[\d.]+$/.test(location.hostname) || !location.hostname.includes('.') ? null : location.hostname

function App() {
  const [slug, setSlug] = useState(() => localStorage.getItem('hula.storefront.slug') ?? '')
  const [input, setInput] = useState(slug)
  const storeQuery = useQuery<Store | null>(
    ['store', storeHost ?? slug],
    () => apiRequest<Store>(storeHost ? `/stores/by-host/${storeHost}` : `/stores/${slug}`),
    { enabled: Boolean(storeHost ?? slug), initialData: null },
  )

  function openStore(e: FormEvent) {
    e.preventDefault()
    setSlug(input.trim())
    localStorage.setItem('hula.storefront.slug', input.trim())
  }
  const changeStore = storeHost
    ? undefined
    : () => {
        setSlug('')
        localStorage.removeItem('hula.storefront.slug')
      }

  if (!storeQuery.data) {
    return (
      <main className="landing">
        <h1>{storeQuery.isLoading ? 'Loading store...' : 'Open a store'}</h1>
        {storeQuery.error ? <p className="error">{storeQuery.error}</p> : null}
        {storeHost ? null : (
          <form onSubmit={openStore} className="inline-form">
            <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="store slug" aria-label="Store slug" />
            <button type="submit" className="btn">
              Open
            </button>
          </form>
        )}
      </main>
    )
  }
  if (storeQuery.data.status === 'SUSPENDED') {
    return (
      <main className="landing">
        <h1>{storeQuery.data.name}</h1>
        <p>This store is temporarily closed. Please come back later.</p>
        {changeStore ? (
          <button type="button" className="btn" onClick={changeStore}>
            Open another store
          </button>
        ) : null}
      </main>
    )
  }
  // key: a different store starts with a fresh cart/discount state
  return <Shop key={storeQuery.data.id} store={storeQuery.data} onChangeStore={changeStore} />
}

function Shop({ store, onChangeStore }: { store: Store; onChangeStore?: () => void }) {
  const route = useRoute()
  const [drawer, setDrawer] = useState(route.name === 'cart')
  const [lastOrder, setLastOrderState] = useState<LastOrder | null>(() => readStorage('hula.lastOrder'))

  const productsQuery = useQuery<Product[]>(['products', store.slug], () => apiRequest(`/stores/${store.slug}/products`), { initialData: [] })
  const collectionsQuery = useQuery<Collection[]>(['collections', store.slug], () => apiRequest(`/stores/${store.slug}/collections`), { initialData: [] })
  const products = productsQuery.data.filter((p) => p.status === 'ACTIVE' && p.variants.length > 0)

  const cart = useCart(store.slug, products)
  const discount = useDiscount(store.slug, cart.subtotal)

  // #/cart is a deep link to the drawer; fold it back to home so the URL is shareable once
  useEffect(() => {
    if (route.name === 'cart') {
      setDrawer(true)
      location.hash = '#/'
    }
  }, [route.name])
  useEffect(() => {
    if (route.name === 'home' || route.name === 'checkout') document.title = store.name
    else if (route.name === 'collection') document.title = `Catalog – ${store.name}`
  }, [route, store.name])

  return (
    <ShopContext.Provider
      value={{
        store,
        products,
        collections: collectionsQuery.data,
        money: (amount) => formatMoney(amount, store.currency),
        cart,
        discount,
        openCart: () => setDrawer(true),
        refetchProducts: productsQuery.refetch,
        lastOrder,
        setLastOrder: (order) => {
          setLastOrderState(order)
          localStorage.setItem('hula.lastOrder', JSON.stringify(order))
        },
      }}
    >
      <Header route={route} />
      <main className="page">
        {productsQuery.error ? <p className="error">{productsQuery.error}</p> : null}
        {route.name === 'collection' ? <CollectionPage slug={route.slug} /> : null}
        {route.name === 'product' ? <ProductPage id={route.id} /> : null}
        {route.name === 'checkout' ? <CheckoutPage /> : null}
        {route.name === 'home' || route.name === 'cart' ? (
          <>
            <LastOrderPanel />
            <BuilderPage slug="home" fallback={<HomePage />} />
          </>
        ) : null}
        {route.name === 'page' ? (
          <BuilderPage key={route.slug} slug={route.slug} fallback={<p className="error center">Page not found.</p>} />
        ) : null}
      </main>
      <Footer onChangeStore={onChangeStore} />
      <CartDrawer open={drawer} onClose={() => setDrawer(false)} />
    </ShopContext.Provider>
  )
}

export default App
