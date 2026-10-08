"""Customer chat memory — logged-in shoppers' conversations in the chat_messages table.

Each exchange is two rows (role 'user' then 'assistant'). An assistant row also stores:
- products_json: the chat cards it showed, as a JSON list of {product_id, ...}
- page_json:     the PageSearch it put on the page (filters only, not the cards)
On reload, cards and page grids are rebuilt from the current catalogue, so prices and stock are
never stale. Seed rows (which stored full catalogue rows in products_json) load the same way.
"""

from __future__ import annotations

import json

from db import connect
from models import MAX_HISTORY_TURNS, ChatReply, ChatTurn, HistoryMessage, PageSearch
from tools import cards_for, page_results

MAX_LOADED_MESSAGES = 100  # shown in the chat panel; the agent gets the last MAX_HISTORY_TURNS turns


def load_history(user_id: int, limit: int = MAX_LOADED_MESSAGES) -> list[HistoryMessage]:
    """The shopper's most recent saved messages, oldest first."""
    with connect() as conn:
        rows = conn.execute(
            """SELECT id, role, content, products_json, page_json, created_at FROM chat_messages
               WHERE user_id = ? ORDER BY id DESC LIMIT ?""",
            (user_id, limit),
        ).fetchall()
    out = []
    for r in reversed(rows):
        ids = [p["product_id"] for p in json.loads(r["products_json"] or "[]") if isinstance(p, dict) and "product_id" in p]
        page = page_results(PageSearch.model_validate_json(r["page_json"])) if r["page_json"] else None
        out.append(
            HistoryMessage(
                id=r["id"],
                role=r["role"],
                content=r["content"],
                products=cards_for(ids),
                page=page,
                created_at=r["created_at"],
            )
        )
    return out


def recent_turns(user_id: int) -> list[ChatTurn]:
    """The last MAX_HISTORY_TURNS exchanges as plain text, for the agent's message history."""
    with connect() as conn:
        rows = conn.execute(
            "SELECT role, content FROM chat_messages WHERE user_id = ? ORDER BY id DESC LIMIT ?",
            (user_id, MAX_HISTORY_TURNS * 2),
        ).fetchall()
    return [ChatTurn(role=r["role"], content=r["content"]) for r in reversed(rows)]


def save_exchange(user_id: int, message: str, reply: ChatReply) -> None:
    """Store the shopper's message and the assistant's reply together (one transaction)."""
    products = json.dumps([{"product_id": p.product_id, "name": p.name} for p in reply.products]) if reply.products else None
    page = reply.page.search.model_dump_json() if reply.page else None
    with connect(readonly=False) as conn:
        conn.execute("INSERT INTO chat_messages (user_id, role, content) VALUES (?, 'user', ?)", (user_id, message))
        conn.execute(
            "INSERT INTO chat_messages (user_id, role, content, products_json, page_json) VALUES (?, 'assistant', ?, ?, ?)",
            (user_id, reply.reply, products, page),
        )


def clear_history(user_id: int) -> int:
    with connect(readonly=False) as conn:
        return conn.execute("DELETE FROM chat_messages WHERE user_id = ?", (user_id,)).rowcount


