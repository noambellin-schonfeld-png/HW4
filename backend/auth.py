"""Accounts, password hashing, and cookie sessions.

Password hash formats (users.password_hash):
- New:    pbkdf2_sha256$<iterations>$<salt>$<hex digest>   (600,000 iterations, 16-byte random salt)
- Legacy: pbkdf2_sha256$<salt>$<hex digest>                (seed DB rows; 120,000 iterations)
Legacy hashes are verified and then upgraded to the new format on successful login.

Sessions: a random token goes to the browser in an HttpOnly cookie; only its SHA-256 is stored in `sessions`.
"""

from __future__ import annotations

import hashlib
import hmac
import os
import re
import secrets
import sqlite3
import time
from collections import defaultdict, deque

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, Field, field_validator

from db import connect

ALGO = "pbkdf2_sha256"
ITERATIONS = 600_000  # OWASP 2023 recommendation for PBKDF2-HMAC-SHA256
LEGACY_ITERATIONS = 120_000  # seed DB hashes (iteration count not stored in the string)
MIN_PASSWORD = 8
MAX_PASSWORD = 128  # caps hashing cost per request

COOKIE = "cc_session"
SESSION_DAYS = 7
COOKIE_SECURE = os.getenv("COOKIE_SECURE", "false").lower() == "true"  # set true behind HTTPS

MAX_FAILURES_PER_EMAIL = 5
MAX_FAILURES_PER_IP = 20  # several shoppers can share one IP (dorm, campus Wi-Fi)
LOCKOUT_SECONDS = 300
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


# ---------- password hashing ----------


def _pbkdf2(password: str, salt: str, iterations: int) -> str:
    return hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), iterations).hex()


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    return f"{ALGO}${ITERATIONS}${salt}${_pbkdf2(password, salt, ITERATIONS)}"


def verify_password(password: str, stored: str) -> tuple[bool, bool]:
    """Returns (ok, needs_rehash)."""
    parts = stored.split("$")
    if len(parts) == 4 and parts[0] == ALGO and parts[1].isdigit():
        _, iters, salt, digest = parts
        iterations = int(iters)
    elif len(parts) == 3 and parts[0] == ALGO:
        _, salt, digest = parts
        iterations = LEGACY_ITERATIONS
    else:
        return False, False
    ok = hmac.compare_digest(_pbkdf2(password, salt, iterations), digest)
    return ok, ok and (len(parts) == 3 or iterations < ITERATIONS)


# Burned on unknown emails so response time doesn't reveal which emails have accounts.
_DUMMY_HASH = hash_password(secrets.token_hex(8))


# ---------- brute-force throttle (in memory, per email and per IP) ----------

_failures: dict[str, deque[float]] = defaultdict(deque)


def _recent(key: str) -> deque[float]:
    q = _failures[key]
    while q and q[0] < time.monotonic() - LOCKOUT_SECONDS:
        q.popleft()
    return q


def _check_throttle(*keys: str) -> None:
    if any(len(_recent(k)) >= (MAX_FAILURES_PER_IP if k.startswith("ip:") else MAX_FAILURES_PER_EMAIL) for k in keys):
        raise HTTPException(429, "Too many failed attempts. Please wait a few minutes and try again.")


def _record_failure(*keys: str) -> None:
    for k in keys:
        _recent(k).append(time.monotonic())


# ---------- sessions ----------


def _token_hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def _start_session(conn: sqlite3.Connection, response: Response, user_id: int) -> None:
    token = secrets.token_urlsafe(32)
    conn.execute(
        "INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, datetime('now', ?))",
        (_token_hash(token), user_id, f"+{SESSION_DAYS} days"),
    )
    response.set_cookie(
        COOKIE,
        token,
        max_age=SESSION_DAYS * 86400,
        httponly=True,
        samesite="lax",
        secure=COOKIE_SECURE,
        path="/",
    )


def public_user(row: sqlite3.Row) -> dict:
    """The only user fields that ever leave the server — never the password hash."""
    return {
        "id": row["id"],
        "email": row["email"],
        "first_name": row["first_name"] or row["name"].split(" ")[0],
        "last_name": row["last_name"] or "",
    }


def current_user(request: Request) -> dict | None:
    token = request.cookies.get(COOKIE)
    if not token:
        return None
    with connect() as conn:
        row = conn.execute(
            """SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
               WHERE s.token_hash = ? AND s.expires_at > datetime('now')""",
            (_token_hash(token),),
        ).fetchone()
    return public_user(row) if row else None


def require_user(user: dict | None = Depends(current_user)) -> dict:
    if user is None:
        raise HTTPException(401, "Please log in.")
    return user


# ---------- API ----------


def _normalize_email(v: str) -> str:
    v = v.strip().lower()
    if not EMAIL_RE.match(v) or len(v) > 254:
        raise ValueError("Enter a valid email address.")
    return v


class SignupRequest(BaseModel):
    first_name: str = Field(min_length=1, max_length=60)
    last_name: str = Field(min_length=1, max_length=60)
    email: str
    password: str = Field(min_length=MIN_PASSWORD, max_length=MAX_PASSWORD)

    @field_validator("first_name", "last_name")
    @classmethod
    def _strip(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Required.")
        return v

    @field_validator("email")
    @classmethod
    def _email(cls, v: str) -> str:
        return _normalize_email(v)


class LoginRequest(BaseModel):
    email: str = Field(max_length=254)
    password: str = Field(max_length=MAX_PASSWORD)


router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/signup", status_code=201)
def signup(body: SignupRequest, response: Response):
    with connect(readonly=False) as conn:
        try:
            cur = conn.execute(
                "INSERT INTO users (name, email, password_hash, first_name, last_name) VALUES (?, ?, ?, ?, ?)",
                (
                    f"{body.first_name} {body.last_name}",
                    body.email,
                    hash_password(body.password),
                    body.first_name,
                    body.last_name,
                ),
            )
        except sqlite3.IntegrityError:
            raise HTTPException(409, "An account with that email already exists. Try logging in.") from None
        _start_session(conn, response, cur.lastrowid)
        row = conn.execute("SELECT * FROM users WHERE id = ?", (cur.lastrowid,)).fetchone()
    return {"user": public_user(row)}


@router.post("/login")
def login(body: LoginRequest, request: Request, response: Response):
    email = body.email.strip().lower()
    ip = request.client.host if request.client else "?"
    keys = (f"email:{email}", f"ip:{ip}")
    _check_throttle(*keys)
    with connect(readonly=False) as conn:
        row = conn.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
        ok, needs_rehash = verify_password(body.password, row["password_hash"] if row else _DUMMY_HASH)
        if not (row and ok):
            _record_failure(*keys)
            raise HTTPException(401, "Incorrect email or password.")
        if needs_rehash:
            conn.execute("UPDATE users SET password_hash = ? WHERE id = ?", (hash_password(body.password), row["id"]))
        _start_session(conn, response, row["id"])
    _failures.pop(keys[0], None)
    return {"user": public_user(row)}


@router.post("/logout")
def logout(request: Request, response: Response):
    token = request.cookies.get(COOKIE)
    if token:
        with connect(readonly=False) as conn:
            conn.execute("DELETE FROM sessions WHERE token_hash = ?", (_token_hash(token),))
    response.delete_cookie(COOKIE, path="/")
    return {"ok": True}


@router.get("/me")
def me(user: dict | None = Depends(current_user)):
    return {"user": user}
