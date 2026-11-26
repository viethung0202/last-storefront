import { useMemo } from 'react'
import type { ReactNode } from 'react'
import { apiRequest, useQuery } from '../lib/api'
import { useShop } from '../lib/shop'
import type { Product } from '../lib/types'
import { ProductCard } from '../components/ProductCard'
import { createSections, renderPage } from '../builder/sections'
import type { PageData } from '../builder/sections'

type Published = { slug: string; title: string; version: number; data: PageData }

// Renders the published page-builder version of `slug`; shows `fallback` when the
// store hasn't published that page (404) so old stores keep their default home page.
export function BuilderPage({ slug, fallback }: { slug: string; fallback: ReactNode }) {
  const { store, products, collections, money } = useShop()
  const query = useQuery<Published | null>(
    ['site-page', store.slug, slug],
    () => apiRequest(`/stores/${store.slug}/site/${slug}`),
    { initialData: null },
  )
  const sections = useMemo(
    () =>
      createSections({
        products,
        collections,
        money,
        renderProduct: (p) => <ProductCard product={p as Product} />,
      }),
    [products, collections, money],
  )

  if (query.isLoading && !query.data) return <p className="muted center">Loading...</p>
  if (!query.data) return <>{fallback}</>
  return <>{renderPage(query.data.data, sections)}</>
}
