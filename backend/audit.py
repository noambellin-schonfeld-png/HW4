"""Append-only audit trail of agent-loop activity → output/audit_trail.json.

One chat message = one agent run = several entries, all sharing a run_id:
  run_start → model_response → tool_call → tool_result → … → (retry) → run_end
plus "blocked" entries for messages stopped before the agent (rate limit).

The file is a JSON array that only ever grows: each write re-reads the existing entries, appends,
and atomically replaces the file (temp file + os.replace) under a lock, so overlapping requests
can't lose or corrupt entries. It is never truncated. If it is ever unreadable, it is moved aside
(audit_trail.corrupt-<time>.json), not deleted.

Privacy: logs the user id (not email), the already-redacted message, and short previews only.
"""

from __future__ import annotations

import json
import os
import threading
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from pydantic_ai.messages import (
    ModelMessage,
    ModelRequest,
    ModelResponse,
    RetryPromptPart,
    TextPart,
    ToolCallPart,
    ToolReturnPart,
)

from models import AuditEntry

AUDIT_FILE = Path(__file__).resolve().parent.parent / "output" / "audit_trail.json"
AGENT_NAME = "campus_customs_assistant"
PREVIEW_CHARS = 240
_lock = threading.Lock()


def now_iso(ts: datetime | None = None) -> str:
    return (ts or datetime.now(timezone.utc)).astimezone(timezone.utc).isoformat(timespec="milliseconds")


def short(value: Any, limit: int = PREVIEW_CHARS) -> str:
    """Compact one-line preview of args/results."""
    if hasattr(value, "model_dump"):
        value = value.model_dump(mode="json", exclude_none=True)
    text = value if isinstance(value, str) else json.dumps(value, ensure_ascii=False, default=str)
    text = " ".join(text.split())
    return text if len(text) <= limit else text[: limit - 1] + "…"


def append(entries: list[AuditEntry]) -> None:
    """Append entries to the JSON array on disk (never rewrites or drops earlier entries)."""
    if not entries:
        return
    with _lock:
        AUDIT_FILE.parent.mkdir(parents=True, exist_ok=True)
        existing: list[Any] = []
        if AUDIT_FILE.exists():
            try:
                existing = json.loads(AUDIT_FILE.read_text(encoding="utf-8") or "[]")
                if not isinstance(existing, list):
                    raise ValueError("audit trail is not a JSON array")
            except ValueError:
                AUDIT_FILE.rename(AUDIT_FILE.with_name(f"audit_trail.corrupt-{int(time.time())}.json"))
                existing = []
        existing.extend(e.model_dump(mode="json", exclude_none=True) for e in entries)
        tmp = AUDIT_FILE.with_suffix(".json.tmp")
        tmp.write_text(json.dumps(existing, ensure_ascii=False, indent=1), encoding="utf-8")
        os.replace(tmp, AUDIT_FILE)


class AuditRun:
    """Collects one agent run's activity and writes it with record()."""

    def __init__(self, message: str, user: str, page: str | None, redacted: list[str], model: str):
        self.run_id = uuid.uuid4().hex[:12]
        self.started = time.monotonic()
        self.model = model
        self.start = AuditEntry(
            time=now_iso(),
            run_id=self.run_id,
            step=0,
            event="run_start",
            name=AGENT_NAME,
            args=short({"message": message, "user": user, "page": page, "redacted": redacted or None}),
        )

    def record(
        self,
        messages: list[ModelMessage],
        history_len: int,
        stop_reason: str,
        result: Any = None,
        extra: dict[str, Any] | None = None,
    ) -> None:
        entries = [self.start]
        step = 0
        tokens_in = tokens_out = 0
        for msg in messages[history_len:]:
            if isinstance(msg, ModelResponse):
                step += 1
                usage = msg.usage
                tokens_in += usage.input_tokens
                tokens_out += usage.output_tokens
                calls = [p for p in msg.parts if isinstance(p, ToolCallPart)]
                text = " ".join(p.content for p in msg.parts if isinstance(p, TextPart))
                entries.append(
                    AuditEntry(
                        time=now_iso(msg.timestamp),
                        run_id=self.run_id,
                        step=step,
                        event="model_response",
                        name=f"model:{msg.model_name or self.model}",
                        result=short(text) if text else f"{len(calls)} tool call(s): {', '.join(c.tool_name for c in calls)}",
                        tokens={"input": usage.input_tokens, "cached": usage.cache_read_tokens, "output": usage.output_tokens},
                        stop_reason=str(msg.finish_reason) if getattr(msg, "finish_reason", None) else None,
                    )
                )
                for c in calls:
                    is_output = c.tool_name == "final_result"
                    entries.append(
                        AuditEntry(
                            time=now_iso(msg.timestamp),
                            run_id=self.run_id,
                            step=step,
                            event="final_output" if is_output else "tool_call",
                            name=f"{AGENT_NAME}.{c.tool_name}",
                            args=short(c.args_as_dict()),
                        )
                    )
            elif isinstance(msg, ModelRequest):
                for p in msg.parts:
                    if isinstance(p, ToolReturnPart) and p.tool_name != "final_result":
                        entries.append(
                            AuditEntry(
                                time=now_iso(p.timestamp),
                                run_id=self.run_id,
                                step=step,
                                event="tool_result",
                                name=f"{AGENT_NAME}.{p.tool_name}",
                                result=short(p.content),
                            )
                        )
                    elif isinstance(p, RetryPromptPart):
                        entries.append(
                            AuditEntry(
                                time=now_iso(p.timestamp),
                                run_id=self.run_id,
                                step=step,
                                event="retry",
                                name=f"{AGENT_NAME}.{p.tool_name or 'output_validator'}",
                                result=short(p.content if isinstance(p.content, str) else p.model_response()),
                            )
                        )
        entries.append(
            AuditEntry(
                time=now_iso(),
                run_id=self.run_id,
                step=step,
                event="run_end",
                name=AGENT_NAME,
                result=short(result) if result is not None else None,
                stop_reason=stop_reason,
                tokens={"input": tokens_in, "output": tokens_out},
                duration_s=round(time.monotonic() - self.started, 2),
                extra=extra,
            )
        )
        append(entries)


def blocked(user: str, reason: str, detail: str) -> None:
    """A message stopped before the agent ran (e.g. rate limit)."""
    append(
        [
            AuditEntry(
                time=now_iso(),
                run_id=uuid.uuid4().hex[:12],
                step=0,
                event="blocked",
                name="api.chat",
                args=short({"user": user}),
                result=detail,
                stop_reason=reason,
            )
        ]
    )
