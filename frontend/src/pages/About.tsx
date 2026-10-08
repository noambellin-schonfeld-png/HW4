import { Link } from 'react-router-dom'
import { Bulldog, Paw } from '../components/Bulldog'
import { Reveal } from '../components/Reveal'

const VALUES = [
  { title: 'Built to last', text: 'Soft fleece, sturdy stitching, and classic marks you will still wear at your 25th reunion.' },
  { title: 'Made for everyone', text: 'First-years, seniors, alumni, parents, and grandparents. If you cheer in blue, you belong.' },
  { title: 'Straight answers', text: 'Our chat checks real prices and stock, so you know what is on the shelf before you walk over.' },
]

export function About() {
  return (
    <article className="about">
      <header className="about-hero">
        <div className="hero-stripes" aria-hidden />
        <div className="about-hero-inner">
          <div>
            <p className="eyebrow light">About us</p>
            <h1>
              Made for the <span className="silver-text">Bulldog</span> community
            </h1>
            <p className="hero-sub">
              Campus Customs is a New Haven apparel shop on Broadway, right at the edge of campus. We make spirit wear
              for everyone connected to the school.
            </p>
          </div>
          <Bulldog pose="sitting" className="about-dog" />
        </div>
      </header>

      <div className="page about-grid">
        <section>
          <Reveal>
            <h2>Who we are</h2>
            <p>
              First-years buying their first hoodie, seniors getting ready for commencement, alumni coming back for
              The Game, and families who want to show some pride too: they all come through our door. We keep the
              shelves stocked with block letters, the crest, residential college marks, and game-day graphics.
            </p>
          </Reveal>
          <div className="values">
            {VALUES.map((v, i) => (
              <Reveal key={v.title} delay={i * 90}>
                <div className="value">
                  <Paw className="value-paw" />
                  <h3>{v.title}</h3>
                  <p>{v.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal>
            <h2>Our colors</h2>
            <p>
              Deep Bulldog blue, crisp white, and heather silver-gray. Every piece in the shop is picked to look sharp
              together, so a hoodie and a quarter-zip from us always match.
            </p>
          </Reveal>
        </section>

        <aside className="plaque">
          <Bulldog pose="peek" className="plaque-dog" />
          <h3>Visit the shop</h3>
          <p className="plaque-address">
            57 Broadway
            <br />
            New Haven, CT 06511
          </p>
          <p className="muted">A few minutes' walk from Old Campus and the residential colleges.</p>
          <Link to="/products" className="btn">
            Browse products
          </Link>
        </aside>
      </div>
    </article>
  )
}
