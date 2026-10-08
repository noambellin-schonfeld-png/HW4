import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import * as api from '../api'
import { AuthContext } from '../authContext'
import type { AuthState } from '../authContext'
import type { User } from '../types'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null | undefined>(undefined)

  useEffect(() => {
    api
      .fetchMe()
      .then(setUser)
      .catch(() => setUser(null))
  }, [])

  const value = useMemo<AuthState>(
    () => ({
      user,
      login: async (email, password) => {
        const u = await api.login(email, password)
        setUser(u)
        return u
      },
      signup: async (input) => {
        const u = await api.signup(input)
        setUser(u)
        return u
      },
      logout: async () => {
        await api.logout().catch(() => undefined)
        setUser(null)
      },
    }),
    [user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
