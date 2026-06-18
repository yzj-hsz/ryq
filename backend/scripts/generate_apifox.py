"""根据 Flask 路由生成 Apifox 可导入的 OpenAPI 3.0 JSON（客户端 / 管理端分组）。"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

BACKEND = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND))

from raoyouqu import create_app  # noqa: E402

SKIP = {"/static", "/migrations"}
ADMIN_PREFIX = "/api/v1/admin"
CLIENT_TAG = "客户端"
ADMIN_TAG = "管理端"

METHODS = {"GET", "POST", "PATCH", "PUT", "DELETE"}
PATH_PARAM_RE = re.compile(r"<(?:[^:>]+:)?([^>]+)>")


def _tag_for(rule: str) -> str:
    if rule.startswith(ADMIN_PREFIX):
        return ADMIN_TAG
    return CLIENT_TAG


def _summary(rule: str, method: str) -> str:
    name = rule.replace("/api/v1/admin", "").replace("/api/v1", "") or "/"
    return f"{method} {name}"


def _normalize_rule(rule: str) -> str:
    return PATH_PARAM_RE.sub(r"{\1}", rule)


def _path_parameters(rule: str) -> list[dict]:
    return [
        {
            "name": name,
            "in": "path",
            "required": True,
            "schema": {"type": "string"},
        }
        for name in PATH_PARAM_RE.findall(rule)
    ]


def _request_body(rule: str, method: str) -> dict | None:
    if method not in ("POST", "PATCH", "PUT"):
        return None
    if rule in ("/api/v1/upload", "/api/v1/admin/upload"):
        return {
            "required": True,
            "content": {
                "multipart/form-data": {
                    "schema": {
                        "type": "object",
                        "properties": {
                            "file": {"type": "string", "format": "binary"},
                        },
                        "required": ["file"],
                    }
                }
            },
        }
    return {
        "required": True,
        "content": {
            "application/json": {
                "schema": {"type": "object", "additionalProperties": True}
            }
        },
    }


def _security(rule: str, method: str) -> list:
    public_suffixes = (
        "/auth/wechat",
        "/auth/send-code",
        "/auth/email-login",
        "/admin/auth/login",
    )
    if any(rule.endswith(s) for s in public_suffixes):
        return []
    if rule.startswith(ADMIN_PREFIX):
        return [{"AdminBearer": []}]
    if rule.startswith("/api/v1/auth") or rule in ("/api/v1/me",):
        return [{"UserBearer": []}]
    if method in ("GET",) and not rule.startswith("/api/v1/me"):
        if "/admin/" not in rule:
            return []
    if rule.startswith("/api/v1/me") or rule == "/api/v1/upload":
        return [{"UserBearer": []}]
    if rule == "/api/v1/analytics/events":
        return []
    return [{"UserBearer": []}] if "/me/" in rule else []


def build_openapi() -> dict:
    app = create_app()
    paths: dict = {}

    for rule in sorted(app.url_map.iter_rules(), key=lambda r: r.rule):
        if rule.rule in SKIP or "static" in rule.rule:
            continue
        if not rule.rule.startswith("/api/v1"):
            continue

        normalized_rule = _normalize_rule(rule.rule)
        path_item = paths.setdefault(normalized_rule, {})
        for method in rule.methods - {"HEAD", "OPTIONS"}:
            if method not in METHODS:
                continue
            op: dict = {
                "tags": [_tag_for(rule.rule)],
                "summary": _summary(rule.rule, method),
                "responses": {
                    "200": {
                        "description": "成功",
                        "content": {
                            "application/json": {
                                "schema": {"type": "object"}
                            }
                        },
                    }
                },
            }
            params = _path_parameters(rule.rule)
            if params:
                op["parameters"] = params
            sec = _security(rule.rule, method)
            if sec:
                op["security"] = sec
            request_body = _request_body(rule.rule, method)
            if request_body:
                op["requestBody"] = request_body
            path_item[method.lower()] = op

    return {
        "openapi": "3.0.1",
        "info": {
            "title": "饶有趣 API",
            "description": (
                "1.0 展示型公益文化平台 REST API。\n\n"
                "**客户端**：小程序 `/api/v1`，公开读接口无需 Token；"
                "`/me/*`、`/upload` 需 User Token。\n\n"
                "**管理端**：`/api/v1/admin/*`，需 Admin Token（`POST /api/v1/admin/auth/login` 获取）。\n\n"
                "认证：`Authorization: Bearer <token>`。\n\n"
                "本文档由 `backend/scripts/generate_apifox.py` 根据当前 Flask 路由生成，请勿手工维护旧版副本。"
            ),
            "version": "1.0.0",
        },
        "servers": [{"url": "http://127.0.0.1:5000", "description": "本地开发"}],
        "tags": [
            {"name": CLIENT_TAG, "description": "小程序端接口"},
            {"name": ADMIN_TAG, "description": "后台管理端接口"},
        ],
        "paths": paths,
        "components": {
            "securitySchemes": {
                "UserBearer": {
                    "type": "http",
                    "scheme": "bearer",
                    "bearerFormat": "JWT",
                    "description": "小程序用户 Token",
                },
                "AdminBearer": {
                    "type": "http",
                    "scheme": "bearer",
                    "bearerFormat": "JWT",
                    "description": "管理员 Token",
                },
            }
        },
    }


def main() -> None:
    out = BACKEND.parent / "apifox.json"
    doc = build_openapi()
    out.write_text(json.dumps(doc, ensure_ascii=False, indent=2), encoding="utf-8")
    client_n = sum(1 for p in doc["paths"] if not p.startswith(ADMIN_PREFIX))
    admin_n = sum(1 for p in doc["paths"] if p.startswith(ADMIN_PREFIX))
    print(f"Wrote {out} (client paths: {client_n}, admin paths: {admin_n})")


if __name__ == "__main__":
    main()
