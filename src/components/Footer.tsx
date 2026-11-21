import { useShop } from '../lib/shop'

export function Footer({ onChangeStore }: { onChangeStore?: () => void }) {
  const { store, collections } = useShop()
  return (
    <footer className="site-footer">
      <div>
        <strong>{store.name}</strong>
        <p>Thanks for visiting. Browse the catalog and check out as a guest, no account needed.</p>
      </div>
      <div>
        <strong>Shop</strong>
        <a href="#/collections/all">Catalog</a>
        {collections.map((c) => (
          <a key={c.id} href={`#/collections/${c.slug}`}>
            {c.name}
          </a>
        ))}
      </div>
      <div className="footer-note">
        &copy; {new Date().getFullYear()} {store.name}. Powered by Hula.
        {onChangeStore ? (
          <button type="button" className="link" onClick={onChangeStore}>
            Change store
          </button>
        ) : null}
      </div>
    </footer>
  )
}
