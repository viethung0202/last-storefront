// SHARED FILE: identical copy in admin/src/builder/ and storefront/src/builder/.
// Edit one, copy to the other (`cp`), and keep backend/src/page/page.service.ts SECTION_TYPES in sync.
//
// Section registry for the page builder. Admin feeds it to Puck (fields = editor form,
// render = canvas preview); the storefront renders published JSON with renderPage()
// and never loads Puck. Page JSON = { root: { props }, content: [{ type, props }] }.
import type { ReactNode } from 'react'
import './sections.css'

type Item = { id: string; name: string }
export type SectionProduct = Item & {
  status?: string
  images: Array<{ url: string; alt: string | null }>
  variants: Array<{ price: string; compareAtPrice?: string | null; stock: number }>
  collections: Array<{ collection: { id: string; slug: string } }>
}
export type SectionCollection = Item & { slug: string }

export type SectionContext = {
  products: SectionProduct[]
  collections: SectionCollection[]
  money: (amount: number | string) => string
  // storefront passes its own ProductCard; admin falls back to the simple card below
  renderProduct?: (product: SectionProduct) => ReactNode
}

type Option = { label: string; value: string | number }
export type Field =
  | { type: 'text' | 'textarea'; label: string }
  | { type: 'number'; label: string; min?: number; max?: number }
  | { type: 'select' | 'radio'; label: string; options: Option[] }

export type SectionDef = {
  label: string
  fields: Record<string, Field>
  defaultProps: Record<string, unknown>
  render: (props: any) => ReactNode
}

export type PageData = {
  root: { props: Record<string, unknown> }
  content: Array<{ type: string; props: Record<string, unknown> & { id?: string } }>
}

// Only http(s) images and same-site / http(s) / mailto links ever reach the DOM.
const safeSrc = (url: unknown) => (typeof url === 'string' && /^https?:\/\//i.test(url) ? url : undefined)
const safeHref = (url: unknown) =>
  typeof url === 'string' && /^(#\/|\/(?!\/)|https?:\/\/|mailto:)/i.test(url) ? url : undefined

const opts = (...values: string[]) => values.map((v) => ({ label: v[0].toUpperCase() + v.slice(1), value: v }))
const paragraphs = (text: unknown) =>
  String(text ?? '')
    .split(/\n\s*\n/)
    .filter((p) => p.trim())
    .map((p, i) => <p key={i}>{p}</p>)

function Button({ label, href, light }: { label?: string; href?: unknown; light?: boolean }) {
  const safe = safeHref(href)
  return label && safe ? (
    <a className={light ? 'sec-btn light' : 'sec-btn'} href={safe}>
      {label}
    </a>
  ) : null
}

function SimpleCard({ product, money }: { product: SectionProduct; money: SectionContext['money'] }) {
  const image = product.images[0]
  const price = Math.min(...product.variants.map((v) => Number(v.price)))
  return (
    <a className="sec-card" href={`#/products/${product.id}`}>
      <div className="sec-card-media">{image ? <img src={safeSrc(image.url)} alt={image.alt ?? product.name} /> : null}</div>
      <strong>{product.name}</strong>
      <span>{Number.isFinite(price) ? money(price) : ''}</span>
    </a>
  )
}

export function createSections(ctx: SectionContext): Record<string, SectionDef> {
  const collectionOptions = [
    { label: 'All products', value: 'all' },
    ...ctx.collections.map((c) => ({ label: c.name, value: c.slug })),
  ]
  const card = (p: SectionProduct) =>
    ctx.renderProduct ? <div key={p.id}>{ctx.renderProduct(p)}</div> : <SimpleCard key={p.id} product={p} money={ctx.money} />

  return {
    Hero: {
      label: 'Hero banner',
      fields: {
        title: { type: 'text', label: 'Heading' },
        subtitle: { type: 'textarea', label: 'Text' },
        buttonLabel: { type: 'text', label: 'Button label' },
        buttonLink: { type: 'text', label: 'Button link (#/collections/all)' },
        imageUrl: { type: 'text', label: 'Background image URL' },
        height: { type: 'radio', label: 'Height', options: opts('small', 'medium', 'large') },
        align: { type: 'radio', label: 'Alignment', options: opts('left', 'center') },
      },
      defaultProps: {
        title: 'Welcome to our store',
        subtitle: 'Discover our latest collection.',
        buttonLabel: 'Shop all',
        buttonLink: '#/collections/all',
        imageUrl: '',
        height: 'medium',
        align: 'center',
      },
      render: (p) => {
        const img = safeSrc(p.imageUrl)
        return (
          <section
            className={`sec-hero h-${p.height} a-${p.align}${img ? ' has-image' : ''}`}
            style={img ? { backgroundImage: `linear-gradient(rgba(0,0,0,.35),rgba(0,0,0,.35)), url("${img}")` } : undefined}
          >
            <div>
              <h1>{p.title}</h1>
              {p.subtitle ? <p>{p.subtitle}</p> : null}
              <Button label={p.buttonLabel} href={p.buttonLink} light={Boolean(img)} />
            </div>
          </section>
        )
      },
    },

    ImageWithText: {
      label: 'Image with text',
      fields: {
        imageUrl: { type: 'text', label: 'Image URL' },
        title: { type: 'text', label: 'Heading' },
        text: { type: 'textarea', label: 'Text' },
        buttonLabel: { type: 'text', label: 'Button label' },
        buttonLink: { type: 'text', label: 'Button link' },
        imagePosition: { type: 'radio', label: 'Image position', options: opts('left', 'right') },
      },
      defaultProps: {
        imageUrl: '',
        title: 'Our story',
        text: 'Tell customers about your brand, materials or how you make your products.',
        buttonLabel: '',
        buttonLink: '',
        imagePosition: 'left',
      },
      render: (p) => (
        <section className={`sec-iwt img-${p.imagePosition}`}>
          <div className="sec-iwt-media">{safeSrc(p.imageUrl) ? <img src={safeSrc(p.imageUrl)} alt={p.title ?? ''} /> : null}</div>
          <div className="sec-iwt-text">
            <h2>{p.title}</h2>
            {paragraphs(p.text)}
            <Button label={p.buttonLabel} href={p.buttonLink} />
          </div>
        </section>
      ),
    },

    RichText: {
      label: 'Rich text',
      fields: {
        heading: { type: 'text', label: 'Heading' },
        text: { type: 'textarea', label: 'Text (blank line = new paragraph)' },
        align: { type: 'radio', label: 'Alignment', options: opts('left', 'center') },
      },
      defaultProps: { heading: 'Talk about your brand', text: 'Share information about your brand with customers.', align: 'center' },
      render: (p) => (
        <section className={`sec-rich a-${p.align}`}>
          {p.heading ? <h2>{p.heading}</h2> : null}
          {paragraphs(p.text)}
        </section>
      ),
    },

    ProductGrid: {
      label: 'Product grid',
      fields: {
        title: { type: 'text', label: 'Heading' },
        collection: { type: 'select', label: 'Collection', options: collectionOptions },
        limit: { type: 'number', label: 'Products to show', min: 1, max: 24 },
        columns: { type: 'radio', label: 'Columns', options: [2, 3, 4].map((n) => ({ label: String(n), value: n })) },
      },
      defaultProps: { title: 'Featured products', collection: 'all', limit: 8, columns: 4 },
      render: (p) => {
        const list = ctx.products
          .filter((x) => p.collection === 'all' || x.collections.some((c) => c.collection.slug === p.collection))
          .slice(0, Math.max(1, Math.min(24, Number(p.limit) || 8)))
        return (
          <section className="sec-block">
            {p.title ? <h2>{p.title}</h2> : null}
            {list.length === 0 ? <p className="sec-muted">No products in this collection yet.</p> : null}
            <div className={`sec-grid cols-${p.columns}`}>{list.map(card)}</div>
          </section>
        )
      },
    },

    CollectionList: {
      label: 'Collection list',
      fields: {
        title: { type: 'text', label: 'Heading' },
        columns: { type: 'radio', label: 'Columns', options: [2, 3, 4].map((n) => ({ label: String(n), value: n })) },
      },
      defaultProps: { title: 'Collections', columns: 3 },
      render: (p) => (
        <section className="sec-block">
          {p.title ? <h2>{p.title}</h2> : null}
          {ctx.collections.length === 0 ? <p className="sec-muted">No collections yet.</p> : null}
          <div className={`sec-grid cols-${p.columns}`}>
            {ctx.collections.map((c) => {
              const image = ctx.products.find((x) => x.images[0] && x.collections.some((y) => y.collection.id === c.id))?.images[0]
              return (
                <a className="sec-card" key={c.id} href={`#/collections/${c.slug}`}>
                  <div className="sec-card-media">{image ? <img src={safeSrc(image.url)} alt="" /> : <span>{c.name}</span>}</div>
                  <strong>{c.name} →</strong>
                </a>
              )
            })}
          </div>
        </section>
      ),
    },

    Banner: {
      label: 'Announcement banner',
      fields: {
        text: { type: 'text', label: 'Text' },
        link: { type: 'text', label: 'Link (optional)' },
        tone: { type: 'radio', label: 'Color', options: opts('dark', 'accent', 'light') },
      },
      defaultProps: { text: 'Free shipping on orders over 500.000₫', link: '', tone: 'dark' },
      render: (p) => {
        const href = safeHref(p.link)
        return <div className={`sec-banner t-${p.tone}`}>{href ? <a href={href}>{p.text}</a> : p.text}</div>
      },
    },

    Spacer: {
      label: 'Spacer',
      fields: { size: { type: 'radio', label: 'Size', options: opts('small', 'medium', 'large') } },
      defaultProps: { size: 'medium' },
      render: (p) => <div className={`sec-spacer s-${p.size}`} aria-hidden />,
    },
  }
}

// Storefront renderer: unknown section types (e.g. from a newer admin) are skipped.
export function renderPage(data: PageData, sections: Record<string, SectionDef>) {
  return data.content.map((section, i) => {
    const def = sections[section.type]
    return def ? <div key={section.props.id ?? i}>{def.render({ ...def.defaultProps, ...section.props })}</div> : null
  })
}

// Default home page offered when a store creates its first home page (props filled
// with each section's defaults so the editor form isn't empty).
export function starterHome(): PageData {
  const defs = createSections({ products: [], collections: [], money: String })
  return {
    root: { props: {} },
    content: ['Hero', 'CollectionList', 'ProductGrid', 'RichText'].map((type) => ({
      type,
      props: { id: `${type}-1`, ...defs[type].defaultProps },
    })),
  }
}
