from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

import jwt


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def create_token(
    subject_id: int,
    token_type: str,
    secret: str,
    days: int = 30,
) -> str:
    payload: dict[str, Any] = {
        "sub": str(subject_id),
        "typ": token_type,
        "exp": _utcnow() + timedelta(days=days),
        "iat": _utcnow(),
    }
    return jwt.encode(payload, secret, algorithm="HS256")


def decode_token(token: str, secret: str) -> dict[str, Any]:
    return jwt.decode(token, secret, algorithms=["HS256"])
