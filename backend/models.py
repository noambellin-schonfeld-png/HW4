"""Pydantic / PydanticAI types shared by the API, the tools, and the agent.

- ProductCard / SizeStock / ProductDetail — catalogue + inventory shapes for the website API
- ProductSummary / SearchResult / ProductInfo / PriceInfo / StockInfo / LookupFailed — agent tool results
- ChatTurn / ChatRequest / ChatReply / PageResults — the website <-> /api/chat contract
- ShopReply / PageSearch — the agent's structured output (reply, product ids for chat cards, a search for the page)
- Customer / ViewContext / AccountInfo / ShopDeps — who is chatting + what page they're on (agent deps)
- PageContext / HistoryMessage — page info sent with each message; saved chat messages
- AuditEntry — one record in output/audit_trail.json
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal

from pydantic import BaseModel, Field

SIZE_ORDER = ["XS", "S", "M", "L", "XL", "XXL"]
MAX_MESSAGE_CHARS = 2000
MAX_HISTORY_TURNS = 20
MAX_CARDS = 6
MAX_PAGE_RESULTS = 30


# ---------- catalogue ----------


class ProductCard(BaseModel):
    """What the website needs to draw a product card."""

    product_id: str
    name: str
    garment_type: str
    category: str
    description: str
    colors: list[str]
    price: float
    image_url: str
    total_stock: int
    stock_note: str | None = Field(default=None, description='e.g. "Only 3 left in M" when filtering by size')


class SizeStock(BaseModel):
    size: str
    quantity: int
    status: Literal["in", "low", "out"]


class ProductDetail(ProductCard):
    search_tags: list[str]
    sizes: list[SizeStock]


# ---------- agent tool results ----------
# What the model sees after a tool call. Field names are explicit (price_usd, quantity, in_stock)
# so the model quotes them instead of guessing, and nothing it doesn't need (image paths, tags,
# internal ids) is included.


class ProductSummary(BaseModel):
    """One search hit: enough to recommend it and answer "is it in my size?" without another call."""

    product_id: str
    name: str
    category: str
    price_usd: float
    colors: list[str]
    description: str
    sizes_in_stock: list[str]
    sold_out_sizes: list[str]


class SoldOutInSize(BaseModel):
    size: str
    products: list[str] = Field(description="Names that match the search but have 0 left in this size")


class SearchResult(BaseModel):
    total_matches: int
    products: list[ProductSummary]
    sold_out_in_requested_size: SoldOutInSize | None = None


class ProductInfo(BaseModel):
    """Everything the shop knows about one item (get_product_details)."""

    product_id: str
    name: str
    garment_type: str
    category: str
    description: str
    colors: list[str]
    price_usd: float
    total_in_stock: int
    sizes: list[SizeStock]


class PriceInfo(BaseModel):
    """Answer to "how much is it?" (get_price)."""

    product_id: str
    name: str
    price_usd: float
    currency: Literal["USD"] = "USD"


class StockInfo(BaseModel):
    """Answer to "is it in stock / how many in M?" (check_stock)."""

    product_id: str
    name: str
    size_requested: str | None = Field(description="The size asked about, or null for all sizes")
    in_stock: bool = Field(description="Requested size has quantity > 0, or (no size) any size does")
    quantity: int = Field(description="Units of the requested size, or total across all sizes")
    sizes: list[SizeStock] = Field(description="Every size, XS to XXL, with exact quantity and status")
    sizes_in_stock: list[str]
    sold_out_sizes: list[str]


class LookupFailed(BaseModel):
    """Returned instead of a result when the product or size can't be found. Never guess past this."""

    error: str
    did_you_mean: list[str] = Field(default_factory=list, description="Close product_id matches, if any")
    valid_sizes: list[str] = Field(default_factory=list)


# ---------- chat API ----------


class ChatTurn(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(max_length=MAX_MESSAGE_CHARS * 4)


class PageContext(BaseModel):
    """Where the shopper is on the site, sent by the chat widget with every message."""

    path: str = Field(default="/", max_length=300)
    product_id: str | None = Field(default=None, max_length=120, description="Set on /products/:productId")
    category: str | None = Field(default=None, max_length=60, description="?category= on the Products page")
    query: str | None = Field(default=None, max_length=200, description="?q= on the Products page")


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=MAX_MESSAGE_CHARS)
    # Guests only: logged-in shoppers' history is loaded from the DB, not trusted from the browser.
    history: list[ChatTurn] = Field(default_factory=list, max_length=MAX_HISTORY_TURNS * 2)
    page: PageContext | None = None


class PageResults(BaseModel):
    """Search matches the website shows as product cards on the page (not inside the chat bubble)."""

    title: str
    total_matches: int = Field(description="All matches in the DB; products holds at most MAX_PAGE_RESULTS")
    products: list[ProductCard]
    search: PageSearch = Field(description="The exact filters that produced these cards")


class HistoryMessage(BaseModel):
    """One saved chat message, as returned by GET /api/chat/history."""

    id: int
    role: Literal["user", "assistant"]
    content: str
    products: list[ProductCard] = Field(default_factory=list)
    page: PageResults | None = None
    created_at: str


class ChatReply(BaseModel):
    reply: str
    products: list[ProductCard] = Field(default_factory=list, description="A few specific items, shown in the chat")
    page: PageResults | None = Field(default=None, description="Browse results, shown as cards on the page")
    fact_check: FactCheck | None = Field(default=None, description="Set when the reply quoted prices or stock counts")
    user_message: str | None = Field(default=None, description="The shopper's message after redaction, if anything was removed")
    redacted: list[str] = Field(default_factory=list, description="Kinds of sensitive data removed, e.g. 'card number'")


# ---------- agent ----------


class PageSearch(BaseModel):
    """A catalogue search the website should run and show on the page. The server re-runs it on the DB."""

    title: str = Field(description='Short heading for the results, e.g. "Hoodies", "Navy crewnecks under $60"')
    query: str = Field(default="", description="Search words, e.g. 'crest', 'Branford', 'Harvard game'. Empty if filters say it all.")
    category: str | None = Field(default=None, description="Hoodies, Crewnecks, T-Shirts, Quarter-Zips, Jackets, or Long Sleeves")
    color: str | None = None
    size: str | None = Field(default=None, description="Only items in stock in this size")
    min_price: float | None = None
    max_price: float | None = None


class ShopReply(BaseModel):
    """The agent's final answer."""

    reply: str = Field(description="Your message to the shopper, in Markdown. Short and friendly.")
    product_ids: list[str] = Field(
        default_factory=list,
        max_length=MAX_CARDS,
        description=(
            "product_id values (copied exactly from tool results) of the items you recommend or discuss, "
            "best match first. They appear as clickable cards under your reply. Empty if none."
        ),
    )
    page_search: PageSearch | None = Field(
        default=None,
        description=(
            "Set when the shopper is browsing a TYPE or SET of items ('what hoodies do you have?', "
            "'navy crewnecks under $60', 'show me Branford stuff'). The website runs this search and shows "
            "every match as product cards on the page. Use the same filters you searched with. "
            "Leave null for questions about one specific item, or when nothing matched."
        ),
    )


class Customer(BaseModel):
    """The logged-in shopper as the agent sees them. Deliberately no password hash, no session data."""

    id: int
    first_name: str
    last_name: str
    email: str


class ViewedProduct(BaseModel):
    product_id: str
    name: str
    category: str


class ViewContext(BaseModel):
    """PageContext after the server checked it against the DB (product names never come from the browser)."""

    path: str
    page: Literal["home", "products", "product", "about", "login", "create-account", "other"]
    product: ViewedProduct | None = None
    category: str | None = None
    query: str | None = None


class AccountInfo(BaseModel):
    """get_my_account result."""

    logged_in: bool
    first_name: str | None = None
    last_name: str | None = None
    email: str | None = None
    member_since: str | None = None
    saved_messages: int = 0


class AuditEntry(BaseModel):
    """One line of output/audit_trail.json (append-only record of agent-loop activity)."""

    time: str = Field(description="UTC ISO-8601 timestamp")
    run_id: str = Field(description="Groups every entry from one chat message's agent run")
    step: int = Field(description="Model request number within the run (0 = before the first request)")
    event: Literal["run_start", "model_response", "tool_call", "tool_result", "retry", "final_output", "run_end", "blocked"]
    name: str = Field(description="Full name: agent, model:<id>, or campus_customs_assistant.<tool>")
    args: str | None = Field(default=None, description="Short JSON preview of the input")
    result: str | None = Field(default=None, description="Short preview of the output")
    stop_reason: str | None = Field(default=None, description="Why a model turn or the run ended")
    tokens: dict[str, int] | None = None
    duration_s: float | None = None
    extra: dict | None = None


class FactCheck(BaseModel):
    """What the output validator verified in a reply (shown as a badge in the chat)."""

    prices_checked: int = 0
    stock_counts_checked: int = 0
    corrected: bool = Field(default=False, description="The first draft had a wrong number and was fixed")
    passed: bool = True


@dataclass
class ShopDeps:
    """Per-request context for the agent and its tools: who is chatting, what page they're on,
    and what the tools returned this turn (so the fact-checker can verify the reply)."""

    customer: Customer | None = None
    view: ViewContext | None = None
    account_looked_up: bool = False  # get_my_account is offered once per message
    redacted: list[str] = field(default_factory=list)  # kinds of sensitive data removed from the message
    allowed_amounts: set[float] = field(default_factory=set)  # dollar amounts the shopper typed (budgets)
    seen_prices: set[float] = field(default_factory=set)
    seen_quantities: set[int] = field(default_factory=set)
    seen_ids: set[str] = field(default_factory=set)
    fact_check: FactCheck | None = None
