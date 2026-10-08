import { createContext, useContext } from 'react'
import type { SignupInput, User } from './types'

export interface AuthState {
  /** undefined while the session is being checked, null when logged out. */
  user: User | null | undefined
  login: (email: string, password: string) => Promise<User>
  signup: (input: SignupInput) => Promise<User>
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthState | null>(null)

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
