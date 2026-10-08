import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchProducts } from '../api'
import { askBulldog } from '../chatBus'
import { Bulldog, Paw } from '../components/Bulldog'
import { Pennant } from '../components/Pennant'
import { ProductCard } from '../components/ProductCard'
import { Reveal } from '../components/Reveal'
import type { Product } from '../types'

const FEATURED = [
  'basic-hoodie-big-yale',
  '2025-yale-vs-harvard-t-shirt',
  'baseball-left-chest-crewneck',
  'benjamin-franklin-fleece-jacket',
]
// Product photos in the hero, fanned behind the mascot.
const HERO_PICKS = ['district-vit-hoodie-vintage-bulldog', 'basic-hoodie-big-yale', 'yale-bowl-t-shirt']
const PENNANTS = ['Hoodies', 'Crewnecks', 'T-Shirts', 'Quarter-Zips', 'Jackets', 'Long Sleeves']

export function Home() {
  const [products, setProducts] = useState<Product[]>([])

  useEffect(() => {
    fetchProducts()
      .then(setProducts)
      .catch(() => setProducts([]))
  }, [])

  const byId = new Map(products.map((p) => [p.product_id, p]))
  const pick = (ids: string[]) => ids.map((id) => byId.get(id)).filter((p): p is Product => !!p)
  const featured = pick(FEATURED)
  const heroPicks = pick(HERO_PICKS)
  // Every product whose name or description features a bulldog — the real "Bulldog Wall".
  const bulldogWall = products.filter((p) => /bulldog/i.test(`${p.name} ${p.description}`)).slice(0, 8)
  const countOf = (c: string) => products.filter((p) => p.category === c).length

  return (
    <>
      <section className="hero">
        <div className="hero-stripes" aria-hidden />
        <div className="hero-inner">
          <div className="hero-copy">
            <p className="eyebrow light">
              <Paw className="paw-ico" /> Campus Customs · 57 Broadway
            </p>
            <h1>
              <span className="hero-line">Bulldog Blue.</span>
              <span className="hero-line silver-text">Bulldog Proud.</span>
            </h1>
            <p className="hero-sub">
              Heavyweight hoodies, game-day tees, and crest crewnecks for students, alumni, and every family that
              cheers in blue. Built for cold New Haven mornings and loud Saturday afternoons.
            </p>
            <div className="hero-actions">
              <Link to="/products" className="btn silver">
                Shop the collection
              </Link>
              <button type="button" className="btn ghost" onClick={() => askBulldog('What hoodies do you have?')}>
                <Paw className="paw-ico" /> Ask the Bulldog
              </button>
            </div>
            <ul className="hero-facts">
              <li>
                <strong>{products.length || 102}</strong> styles
              </li>
              <li>
                <strong>XS–XXL</strong> sizes
              </li>
              <li>
                <strong>Live</strong> stock
              </li>
            </ul>
          </div>

          <div className="hero-stage" aria-hidden>
            <div className="hero-halo" />
            {heroPicks.map((p, i) => (
              <div key={p.product_id} className={`hero-polaroid p${i}`}>
                <img src={p.image_url} alt="" />
              </div>
            ))}
            <Bulldog pose="sitting" className="hero-dog" />
            <div className="hero-plinth">
              <span>Est. on Broadway</span>
            </div>
          </div>
        </div>
      </section>

      <section className="pennant-rail-wrap" aria-label="Shop by style">
        <Reveal>
          <h2 className="section-title center">
            Shop by <span className="accent">style</span>
          </h2>
          <div className="pennant-rail">
            {PENNANTS.map((c, i) => (
              <Pennant
                key={c}
                label={c}
                to={`/products?category=${encodeURIComponent(c)}`}
                count={products.length ? countOf(c) : undefined}
                variant={i % 2 ? 'silver' : 'blue'}
              />
            ))}
          </div>
        </Reveal>
      </section>

      {bulldogWall.length > 0 && (
        <section className="bulldog-wall">
          <div className="section">
            <Reveal>
              <div className="section-head">
                <div className="section-head-title">
                  <Bulldog pose="peek" className="peek-dog" />
                  <div>
                    <p className="eyebrow">The Bulldog Wall</p>
                    <h2 className="section-title">Wear the mascot</h2>
                  </div>
                </div>
                <Link to="/products?q=bulldog">See every bulldog →</Link>
              </div>
            </Reveal>
            <div className="grid">
              {bulldogWall.map((p, i) => (
                <Reveal key={p.product_id} delay={i * 60}>
                  <ProductCard product={p} />
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {featured.length > 0 && (
        <section className="section trophy">
          <Reveal>
            <div className="section-head">
              <div>
                <p className="eyebrow">Trophy case</p>
                <h2 className="section-title">Campus favorites</h2>
              </div>
              <Link to="/products">Shop all →</Link>
            </div>
          </Reveal>
          <div className="grid">
            {featured.map((p, i) => (
              <Reveal key={p.product_id} delay={i * 80}>
                <ProductCard product={p} />
              </Reveal>
            ))}
          </div>
        </section>
      )}

      <Reveal className="visit-wrap">
        <section className="visit">
          <Bulldog pose="head" className="visit-dog" />
          <div>
            <h2>Come say hi on Broadway</h2>
            <p>
              Our shop sits at 57 Broadway, a short walk from Old Campus. Try on sizes, find a gift for the Yalie in
              your family, or ask the Bulldog in the chat for a pick before you come in.
            </p>
          </div>
          <Link to="/about" className="btn silver">
            Plan a visit
          </Link>
        </section>
      </Reveal>
    </>
  )
}
