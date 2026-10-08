import { Link } from 'react-router-dom'
import { useAuth } from '../authContext'
import { Bulldog } from './Bulldog'

/** Shown on Log in / Create account when the shopper already has a session. */
export function SignedInCard() {
  const { user, logout } = useAuth()
  if (!user) return null
  return (
    <div className="page auth">
      <div className="auth-card">
        <Bulldog pose="peek" className="auth-dog" />
        <h1>You're logged in</h1>
        <p className="muted">
          Signed in as <strong>{user.email}</strong>.
        </p>
        <Link to="/products" className="btn wide">
          Keep shopping
        </Link>
        <button type="button" className="btn wide outline" onClick={() => void logout()}>
          Log out
        </button>
      </div>
    </div>
  )
}
