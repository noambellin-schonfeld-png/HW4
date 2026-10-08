import { createContext, useContext } from 'react'
import type { PageResults } from './types'

export interface ShownResults extends PageResults {
  /** Changes every time results are (re)shown, so the panel can replay its animation. */
  id: number
  /** The shopper message that produced these results. */
  prompt: string
  /** Page the shopper was on when the results arrived. */
  shownOn: string
}

export interface ChatResultsState {
  results: ShownResults | null
  show: (page: PageResults, prompt: string) => void
  clear: () => void
}

export const ChatResultsContext = createContext<ChatResultsState | null>(null)

export function useChatResults(): ChatResultsState {
  const ctx = useContext(ChatResultsContext)
  if (!ctx) throw new Error('useChatResults must be used inside <ChatResultsProvider>')
  return ctx
}
