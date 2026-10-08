import type {
  ChatReply,
  ChatTurn,
  HistoryMessage,
  PageContext,
  Product,
  ProductDetail,
  SignupInput,
  User,
} from './types'

/** Turn a FastAPI error body ({detail: string} or a 422 list) into one readable sentence. */
function errorMessage(body: unknown, status: number): string {
  const detail = (body as { detail?: unknown } | null)?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail) && detail.length) {
    const first = detail[0] as { loc?: unknown[]; msg?: string }
    const field = String(first.loc?.[first.loc.length - 1] ?? '').replace('_', ' ')
    const msg = (first.msg || 'Invalid value').replace(/^Value error, /, '')
    return field && field !== 'body' ? `${field[0].toUpperCase()}${field.slice(1)}: ${msg}` : msg
  }
  return `Request failed (HTTP ${status})`
}

async function getJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, { credentials: 'same-origin', ...init })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(errorMessage(body, res.status))
  }
  return res.json() as Promise<T>
}

const postJson = <T,>(path: string, body?: unknown) =>
  getJson<T>(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })

export type ProductSort = 'featured' | 'price-asc' | 'price-desc' | 'name'

export function fetchProducts(
  params: { q?: string; category?: string; size?: string; sort?: ProductSort } = {},
): Promise<Product[]> {
  const qs = new URLSearchParams()
  if (params.q) qs.set('q', params.q)
  if (params.category) qs.set('category', params.category)
  if (params.size) qs.set('size', params.size)
  if (params.sort && params.sort !== 'featured') qs.set('sort', params.sort)
  const query = qs.toString()
  return getJson(`/api/products${query ? `?${query}` : ''}`)
}

export function fetchProduct(id: string): Promise<ProductDetail> {
  return getJson(`/api/products/${encodeURIComponent(id)}`)
}

export function fetchCategories(): Promise<string[]> {
  return getJson('/api/categories')
}

/**
 * Chat with the shop assistant. `page` tells the agent what the shopper is looking at.
 * `history` is only used for guests; logged-in shoppers' history is loaded from the database.
 */
export function sendChat(message: string, history: ChatTurn[], page: PageContext): Promise<ChatReply> {
  return postJson('/api/chat', { message, history, page })
}

export const fetchChatHistory = () => getJson<HistoryMessage[]>('/api/chat/history')
export const clearChatHistory = () => getJson<{ deleted: number }>('/api/chat/history', { method: 'DELETE' })

export const fetchMe = () => getJson<{ user: User | null }>('/api/auth/me').then((r) => r.user)
export const login = (email: string, password: string) =>
  postJson<{ user: User }>('/api/auth/login', { email, password }).then((r) => r.user)
export const signup = (input: SignupInput) => postJson<{ user: User }>('/api/auth/signup', input).then((r) => r.user)
export const logout = () => postJson<{ ok: boolean }>('/api/auth/logout')

export const formatPrice = (n: number) => `$${n.toFixed(2)}`
