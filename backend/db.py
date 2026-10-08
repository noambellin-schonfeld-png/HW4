"""SQLite access for data/campus_customs.db."""

from __future__ import annotations

import sqlite3
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
DB_PATH = DATA_DIR / "campus_customs.db"


def connect(readonly: bool = True) -> sqlite3.Connection:
    uri = f"file:{DB_PATH}?mode={'ro' if readonly else 'rw'}"
    conn = sqlite3.connect(uri, uri=True)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_schema() -> None:
    """Create tables the shop adds on top of the seed DB (idempotent)."""
    with connect(readonly=False) as conn:
        conn.execute(
            """CREATE TABLE IF NOT EXISTS sessions (
                   token_hash TEXT PRIMARY KEY,
                   user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                   created_at TEXT NOT NULL DEFAULT (datetime('now')),
                   expires_at TEXT NOT NULL
               )"""
        )
        conn.execute("CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)")
        # Chat memory: the seed DB's chat_messages table, plus the page grid an assistant reply showed.
        cols = {r["name"] for r in conn.execute("PRAGMA table_info(chat_messages)")}
        if "page_json" not in cols:
            conn.execute("ALTER TABLE chat_messages ADD COLUMN page_json TEXT")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_chat_messages_user ON chat_messages(user_id, id)")
        conn.execute("DELETE FROM sessions WHERE expires_at <= datetime('now')")
