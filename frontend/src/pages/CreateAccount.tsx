import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../authContext'
import { Bulldog } from '../components/Bulldog'
import { SignedInCard } from '../components/SignedInCard'

const MIN_PASSWORD = 8

export function CreateAccount() {
  const { user, signup } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', password: '', confirm: '' })
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  if (user) return <SignedInCard />

  const mismatch = form.confirm.length > 0 && form.password !== form.confirm

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (form.password.length < MIN_PASSWORD) return setError(`Password must be at least ${MIN_PASSWORD} characters.`)
    if (form.password !== form.confirm) return setError('Passwords do not match.')
    setError(null)
    setBusy(true)
    try {
      const { confirm: _confirm, ...input } = form
      await signup(input)
      navigate('/products', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page auth">
      <form className="auth-card" onSubmit={onSubmit}>
        <Bulldog pose="peek" className="auth-dog" />
        <h1>Create account</h1>
        <p className="muted">Join the Bulldog Blue family to save your chats with our shop assistant.</p>
        <div className="row">
          <label>
            First name
            <input autoComplete="given-name" required maxLength={60} value={form.first_name} onChange={set('first_name')} />
          </label>
          <label>
            Last name
            <input autoComplete="family-name" required maxLength={60} value={form.last_name} onChange={set('last_name')} />
          </label>
        </div>
        <label>
          Email
          <input type="email" autoComplete="email" required value={form.email} onChange={set('email')} />
        </label>
        <label>
          Password
          <input
            type="password"
            autoComplete="new-password"
            required
            minLength={MIN_PASSWORD}
            maxLength={128}
            value={form.password}
            onChange={set('password')}
          />
          <span className="hint">At least {MIN_PASSWORD} characters.</span>
        </label>
        <label>
          Confirm password
          <input
            type="password"
            autoComplete="new-password"
            required
            value={form.confirm}
            onChange={set('confirm')}
            aria-invalid={mismatch}
          />
          {mismatch && <span className="hint bad">Passwords don't match yet.</span>}
        </label>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="btn wide" disabled={busy}>
          {busy ? 'Creating account…' : 'Create account'}
        </button>
        <p className="muted small">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </form>
    </div>
  )
}
