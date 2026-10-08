import { useCallback, useEffect, useRef, useState } from 'react'
import type { FormEvent, KeyboardEvent } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { clearChatHistory, fetchChatHistory, sendChat } from '../api'
import { useAuth } from '../authContext'
import { onAskBulldog } from '../chatBus'
import { useChatResults } from '../chatResults'
import type { ChatMessage, FactCheck, HistoryMessage, PageContext } from '../types'
import { Bulldog, Paw } from './Bulldog'
import { ProductCard } from './ProductCard'
import { Typewriter } from './Typewriter'

const MAX_HISTORY = 20 // most recent turns sent to the agent

const GREETING: ChatMessage = {
  role: 'assistant',
  content: "Woof! I'm the Campus Customs Bulldog. Ask me about hoodies, sizes, prices, or gift ideas and I'll check the shelves.",
}

function greetingFor(firstName: string | undefined, returning: boolean): ChatMessage {
  if (!firstName) return GREETING
  return {
    role: 'assistant',
    content: returning
      ? `Welcome back, ${firstName}! Here's our chat from last time. What can I fetch for you today?`
      : `Woof, hi ${firstName}! Ask me about hoodies, sizes, prices, or gift ideas. Our chat is saved to your account.`,
  }
}

/** Saved rows → chat bubbles; each assistant reply remembers the question that produced it. */
function fromHistory(rows: HistoryMessage[]): ChatMessage[] {
  return rows.map((r, i) => ({
    role: r.role,
    content: r.content,
    products: r.products,
    page: r.page,
    prompt: r.role === 'assistant' && rows[i - 1]?.role === 'user' ? rows[i - 1].content : undefined,
  }))
}

/** What the shopper is looking at, from the URL. The server checks the product id against the DB. */
function pageContext(pathname: string, search: string): PageContext {
  const ctx: PageContext = { path: pathname }
  const product = pathname.match(/^\/products\/([^/]+)/)
  if (product) ctx.product_id = decodeURIComponent(product[1])
  const params = new URLSearchParams(search)
  if (pathname === '/products') {
    if (params.get('category')) ctx.category = params.get('category')!
    if (params.get('q')) ctx.query = params.get('q')!
  }
  return ctx
}

/** One-tap starter questions that fit the page the shopper is on. */
function suggestionsFor(pathname: string, search: string): string[] {
  if (/^\/products\/[^/]+/.test(pathname)) {
    return ['Which sizes is this in stock in?', 'What colors does this come in?', 'How much is this?', 'Show me similar items']
  }
  const category = pathname === '/products' ? new URLSearchParams(search).get('category') : null
  if (category) {
    const c = category.toLowerCase()
    return [`Which ${c} are in stock in M?`, `What are your cheapest ${c}?`, `Navy ${c}?`, 'Gift ideas under $50']
  }
  return ['What hoodies do you have?', 'Gift ideas under $50', 'Navy crewnecks in medium', 'Something for the Harvard game']
}

function factCheckLabel(fc: FactCheck): string {
  const parts = []
  if (fc.prices_checked) parts.push(`${fc.prices_checked} price${fc.prices_checked === 1 ? '' : 's'}`)
  if (fc.stock_counts_checked)
    parts.push(`${fc.stock_counts_checked} stock count${fc.stock_counts_checked === 1 ? '' : 's'}`)
  return `✓ ${parts.join(' & ')} checked against live inventory${fc.corrected ? ' (auto-corrected)' : ''}`
}

export function ChatWidget() {
  const { user } = useAuth()
  const { pathname, search } = useLocation()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>(() => [greetingFor(user?.first_name, false)])
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [unread, setUnread] = useState(false)
  const { show } = useChatResults()
  const openRef = useRef(open)
  useEffect(() => {
    openRef.current = open
  }, [open])
  const openChat = (next: boolean) => {
    setOpen(next)
    if (next) setUnread(false)
  }

  // Logged-in shoppers: reload their saved conversation (the widget is remounted on login/logout).
  useEffect(() => {
    if (!user) return
    let cancelled = false
    fetchChatHistory()
      .then((rows) => {
        if (cancelled || rows.length === 0) return
        setMessages([greetingFor(user.first_name, true), ...fromHistory(rows)])
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [user])

  async function clearSaved() {
    if (!window.confirm('Delete your saved chat history?')) return
    await clearChatHistory().catch(() => undefined)
    setMessages([greetingFor(user?.first_name, false)])
  }
  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Grow the input with its text (up to ~5 lines), shrink back after sending.
  useEffect(() => {
    const el = inputRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`
  }, [draft, open])

  const finishTyping = useCallback(
    (index: number) => setMessages((m) => (m[index]?.animate ? m.map((x, i) => (i === index ? { ...x, animate: false } : x)) : m)),
    [],
  )

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, busy])

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  async function send(e?: FormEvent, preset?: string) {
    e?.preventDefault()
    const text = (preset ?? draft).trim()
    if (!text || busy) return
    const history = messages
      .slice(1) // skip the greeting
      .filter((m) => !m.failed)
      .slice(-MAX_HISTORY)
      .map(({ role, content }) => ({ role, content }))
    if (!preset) setDraft('')
    setMessages((m) => [...m, { role: 'user', content: text }])
    setBusy(true)
    try {
      const res = await sendChat(text, user ? [] : history, pageContext(pathname, search))
      setMessages((m) => {
        const next = [...m]
        // The server removed sensitive data: show the shopper the redacted version of what they sent.
        if (res.redacted?.length && res.user_message) {
          const last = next.length - 1
          next[last] = { ...next[last], content: res.user_message, redacted: res.redacted }
        }
        next.push({
          role: 'assistant',
          content: res.reply,
          products: res.products,
          page: res.page,
          prompt: res.user_message || text,
          factCheck: res.fact_check,
          animate: true,
        })
        return next
      })
      if (!openRef.current) setUnread(true)
      if (res.page) show(res.page, text)
    } catch (err) {
      const content = err instanceof Error ? err.message : 'Sorry, I could not reach the shop right now.'
      setMessages((m) => [...m, { role: 'assistant', content, failed: true }])
    } finally {
      setBusy(false)
    }
  }

  // "Ask the Bulldog" buttons elsewhere on the site open the chat and send their question.
  const sendRef = useRef(send)
  useEffect(() => {
    sendRef.current = send
  })
  useEffect(
    () =>
      onAskBulldog((q) => {
        setOpen(true)
        setUnread(false)
        void sendRef.current(undefined, q)
      }),
    [],
  )

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void send()
    }
  }

  return (
    <div className={`chat${open ? ' open' : ''}`}>
      {open && (
        <section className="chat-panel" aria-label="Chat with the Campus Customs Bulldog">
          <header className="chat-head">
            <div className="chat-avatar">
              <Bulldog pose="head" />
              <span className="online-dot" aria-hidden />
            </div>
            <div className="chat-title">
              <strong>Ask the Bulldog</strong>
              <span>Checks live prices &amp; stock</span>
              {user ? (
                <span className="chat-saved">
                  Saved to {user.first_name}'s account ·{' '}
                  <button type="button" className="chat-clear" onClick={() => void clearSaved()}>
                    Clear
                  </button>
                </span>
              ) : (
                <span className="chat-saved">
                  Guest chat isn't saved · <Link to="/login">Log in</Link>
                </span>
              )}
            </div>
            <button type="button" className="chat-close" aria-label="Close chat" onClick={() => openChat(false)}>
              ×
            </button>
          </header>

          <div className="chat-list" ref={listRef} aria-live="polite">
            {messages.map((m, i) => (
              <div key={i} className={`msg-row ${m.role}`}>
                {m.role === 'assistant' && (
                  <span className="msg-avatar" aria-hidden>
                    <Bulldog pose="head" />
                  </span>
                )}
                <div className={`msg ${m.role}${m.failed ? ' failed' : ''}`}>
                  {m.role === 'assistant' ? (
                    <Typewriter text={m.content} animate={!!m.animate} onDone={() => finishTyping(i)} />
                  ) : (
                    <p>{m.content}</p>
                  )}
                  {m.redacted && m.redacted.length > 0 && (
                    <p className="msg-note">🔒 We removed your {m.redacted.join(' and ')} to keep it safe.</p>
                  )}
                  {!m.animate && (
                    <div className="msg-extras">
                      {m.factCheck?.passed && <p className="fact-badge">{factCheckLabel(m.factCheck)}</p>}
                      {m.page && (
                        <button type="button" className="page-chip" onClick={() => show(m.page!, m.prompt || m.page!.title)}>
                          ✨ {m.page.total_matches} {m.page.title} shown on the page ↑
                        </button>
                      )}
                      {m.products && m.products.length > 0 && (
                        <div className="msg-products">
                          {m.products.map((p) => (
                            <ProductCard key={p.product_id} product={p} compact />
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {busy && (
              <div className="msg-row assistant">
                <span className="msg-avatar" aria-hidden>
                  <Bulldog pose="head" />
                </span>
                <div className="msg assistant paws" aria-label="The Bulldog is sniffing the shelves">
                  <Paw className="paw-step" />
                  <Paw className="paw-step" />
                  <Paw className="paw-step" />
                </div>
              </div>
            )}
          </div>

          {!busy && (
            <div className="suggestions" aria-label="Suggested questions">
              {suggestionsFor(pathname, search).map((s) => (
                <button key={s} type="button" className="suggestion" onClick={() => void send(undefined, s)}>
                  {s}
                </button>
              ))}
            </div>
          )}

          <form className="chat-form" onSubmit={send}>
            <textarea
              ref={inputRef}
              rows={1}
              placeholder="Ask about a hoodie, size, or price…"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onKeyDown}
              aria-label="Message"
            />
            <button type="submit" className="send-btn" disabled={busy || !draft.trim()} aria-label="Send">
              <svg viewBox="0 0 24 24" aria-hidden>
                <path d="M3 11.5 20 4l-7.5 17-2.2-7.3z" fill="currentColor" />
              </svg>
            </button>
          </form>
        </section>
      )}

      <button
        type="button"
        className="chat-fab"
        aria-expanded={open}
        aria-label={open ? 'Close chat' : 'Open chat with the Bulldog'}
        onClick={() => openChat(!open)}
      >
        <span className="fab-face">
          <Bulldog pose="head" />
          {unread && !open && <span className="fab-unread" aria-label="New reply" />}
        </span>
        {!open && <span className="fab-label">Ask the Bulldog</span>}
        {open && <span className="fab-x">×</span>}
      </button>
    </div>
  )
}
