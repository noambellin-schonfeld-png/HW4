import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { fetchProduct, formatPrice } from '../api'
import { askBulldog } from '../chatBus'
import { Bulldog, Paw } from '../components/Bulldog'
import type { ProductDetail } from '../types'

const STATUS_TEXT = { in: 'In stock', low: 'Low stock', out: 'Sold out' } as const

export function ProductPage() {
  const { productId = '' } = useParams()
  // Remount per product so state (selected size, loaded data) starts fresh.
  return <ProductView key={productId} productId={productId} />
}

function ProductView({ productId }: { productId: string }) {
  const [product, setProduct] = useState<ProductDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [size, setSize] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchProduct(productId)
      .then((p) => !cancelled && setProduct(p))
      .catch(() => !cancelled && setError('We could not find that product.'))
    return () => {
      cancelled = true
    }
  }, [productId])

  if (error) {
    return (
      <div className="page center">
        <h1>Product not found</h1>
        <p>{error}</p>
        <Link to="/products" className="btn">
          Back to products
        </Link>
      </div>
    )
  }
  if (!product) return <div className="page muted">Loading…</div>

  const selected = product.sizes.find((s) => s.size === size)

  return (
    <div className="page">
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link to="/products">Products</Link> ›{' '}
        <Link to={`/products?category=${encodeURIComponent(product.category)}`}>{product.category}</Link> ›{' '}
        <span>{product.name}</span>
      </nav>

      <div className="detail">
        <div className="case">
          <div className="case-felt">
            <div className="case-mat">
              <img src={product.image_url} alt={product.name} />
            </div>
            <div className="seal" aria-label={`Price ${formatPrice(product.price)}`}>
              <span className="seal-label">Price</span>
              <span className="seal-price">{formatPrice(product.price)}</span>
            </div>
          </div>
          <div className="case-plaque">
            <span>{product.category}</span>
            <span className="case-plaque-dot">★</span>
            <span>Campus Customs</span>
          </div>
        </div>

        <div className="detail-info">
          <p className="eyebrow">{product.garment_type}</p>
          <h1>{product.name}</h1>
          <p className="detail-price">{formatPrice(product.price)}</p>
          <p className="detail-desc">{product.description}</p>
          <button
            type="button"
            className="ask-dog"
            onClick={() =>
              askBulldog(size ? `Is this in stock in ${size}? What else would go with it?` : 'Which sizes is this in stock in?')
            }
          >
            <Bulldog pose="head" className="ask-dog-face" />
            <span>
              <strong>Ask the Bulldog about this</strong>
              <small>Live stock, sizes, and similar picks</small>
            </span>
            <Paw className="paw-ico" />
          </button>

          <h2>Colors</h2>
          <p className="colors">
            {product.colors.map((c) => (
              <span key={c} className="color-pill">
                {c}
              </span>
            ))}
          </p>

          <h2>Size &amp; stock</h2>
          <div className="sizes" role="radiogroup" aria-label="Size">
            {product.sizes.map((s) => (
              <button
                key={s.size}
                type="button"
                role="radio"
                aria-checked={size === s.size}
                disabled={s.status === 'out'}
                className={`size ${s.status}${size === s.size ? ' active' : ''}`}
                onClick={() => setSize(s.size)}
                title={`${s.size}: ${STATUS_TEXT[s.status]}`}
              >
                {s.size}
              </button>
            ))}
          </div>
          <p className="stock-note">
            {selected
              ? selected.status === 'low'
                ? `Only ${selected.quantity} left in ${selected.size}.`
                : `${selected.size} is in stock (${selected.quantity} available).`
              : product.total_stock === 0
                ? 'This item is sold out in every size.'
                : 'Pick a size to check stock. Crossed-out sizes are sold out.'}
          </p>

          <table className="stock-table">
            <thead>
              <tr>
                <th>Size</th>
                <th>Available</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {product.sizes.map((s) => (
                <tr key={s.size}>
                  <td>{s.size}</td>
                  <td>{s.quantity}</td>
                  <td className={`status ${s.status}`}>{STATUS_TEXT[s.status]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
