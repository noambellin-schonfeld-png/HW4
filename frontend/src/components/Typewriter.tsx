import { useEffect, useState } from 'react'
import Markdown from 'react-markdown'

const DURATION_MS = 900 // whole reply appears within about a second, however long it is

/** Reveals an assistant reply progressively so it reads like it's being typed. */
export function Typewriter({ text, animate, onDone }: { text: string; animate: boolean; onDone?: () => void }) {
  const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  const [count, setCount] = useState(animate && !reduce ? 0 : text.length)

  useEffect(() => {
    if (count >= text.length) {
      onDone?.()
      return
    }
    const step = Math.max(2, Math.ceil(text.length / (DURATION_MS / 16)))
    const t = window.setTimeout(() => setCount((c) => Math.min(text.length, c + step)), 16)
    return () => window.clearTimeout(t)
  }, [count, text, onDone])

  const done = count >= text.length
  return (
    <div className={`msg-md${done ? '' : ' typing-text'}`}>
      <Markdown>{done ? text : closeOpenBold(text.slice(0, count))}</Markdown>
    </div>
  )
}

/** Mid-typing, "**Basic Ho" would show raw asterisks; close the bold so it renders as bold. */
function closeOpenBold(partial: string): string {
  const trimmed = partial.replace(/(?<!\*)\*$/, '') // don't end on half of a "**"
  return (trimmed.match(/\*\*/g)?.length ?? 0) % 2 ? `${trimmed}**` : trimmed
}
