import { useEffect, useState } from 'react'

export type Route =
  | { name: 'home' }
  | { name: 'collection'; slug: string }
  | { name: 'product'; id: string }
  | { name: 'checkout' }
  | { name: 'cart' }
  | { name: 'page'; slug: string }

// #/ , #/collections/:slug|all , #/products/:id , #/checkout , #/cart (opens the drawer), #/pages/:slug
function parse(): Route {
  const [a, b] = location.hash.replace(/^#\/?/, '').split('/')
  if (a === 'collections') return { name: 'collection', slug: b || 'all' }
  if (a === 'products' && b) return { name: 'product', id: b }
  if (a === 'checkout') return { name: 'checkout' }
  if (a === 'cart') return { name: 'cart' }
  if (a === 'pages' && b) return { name: 'page', slug: b }
  return { name: 'home' }
}

export function useRoute() {
  const [route, setRoute] = useState<Route>(parse)
  useEffect(() => {
    const onHash = () => {
      setRoute(parse())
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])
  return route
}
