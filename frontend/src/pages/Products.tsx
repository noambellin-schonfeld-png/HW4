import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { fetchCategories, fetchProducts } from '../api'
import type { ProductSort } from '../api'
import { Bulldog } from '../components/Bulldog'
import { ProductCard } from '../components/ProductCard'
import type { Product } from '../types'

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL']
const SORTS: { value: ProductSort; label: string }[] = [
  { value: 'featured', label: 'Featured' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
  { value: 'name', label: 'Name: A to Z' },
]

export function Products() {
  const [params, setParams] = useSearchParams()
  const category = params.get('category') || ''
  const q = params.get('q') || ''
  const size = params.get('size') || ''
  const sort = (params.get('sort') as ProductSort) || 'featured'
  const [search, setSearch] = useState(q)
  const [categories, setCategories] = useState<string[]>([])
  const key = `${q}|${category}|${size}|${sort}`
  const [result, setResult] = useState<{ key: string; products?: Product[]; error?: string } | null>(null)
  const current = result?.key === key ? result : null
  const products = current?.products ?? null
  const error = current?.error ?? null

  useEffect(() => {
    fetchCategories()
      .then(setCategories)
      .catch(() => undefined)
  }, [])

  useEffect(() => {
    let cancelled = false
    fetchProducts({ q, category, size, sort })
      .then((p) => !cancelled && setResult({ key, products: p }))
      .catch((e) => !cancelled && setResult({ key, error: e instanceof Error ? e.message : String(e) }))
    return () => {
      cancelled = true
    }
  }, [key, q, category, size, sort])

  function update(next: { q?: string; category?: string; size?: string; sort?: ProductSort }) {
    const merged = { q, category, size, sort, ...next }
    const p = new URLSearchParams()
    if (merged.q) p.set('q', merged.q)
    if (merged.category) p.set('category', merged.category)
    if (merged.size) p.set('size', merged.size)
    if (merged.sort && merged.sort !== 'featured') p.set('sort', merged.sort)
    setParams(p)
  }

  return (
    <div className="page">
      <header className="page-head with-dog">
        <Bulldog pose="peek" className="page-head-dog" />
        <p className="eyebrow">Shop</p>
        <h1>
          {category || 'All products'}
          {size && <span className="h1-sub"> in stock in {size}</span>}
        </h1>
      </header>

      <div className="filters">
        <form
          className="search"
          role="search"
          onSubmit={(e) => {
            e.preventDefault()
            update({ q: search.trim() })
          }}
        >
          <input
            type="search"
            placeholder="Search hoodies, crest, Branford, gray…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search products"
          />
          <button type="submit" className="btn">
            Search
          </button>
        </form>
        <div className="chips" role="group" aria-label="Categories">
          <button type="button" className={`chip${!category ? ' active' : ''}`} onClick={() => update({ category: '' })}>
            All
          </button>
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              className={`chip${category === c ? ' active' : ''}`}
              onClick={() => update({ category: c })}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="refine">
        <div className="size-filter" role="group" aria-label="In stock in size">
          <span className="refine-label">In stock in</span>
          <button type="button" className={`size-chip${!size ? ' active' : ''}`} onClick={() => update({ size: '' })}>
            Any size
          </button>
          {SIZES.map((s) => (
            <button
              key={s}
              type="button"
              className={`size-chip${size === s ? ' active' : ''}`}
              aria-pressed={size === s}
              onClick={() => update({ size: size === s ? '' : s })}
            >
              {s}
            </button>
          ))}
        </div>
        <label className="sort">
          <span className="refine-label">Sort by</span>
          <select value={sort} onChange={(e) => update({ sort: e.target.value as ProductSort })}>
            {SORTS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error && <p className="error">Could not load products: {error}</p>}
      {!error && products === null && <p className="muted">Loading products…</p>}
      {products && (
        <>
          <p className="muted result-count">
            {products.length} {products.length === 1 ? 'item' : 'items'}
            {q && ` matching “${q}”`}
            {size && ` · in stock in ${size}`}
          </p>
          {products.length === 0 ? (
            <div className="empty">
              <Bulldog pose="head" mood="sad" className="empty-dog" />
              <p>No products match. Try a different size, search, or category, or ask the Bulldog in the chat.</p>
            </div>
          ) : (
            <div className="grid">
              {products.map((p) => (
                <ProductCard key={p.product_id} product={p} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
