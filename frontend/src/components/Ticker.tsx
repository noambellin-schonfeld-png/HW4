const WORDS = ['Boola Boola', '57 Broadway · New Haven', 'Bulldog Pride', 'Hoodies · Crewnecks · Tees', 'Ask the Bulldog', 'For Students, Alumni & Family']

/** Endless scrolling banner of school-spirit phrases. */
export function Ticker() {
  const items = [...WORDS, ...WORDS]
  return (
    <div className="ticker" aria-hidden>
      <div className="ticker-track">
        {items.map((w, i) => (
          <span key={i} className="ticker-item">
            {w}
            <span className="ticker-star">★</span>
          </span>
        ))}
      </div>
    </div>
  )
}
