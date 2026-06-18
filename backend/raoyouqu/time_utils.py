from __future__ import annotations

from datetime import datetime, timezone


def utc_now() -> datetime:
    """Return a naive UTC datetime built from a timezone-aware clock.

    The project currently stores UTC timestamps in naive DATETIME columns.
    Using ``datetime.now(timezone.utc)`` avoids deprecated ``utcnow()`` calls while
    keeping the persisted values compatible with the existing schema.
    """

    return datetime.now(timezone.utc).replace(tzinfo=None)
