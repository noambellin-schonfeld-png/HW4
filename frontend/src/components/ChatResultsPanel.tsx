import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useChatResults } from '../chatResults'
import { ProductCard } from './ProductCard'

/** The chat agent's browse results, drawn as product cards at the top of whatever page the shopper is on. */
export function ChatResultsPanel() {
  const { results, clear } = useChatResults()
  const { pathname } = useLocation()
  const onDetailPage = /^\/products\/[^/]+/.test(pathname)
  // After the shopper clicks through to a product page, collapse to a slim bar so the item stays front
  // and center. Fresh results always open, wherever the shopper is. Show/Hide override per results+page.
  const [override, setOverride] = useState<{ key: string; expanded: boolean } | null>(null)
  const sectionRef = useRef<HTMLElement>(null)
  const resultsId = results?.id

  useEffect(() => {
    if (resultsId === undefined) return
    window.scrollTo({ top: 0, behavior: 'smooth' })
    sectionRef.current?.focus({ preventScroll: true })
  }, [resultsId])

  if (!results) return null

  const key = `${results.id}|${pathname}`
  const defaultExpanded = !onDetailPage || results.shownOn === pathname
  const expanded = override?.key === key ? override.expanded : defaultExpanded
  const collapsed = !expanded
  const more = results.total_matches - results.products.length
  const browseLink = results.search.category
    ? `/products?category=${encodeURIComponent(results.search.category)}`
    : '/products'

  if (collapsed) {
    return (
      <div className="picks-bar">
        <span>
          ✨ Your chat picks: <strong>{results.title}</strong> ({results.total_matches})
        </span>
        <span className="picks-actions">
          <button type="button" className="link-btn" onClick={() => setOverride({ key, expanded: true })}>
            Show
          </button>
          <button type="button" className="link-btn" onClick={clear}>
            Clear
          </button>
        </span>
      </div>
    )
  }

  return (
    <section
      key={results.id}
      ref={sectionRef}
      tabIndex={-1}
      className="picks"
      aria-label={`Chat results: ${results.title}`}
      aria-live="polite"
    >
      <div className="picks-inner">
        <header className="picks-head">
          <div>
            <p className="eyebrow">✨ From your chat</p>
            <h2>{results.title}</h2>
            <p className="muted small">
              {results.total_matches} {results.total_matches === 1 ? 'match' : 'matches'} for “{results.prompt}”
            </p>
          </div>
          <div className="picks-actions">
            {onDetailPage && (
              <button type="button" className="btn outline small-btn" onClick={() => setOverride({ key, expanded: false })}>
                Hide
              </button>
            )}
            <button type="button" className="btn outline small-btn" onClick={clear}>
              Clear
            </button>
          </div>
        </header>
        <div className="grid picks-grid">
          {results.products.map((p, i) => (
            <div key={p.product_id} className="pick" style={{ ['--i' as string]: Math.min(i, 12) }}>
              <ProductCard product={p} />
            </div>
          ))}
        </div>
        {more > 0 && (
          <p className="picks-more">
            + {more} more. <Link to={browseLink}>Browse them all on the Products page →</Link>
          </p>
        )}
      </div>
    </section>
  )
}
