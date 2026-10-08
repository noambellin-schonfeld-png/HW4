import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../authContext'
import { Bulldog } from './Bulldog'
import { Ticker } from './Ticker'

const LINKS = [
  { to: '/', label: 'Home', end: true },
  { to: '/products', label: 'Products' },
  { to: '/about', label: 'About Us' },
]

export function NavBar() {
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  return (
    <header className="nav-wrap">
      <Ticker />
      <nav className="nav" aria-label="Main">
        <Link to="/" className="brand" onClick={close}>
          <span className="brand-mark">
            <Bulldog pose="head" />
          </span>
          <span className="brand-text">
            Campus Customs
            <small>Bulldog Blue · New Haven</small>
          </span>
        </Link>
        <button
          type="button"
          className="nav-toggle"
          aria-expanded={open}
          aria-controls="nav-links"
          onClick={() => setOpen((o) => !o)}
        >
          Menu
        </button>
        <div id="nav-links" className={`nav-links${open ? ' open' : ''}`}>
          {LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} onClick={close}>
              {l.label}
            </NavLink>
          ))}
          <span className="nav-spacer" />
          {user ? (
            <>
              <span className="nav-hello">Hi, {user.first_name}</span>
              <button
                type="button"
                className="nav-logout"
                onClick={async () => {
                  close()
                  await logout()
                  navigate('/')
                }}
              >
                Log Out
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login" onClick={close}>
                Log In
              </NavLink>
              <NavLink to="/create-account" className="nav-cta" onClick={close}>
                Create Account
              </NavLink>
            </>
          )}
        </div>
      </nav>
    </header>
  )
}
