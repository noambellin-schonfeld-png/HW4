export type StockStatus = 'in' | 'low' | 'out'

export interface Product {
  product_id: string
  name: string
  garment_type: string
  category: string
  description: string
  colors: string[]
  price: number
  image_url: string
  total_stock: number
  /** e.g. "Only 3 left in M" when the Products page is filtered by size */
  stock_note?: string | null
}

export interface SizeStock {
  size: string
  quantity: number
  status: StockStatus
}

export interface ProductDetail extends Product {
  search_tags: string[]
  sizes: SizeStock[]
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  products?: Product[]
  page?: PageResults | null
  /** The shopper message this reply answered (labels re-shown page results). */
  prompt?: string
  factCheck?: FactCheck | null
  /** On a user message: kinds of sensitive data the server removed. */
  redacted?: string[]
  /** New assistant reply that should type itself out (cards/badges appear when it finishes). */
  animate?: boolean
  /** Error notices aren't sent back to the agent as history. */
  failed?: boolean
}

export interface ChatTurn {
  role: 'user' | 'assistant'
  content: string
}

export interface PageSearch {
  title: string
  query: string
  category: string | null
  color: string | null
  size: string | null
  min_price: number | null
  max_price: number | null
}

/** Browse results the agent asked the site to show as cards on the page. */
export interface PageResults {
  title: string
  total_matches: number
  products: Product[]
  search: PageSearch
}

/** Where the shopper is, sent with every chat message. */
export interface PageContext {
  path: string
  product_id?: string
  category?: string
  query?: string
}

export interface HistoryMessage {
  id: number
  role: 'user' | 'assistant'
  content: string
  products: Product[]
  page: PageResults | null
  created_at: string
}

/** What the server's fact-checker verified in a reply. */
export interface FactCheck {
  prices_checked: number
  stock_counts_checked: number
  corrected: boolean
  passed: boolean
}

export interface ChatReply {
  reply: string
  products: Product[]
  page: PageResults | null
  fact_check: FactCheck | null
  /** The shopper's message after sensitive data was removed (only set when something was). */
  user_message: string | null
  redacted: string[]
}

export interface User {
  id: number
  email: string
  first_name: string
  last_name: string
}

export interface SignupInput {
  first_name: string
  last_name: string
  email: string
  password: string
}
