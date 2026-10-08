"""Catalogue / inventory access and the tools the shop agent can call.

Both the website routes (main.py) and the agent read through these functions, so the
price and stock a shopper sees on a product page are exactly what the bot quotes.
Every call re-reads SQLite, so stock is never stale.

Agent tools (registered in agent.py), each returning a typed model from models.py:
- search_products → SearchResult — find items by words + filters (category, color, size in stock, price range)
- get_product_details → ProductInfo — one item's full description, colors, price, and stock per size
- get_price → PriceInfo — one item's price
- check_stock → StockInfo — one item's stock, for one size or all sizes
- list_categories → list[str]
- get_my_account → AccountInfo — the logged-in shopper's own profile (from ShopDeps)
Lookups that fail return LookupFailed (with did_you_mean) instead of guessing.
"""

from __future__ import annotations

import json
import re
import sqlite3

from pydantic_ai import RunContext

from db import connect
from models import (
    MAX_PAGE_RESULTS,
    SIZE_ORDER,
    AccountInfo,
    LookupFailed,
    PageResults,
    PageSearch,
    PriceInfo,
    ProductCard,
    ProductDetail,
    ProductInfo,
    ProductSummary,
    SearchResult,
    SizeStock,
    PageContext,
    ShopDeps,
    SoldOutInSize,
    StockInfo,
    ViewContext,
    ViewedProduct,
)

LOW_STOCK = 5
MAX_SEARCH_RESULTS = 12

# garment_type is free text ("short-sleeve T-shirt", "pullover hoodie", …);
# first keyword match wins, so the more specific categories come first.
CATEGORIES: list[tuple[str, tuple[str, ...]]] = [
    ("Quarter-Zips", ("quarter-zip",)),
    ("Jackets", ("jacket", "full-zip")),
    ("Hoodies", ("hood",)),
    ("Crewnecks", ("crewneck", "mockneck", "sweatshirt")),
    ("Long Sleeves", ("long-sleeve",)),
    ("T-Shirts", ("t-shirt",)),
]

# Shoppers say "tee", "grey", "1/4 zip"; the catalogue says "t-shirt", "gray", "quarter-zip".
_PHRASES = [
    (r"\b(t[\s-]?shirts?|tees?)\b", " tshirt "),
    (r"\b(quarter[\s-]?zips?|1/4[\s-]?zips?|1-4[\s-]?zips?|half[\s-]?zips?)\b", " quarterzip "),
    (r"\b(hood(ie|ies|y|ed)?|hoodys)\b", " hoodie "),
    (r"\b(crew[\s-]?necks?|crews)\b", " crewneck "),
    (r"\b(sweaters?|sweatshirts?)\b", " sweatshirt "),
    (r"\b(long[\s-]?sleeves?)\b", " longsleeve "),
    (r"\b(short[\s-]?sleeves?)\b", " shortsleeve "),
    (r"\bgrey\b", "gray"),
]
_STOPWORDS = set(
    "a an the and or for to of in on with my me i we you your do does have has any some something "
    "show find want need looking look like get got is are it its that this what which please can could "
    "would item items thing things one ones size sizes cheap under over around about".split()
)


def category_of(garment_type: str) -> str:
    g = garment_type.lower()
    return next((name for name, keys in CATEGORIES if any(k in g for k in keys)), "Other")


def _normalize(text: str) -> str:
    text = text.lower()
    for pattern, repl in _PHRASES:
        text = re.sub(pattern, repl, text)
    return text


def _category_key(text: str) -> str:
    """'Hoodies', 'hoodie', 'T-shirts', 'tees' -> 'hoodie', 'tshirt' so shopper wording matches CATEGORIES."""
    return re.sub(r"[^a-z0-9]", "", _normalize(text)).rstrip("s")


def _tokens(text: str) -> list[str]:
    out = []
    for t in re.findall(r"[a-z0-9]+", _normalize(text)):
        if t in _STOPWORDS:
            continue
        out.append(t[:-1] if len(t) > 3 and t.endswith("s") and not t.endswith("ss") else t)
    return out


def _card(row: sqlite3.Row, total_stock: int) -> ProductCard:
    return ProductCard(
        product_id=row["product_id"],
        name=row["name"],
        garment_type=row["garment_type"],
        category=category_of(row["garment_type"]),
        description=row["description"],
        colors=json.loads(row["colors"]),
        price=row["price"],
        image_url=f"/images/{row['image_file_path']}",
        total_stock=total_stock,
    )


def _load() -> tuple[list[sqlite3.Row], dict[str, dict[str, int]]]:
    with connect() as conn:
        rows = conn.execute("SELECT * FROM catalogue ORDER BY name").fetchall()
        stock: dict[str, dict[str, int]] = {}
        for pid, size, qty in conn.execute("SELECT product_id, size, quantity FROM inventory"):
            stock.setdefault(pid, {})[size] = qty
    return rows, stock


def _status(qty: int) -> str:
    return "out" if qty == 0 else "low" if qty <= LOW_STOCK else "in"


# ---------------------------------------------------------------- shared by website + agent


def search_catalogue(
    query: str = "",
    category: str | None = None,
    color: str | None = None,
    size: str | None = None,
    min_price: float | None = None,
    max_price: float | None = None,
    match_all: bool = False,
) -> list[tuple[ProductCard, dict[str, int]]]:
    """Filter + rank products. match_all=True (website search box) keeps only items matching every word;
    False (agent) ranks items by how many words match, best first."""
    rows, stock = _load()
    size = size.upper().strip() if size else None
    color_q = _normalize(color).strip() if color else None
    cat_q = _category_key(category) if category else None
    q_tokens = _tokens(query)

    scored: list[tuple[float, ProductCard, dict[str, int]]] = []
    for row in rows:
        sizes = stock.get(row["product_id"], {})
        card = _card(row, sum(sizes.values()))
        if cat_q and _category_key(card.category) != cat_q:
            continue
        if color_q and not any(color_q in _normalize(c) for c in card.colors):
            continue
        if size and sizes.get(size, 0) <= 0:
            continue
        if min_price is not None and card.price < min_price:
            continue
        if max_price is not None and card.price > max_price:
            continue

        score = 0.0
        if q_tokens:
            fields = [
                (3.0, _tokens(card.name)),
                (2.0, _tokens(card.garment_type)),
                (2.0, _tokens(" ".join(card.colors))),
                (2.0, _tokens(" ".join(json.loads(row["search_tags"])))),
                (1.0, _tokens(card.description)),
            ]
            matched = 0
            for t in set(q_tokens):
                best = max((w for w, toks in fields if t in toks), default=0.0)
                matched += best > 0
                score += best
            if matched == 0 or (match_all and matched < len(set(q_tokens))):
                continue
        scored.append((score, card, sizes))

    scored.sort(key=lambda x: (-x[0], x[1].name))
    return [(card, sizes) for _, card, sizes in scored]


def product_detail(product_id: str) -> ProductDetail | None:
    with connect() as conn:
        row = conn.execute("SELECT * FROM catalogue WHERE product_id = ?", (product_id,)).fetchone()
        if row is None:
            return None
        stock = dict(conn.execute("SELECT size, quantity FROM inventory WHERE product_id = ?", (product_id,)).fetchall())
    return ProductDetail(
        **_card(row, sum(stock.values())).model_dump(),
        search_tags=json.loads(row["search_tags"]),
        sizes=[SizeStock(size=s, quantity=stock[s], status=_status(stock[s])) for s in SIZE_ORDER if s in stock],
    )


def cards_for(product_ids: list[str]) -> list[ProductCard]:
    """Cards for ids the agent chose, in its order. Unknown ids are dropped (no invented products on screen)."""
    rows, stock = _load()
    by_id = {r["product_id"]: r for r in rows}
    out, seen = [], set()
    for pid in product_ids:
        if pid in by_id and pid not in seen:
            seen.add(pid)
            out.append(_card(by_id[pid], sum(stock.get(pid, {}).values())))
    return out


def page_results(search: PageSearch) -> PageResults | None:
    """Re-run the agent's page_search on the DB and return every match as cards for the page.

    Items must match every search word (like the Products search box); if that finds nothing,
    fall back to the best-ranked partial matches. Returns None when nothing matches at all.
    """
    size = normalize_size(search.size) if search.size else None
    if search.size and size is None:
        size = None  # unknown size (e.g. XXXL): show the items without a size filter
    args = (search.query, search.category, search.color, size, search.min_price, search.max_price)
    matches = search_catalogue(*args, match_all=True) or search_catalogue(*args)[:12]
    if not matches:
        return None
    clean = search.model_copy(update={"size": size})
    return PageResults(
        title=search.title.strip() or "Matches",
        total_matches=len(matches),
        products=[card for card, _ in matches[:MAX_PAGE_RESULTS]],
        search=clean,
    )


# ---------------------------------------------------------------- agent tools
# Each tool re-reads the DB and returns a typed model from models.py. A product the tools can't
# find comes back as LookupFailed (with did_you_mean ids) — never a guess at a different item.

_SIZE_ALIASES = {
    "XS": "XS", "XSMALL": "XS", "EXTRASMALL": "XS",
    "S": "S", "SM": "S", "SMALL": "S",
    "M": "M", "MD": "M", "MED": "M", "MEDIUM": "M",
    "L": "L", "LG": "L", "LARGE": "L",
    "XL": "XL", "XLARGE": "XL", "EXTRALARGE": "XL",
    "XXL": "XXL", "2XL": "XXL", "XXLARGE": "XXL", "2XLARGE": "XXL", "EXTRAEXTRALARGE": "XXL",
}


def normalize_size(size: str | None) -> str | None:
    """'medium' -> 'M', '2XL' -> 'XXL'. Returns None for sizes the shop doesn't sell (e.g. XXXL)."""
    if size is None:
        return None
    return _SIZE_ALIASES.get(re.sub(r"[^A-Z0-9]", "", size.upper()))


def _resolve(product: str) -> tuple[ProductDetail | None, LookupFailed | None]:
    """Find one product by exact product_id, else by exact name (case-insensitive)."""
    detail = product_detail(product.strip())
    if detail is None:
        rows, _ = _load()
        by_name = {r["name"].lower(): r["product_id"] for r in rows}
        if pid := by_name.get(product.strip().lower()):
            detail = product_detail(pid)
    if detail is not None:
        return detail, None
    close = [card.product_id for card, _ in search_catalogue(product.replace("-", " "))[:3]]
    return None, LookupFailed(
        error=f"No product matches {product!r} exactly. Do not guess; use one of did_you_mean or search_products.",
        did_you_mean=close,
    )


def _summary(card: ProductCard, sizes: dict[str, int]) -> ProductSummary:
    return ProductSummary(
        product_id=card.product_id,
        name=card.name,
        category=card.category,
        price_usd=card.price,
        colors=card.colors,
        description=card.description,
        sizes_in_stock=[s for s in SIZE_ORDER if sizes.get(s, 0) > 0],
        sold_out_sizes=[s for s in SIZE_ORDER if s in sizes and sizes[s] == 0],
    )


def _record(ctx: RunContext[ShopDeps], prices=(), quantities=(), ids=()) -> None:
    """Remember what the tools returned this turn; the fact-checker only accepts numbers seen here."""
    ctx.deps.seen_prices.update(float(p) for p in prices)
    ctx.deps.seen_quantities.update(int(q) for q in quantities)
    ctx.deps.seen_ids.update(ids)


def search_products(
    ctx: RunContext[ShopDeps],
    query: str = "",
    category: str | None = None,
    color: str | None = None,
    size: str | None = None,
    min_price: float | None = None,
    max_price: float | None = None,
    limit: int = 8,
) -> SearchResult | LookupFailed:
    """Search the Campus Customs catalogue. Returns real products with price and which sizes are in stock.

    Args:
        query: Words describing what the shopper wants, e.g. "crest hoodie", "Branford", "Harvard game tee". Can be empty when only filters are used.
        category: One of Hoodies, Crewnecks, T-Shirts, Quarter-Zips, Jackets, Long Sleeves.
        color: A color such as navy, gray, white, red.
        size: Only return items with stock in this size (XS, S, M, L, XL, XXL). Hides items sold out in that size.
        min_price: Lowest price in USD.
        max_price: Highest price in USD.
        limit: Max results (1-12).
    """
    if size is not None and normalize_size(size) is None:
        return LookupFailed(error=f"We don't sell size {size!r}.", valid_sizes=SIZE_ORDER)
    size = normalize_size(size)
    results = search_catalogue(query, category, color, size, min_price, max_price)
    limit = max(1, min(limit, MAX_SEARCH_RESULTS))
    sold_out = None
    if size:
        # Items that match everything except stock in this size — so "sold out in XS" never looks like "doesn't exist".
        shown = {card.product_id for card, _ in results[:limit]}
        without_size = search_catalogue(query, category, color, None, min_price, max_price)[:limit]
        names = [card.name for card, _ in without_size if card.product_id not in shown]
        sold_out = SoldOutInSize(size=size, products=names) if names else None
    shown = results[:limit]
    _record(
        ctx,
        prices=[card.price for card, _ in shown],
        quantities=[len(results)],
        ids=[card.product_id for card, _ in shown],
    )
    return SearchResult(
        total_matches=len(results),
        products=[_summary(card, sizes) for card, sizes in shown],
        sold_out_in_requested_size=sold_out,
    )


def get_product_details(ctx: RunContext[ShopDeps], product: str) -> ProductInfo | LookupFailed:
    """Everything about one product: full description, garment type, colors, price, and exact stock per size.
    Use for "tell me about…", "what color/what's it like?" questions.

    Args:
        product: The product_id from search_products (e.g. "basic-hoodie-big-yale") or the product's exact name.
    """
    detail, failed = _resolve(product)
    if failed:
        return failed
    _record(ctx, [detail.price], [s.quantity for s in detail.sizes] + [detail.total_stock], [detail.product_id])
    return ProductInfo(
        product_id=detail.product_id,
        name=detail.name,
        garment_type=detail.garment_type,
        category=detail.category,
        description=detail.description,
        colors=detail.colors,
        price_usd=detail.price,
        total_in_stock=detail.total_stock,
        sizes=detail.sizes,
    )


def get_price(ctx: RunContext[ShopDeps], product: str) -> PriceInfo | LookupFailed:
    """The current price of one product, straight from the catalogue. Use for "how much is…?" questions.

    Args:
        product: The product_id from search_products or the product's exact name.
    """
    detail, failed = _resolve(product)
    if failed:
        return failed
    _record(ctx, [detail.price], ids=[detail.product_id])
    return PriceInfo(product_id=detail.product_id, name=detail.name, price_usd=detail.price)


def check_stock(ctx: RunContext[ShopDeps], product: str, size: str | None = None) -> StockInfo | LookupFailed:
    """How many of a product are in stock right now: for one size if the shopper names one, else every size.
    Use for "is it in stock?", "do you have it in medium?", "how many are left?" questions.

    Args:
        product: The product_id from search_products or the product's exact name.
        size: Optional size the shopper asked about: XS, S, M, L, XL, XXL (also accepts "medium", "2XL", …).
    """
    detail, failed = _resolve(product)
    if failed:
        return failed
    wanted = normalize_size(size)
    if size is not None and wanted is None:
        return LookupFailed(error=f"We don't sell size {size!r} in any product.", valid_sizes=SIZE_ORDER)
    by_size = {s.size: s for s in detail.sizes}
    quantity = by_size[wanted].quantity if wanted in by_size else (0 if wanted else detail.total_stock)
    _record(ctx, quantities=[s.quantity for s in detail.sizes] + [detail.total_stock], ids=[detail.product_id])
    return StockInfo(
        product_id=detail.product_id,
        name=detail.name,
        size_requested=wanted,
        in_stock=quantity > 0,
        quantity=quantity,
        sizes=detail.sizes,
        sizes_in_stock=[s.size for s in detail.sizes if s.quantity > 0],
        sold_out_sizes=[s.size for s in detail.sizes if s.quantity == 0],
    )


def list_categories() -> list[str]:
    """List the product categories the shop carries."""
    return [name for name, _ in CATEGORIES]


def get_my_account(ctx: RunContext[ShopDeps]) -> AccountInfo:
    """The logged-in shopper's member-since date and number of saved chat messages. Guests get logged_in=false.
    Not needed for their name or email: those are already in your instructions. Call at most once."""
    ctx.deps.account_looked_up = True
    c = ctx.deps.customer
    if c is None:
        return AccountInfo(logged_in=False)
    with connect() as conn:
        created = conn.execute("SELECT created_at FROM users WHERE id = ?", (c.id,)).fetchone()
        saved = conn.execute("SELECT COUNT(*) FROM chat_messages WHERE user_id = ?", (c.id,)).fetchone()[0]
    return AccountInfo(
        logged_in=True,
        first_name=c.first_name,
        last_name=c.last_name,
        email=c.email,
        member_since=created["created_at"][:10] if created else None,
        saved_messages=saved,
    )


async def offer_account_once(ctx: RunContext[ShopDeps], tool_def):
    """Tool `prepare` hook: hide get_my_account after it has been called once in this message."""
    return None if ctx.deps.account_looked_up else tool_def


# ---------------------------------------------------------------- page context

_PAGES = {"/": "home", "/products": "products", "/about": "about", "/login": "login", "/create-account": "create-account"}


def resolve_view(page: PageContext | None) -> ViewContext | None:
    """Check the widget's page info against the DB. The product name comes from the catalogue, never the browser."""
    if page is None:
        return None
    path = page.path.split("?")[0].rstrip("/") or "/"
    product = None
    if page.product_id:
        if detail := product_detail(page.product_id):
            product = ViewedProduct(product_id=detail.product_id, name=detail.name, category=detail.category)
    kind = "product" if product else _PAGES.get(path, "other")
    category = page.category if page.category in {name for name, _ in CATEGORIES} else None
    return ViewContext(path=path, page=kind, product=product, category=category, query=(page.query or None))
