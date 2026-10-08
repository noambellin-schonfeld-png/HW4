import { Link } from 'react-router-dom'

/** A felt pennant hanging from the rail; links to a category. */
export function Pennant({ label, to, count, variant }: { label: string; to: string; count?: number; variant: 'blue' | 'silver' }) {
  return (
    <Link to={to} className={`pennant ${variant}`}>
      <span className="pennant-string" aria-hidden />
      <span className="pennant-flag">
        <span className="pennant-label">{label}</span>
        {count !== undefined && <span className="pennant-count">{count} styles</span>}
      </span>
    </Link>
  )
}
