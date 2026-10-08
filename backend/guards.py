"""Guardrails around the shop agent.

- find_unverified_numbers — the price/stock fact-checker used by the agent's output validator
- redact_sensitive — removes card numbers, passwords, and SSNs before the model or the DB sees them
- ChatRateLimiter — caps chat messages per shopper/IP to control cost and abuse
"""

from __future__ import annotations

import re
import time
from collections import defaultdict, deque

# ---------------------------------------------------------------- fact-checker

# "$68", "$68.00", "$ 1,234.5"
_PRICE_RE = re.compile(r"\$\s?(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?)")
# "5 left", "only 3 left", "20 in stock", "12 available", "**8** left"
_STOCK_RE = re.compile(r"\b(\d{1,4})\**\s+(?:left|in stock|available|remaining|units?)\b", re.I)


def amounts_in(text: str) -> list[float]:
    return [float(m.replace(",", "")) for m in _PRICE_RE.findall(text)]


def find_unverified_numbers(
    reply: str, seen_prices: set[float], seen_quantities: set[int], allowed_amounts: set[float]
) -> tuple[list[float], list[int], int, int]:
    """Prices and stock counts in the reply that no tool returned this turn.

    Returns (bad_prices, bad_counts, prices_checked, counts_checked). Dollar amounts the shopper typed
    themselves (a budget like "under $50") are allowed.
    """
    prices = amounts_in(reply)
    counts = [int(n) for n in _STOCK_RE.findall(reply)]
    ok_prices = seen_prices | allowed_amounts
    bad_prices = sorted({p for p in prices if not any(abs(p - q) < 0.005 for q in ok_prices)})
    bad_counts = sorted({c for c in counts if c not in seen_quantities})
    return bad_prices, bad_counts, len(prices), len(counts)


# ---------------------------------------------------------------- sensitive data

_CARD_RE = re.compile(r"\b(?:\d[ -]?){12,18}\d\b")
_SSN_RE = re.compile(r"\b\d{3}-\d{2}-\d{4}\b")
_PASSWORD_RE = re.compile(
    r"\b(pass(?:word|code|wd)?|pwd|pw)\b(\s*(?:is|was|=|:)\s*)(\S+)",
    re.I,
)
_CVV_RE = re.compile(r"\b(cvv|cvc|security code)\b(\s*(?:is|=|:)?\s*)(\d{3,4})\b", re.I)


def _luhn_ok(digits: str) -> bool:
    total, alt = 0, False
    for ch in reversed(digits):
        d = int(ch)
        if alt:
            d = d * 2 - 9 if d > 4 else d * 2
        total += d
        alt = not alt
    return total % 10 == 0


def redact_sensitive(text: str) -> tuple[str, list[str]]:
    """Replace payment cards (Luhn-valid 13-19 digits), CVVs, SSNs and 'my password is …' with placeholders."""
    found: list[str] = []

    def card(m: re.Match) -> str:
        digits = re.sub(r"\D", "", m.group(0))
        if 13 <= len(digits) <= 19 and _luhn_ok(digits):
            found.append("card number")
            return "[card number removed]"
        return m.group(0)

    text = _CARD_RE.sub(card, text)
    if _CVV_RE.search(text):
        found.append("card security code")
        text = _CVV_RE.sub(lambda m: f"{m.group(1)}{m.group(2)}[removed]", text)
    if _SSN_RE.search(text):
        found.append("Social Security number")
        text = _SSN_RE.sub("[SSN removed]", text)
    if _PASSWORD_RE.search(text):
        found.append("password")
        text = _PASSWORD_RE.sub(lambda m: f"{m.group(1)}{m.group(2)}[password removed]", text)
    return text, sorted(set(found))


# ---------------------------------------------------------------- rate limit


class ChatRateLimiter:
    """Sliding-window limits per key (user id or IP). In memory: resets when the server restarts."""

    def __init__(self, per_minute: int = 10, per_hour: int = 120):
        self.limits = [(60.0, per_minute), (3600.0, per_hour)]
        self._hits: dict[str, deque[float]] = defaultdict(deque)

    def check(self, key: str) -> int | None:
        """Record a hit. Returns None if allowed, else seconds to wait."""
        now = time.monotonic()
        hits = self._hits[key]
        while hits and hits[0] < now - 3600:
            hits.popleft()
        for window, limit in self.limits:
            recent = [t for t in hits if t >= now - window]
            if len(recent) >= limit:
                return int(recent[0] + window - now) + 1
        hits.append(now)
        return None
