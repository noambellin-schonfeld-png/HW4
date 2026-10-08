import { Link } from 'react-router-dom'
import { formatPrice } from '../api'
import type { Product } from '../types'

/** A product "in regalia": silver-framed, spotlit on blue felt, with a varsity patch and a price ribbon. */
export function ProductCard({ product, compact = false }: { product: Product; compact?: boolean }) {
  const soldOut = product.total_stock === 0
  return (
    <Link to={`/products/${product.product_id}`} className={`card${compact ? ' compact' : ''}`}>
      <div className="card-frame">
        <div className="card-img">
          <img src={product.image_url} alt={product.name} loading="lazy" />
          {!compact && <span className="card-patch">{product.category}</span>}
          {soldOut && <span className="badge out">Sold out</span>}
          {!soldOut && product.stock_note && <span className="badge low">{product.stock_note}</span>}
          <span className="card-shine" aria-hidden />
        </div>
        <span className="card-ribbon">{formatPrice(product.price)}</span>
      </div>
      <div className="card-body">
        <h3>{product.name}</h3>
        {!compact && <p className="card-desc">{product.description}</p>}
      </div>
    </Link>
  )
}
