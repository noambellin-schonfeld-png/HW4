"""Campus Customs API — products, product images, accounts (auth.py), and the shop chat agent (agent.py).

Run from this directory:
  uvicorn main:app --reload --port 8000        (or .venv/bin/uvicorn …)

Frontend (Vite) at http://127.0.0.1:5173 proxies /api and /images here.
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import Literal

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic_ai.exceptions import UsageLimitExceeded

from agent import MODEL_NAME, run_chat
from audit import blocked
from auth import current_user, require_user
from auth import router as auth_router
from db import DATA_DIR, DB_PATH, connect, init_schema
from guards import ChatRateLimiter, redact_sensitive
from memory import clear_history, load_history, recent_turns, save_exchange
from models import ChatReply, ChatRequest, Customer, HistoryMessage, ProductCard, ProductDetail
from tools import CATEGORIES, LOW_STOCK, normalize_size, product_detail, resolve_view, search_catalogue

log = logging.getLogger("campus_customs")
chat_limiter = ChatRateLimiter(per_minute=10, per_hour=120)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    init_schema()
    yield


app = FastAPI(title="Campus Customs", version="0.3.0", lifespan=lifespan)
# The Vite dev server proxies /api, so the browser sees one origin; CORS is only for direct dev access.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5173", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(auth_router)
# Only the product photos are public — never mount data/ itself (it holds the database).
app.mount("/images/products", StaticFiles(directory=DATA_DIR / "products"), name="product-images")


@app.get("/api/health")
def health():
    with connect() as conn:
        products = conn.execute("SELECT COUNT(*) FROM catalogue").fetchone()[0]
    return {"ok": True, "db": DB_PATH.name, "products": products, "model": MODEL_NAME}


@app.get("/api/categories")
def categories() -> list[str]:
    return [name for name, _ in CATEGORIES]


SORTS = {
    "featured": None,  # search relevance, then name
    "price-asc": lambda c: (c.price, c.name),
    "price-desc": lambda c: (-c.price, c.name),
    "name": lambda c: c.name.lower(),
}


@app.get("/api/products")
def list_products(
    q: str | None = None,
    category: str | None = None,
    size: str | None = None,
    sort: Literal["featured", "price-asc", "price-desc", "name"] = "featured",
) -> list[ProductCard]:
    """Products page grid. `size` keeps only items in stock in that size and adds an "Only N left" note."""
    wanted = normalize_size(size) if size else None
    if size and wanted is None:
        raise HTTPException(status_code=422, detail="Unknown size. Use XS, S, M, L, XL or XXL.")
    cards = []
    for card, sizes in search_catalogue(q or "", category, size=wanted, match_all=True):
        if wanted and sizes.get(wanted, 0) <= LOW_STOCK:
            card.stock_note = f"Only {sizes[wanted]} left in {wanted}"
        cards.append(card)
    if key := SORTS[sort]:
        cards.sort(key=key)
    return cards


@app.get("/api/products/{product_id}")
def get_product(product_id: str) -> ProductDetail:
    detail = product_detail(product_id)
    if detail is None:
        raise HTTPException(status_code=404, detail="Product not found")
    return detail


@app.post("/api/chat")
async def chat(body: ChatRequest, request: Request, user: dict | None = Depends(current_user)) -> ChatReply:
    """One shopper message in, the agent's reply (+ product cards) out.

    Logged-in: history comes from chat_messages (the browser's copy is ignored) and the exchange is saved.
    Guests: history comes from the request and nothing is stored.
    """
    customer = Customer(**user) if user else None
    key = f"user:{customer.id}" if customer else f"ip:{request.client.host if request.client else '?'}"
    if (wait := chat_limiter.check(key)) is not None:
        blocked(key if customer else "guest", "rate_limited", f"retry after {wait}s")
        raise HTTPException(429, f"You're sending messages very quickly. Please wait {wait} seconds and try again.")

    # Card numbers, passwords, etc. are removed before the model, the logs, or the DB ever see them.
    message, redacted = redact_sensitive(body.message.strip())
    if customer:
        history = recent_turns(customer.id)
    else:
        history = [t.model_copy(update={"content": redact_sensitive(t.content)[0]}) for t in body.history]
    try:
        reply = await run_chat(message, history, customer, resolve_view(body.page), redacted)
    except UsageLimitExceeded:
        log.warning("chat hit usage limits: %r", message[:200])
        return ChatReply(
            reply="Sorry, that one took me too many steps. Could you ask in a simpler way, "
            "like the item type, color, or size you're after?"
        )
    except Exception:
        log.exception("chat failed")
        raise HTTPException(
            status_code=502, detail="The shop assistant is having trouble right now. Please try again."
        ) from None
    if redacted:
        reply.redacted = redacted
        reply.user_message = message
    if customer:
        save_exchange(customer.id, message, reply)
    return reply


@app.get("/api/chat/history")
def chat_history(user: dict = Depends(require_user)) -> list[HistoryMessage]:
    """The logged-in shopper's saved chat, oldest first (cards rebuilt from today's catalogue)."""
    return load_history(user["id"])


@app.delete("/api/chat/history")
def delete_chat_history(user: dict = Depends(require_user)) -> dict:
    return {"deleted": clear_history(user["id"])}
