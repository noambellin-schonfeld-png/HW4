import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { ChatResultsContext } from '../chatResults'
import type { ChatResultsState, ShownResults } from '../chatResults'
import type { PageResults } from '../types'

export function ChatResultsProvider({ children }: { children: ReactNode }) {
  const [results, setResults] = useState<ShownResults | null>(null)
  const nextId = useRef(0)
  const { pathname } = useLocation()
  const pathRef = useRef(pathname)
  useEffect(() => {
    pathRef.current = pathname
  }, [pathname])

  const show = useCallback((page: PageResults, prompt: string) => {
    nextId.current += 1
    setResults({ ...page, prompt, id: nextId.current, shownOn: pathRef.current })
  }, [])
  const clear = useCallback(() => setResults(null), [])

  const value = useMemo<ChatResultsState>(() => ({ results, show, clear }), [results, show, clear])
  return <ChatResultsContext.Provider value={value}>{children}</ChatResultsContext.Provider>
}
