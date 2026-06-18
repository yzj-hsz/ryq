from __future__ import annotations

import re
from datetime import timedelta
import random
import os
import uuid

from flask import Blueprint, current_app, jsonify, request
from werkzeug.security import check_password_hash

from .auth_tokens import create_token, decode_token
from .email_client import get_email_client
from .models import (
    AdminUser,
    EmailVerificationCode,
    MiniappUser,
    UserDiyRecord,
    UserFavorite,
    db,
)
from .time_utils import utc_now
from .wechat_client import jscode2session

auth_bp = Blueprint("auth", __name__)

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

def _jwt_secret() -> str:
    return current_app.config.get("JWT_SECRET") or os.environ.get(
        "JWT_SECRET", "dev-jwt-secret-change-in-production"
    )


def _normalize_email(raw: str) -> str:
    return raw.strip().lower()


def _valid_email(email: str) -> bool:
    return bool(email and EMAIL_RE.match(email))


def _email_required_response():
    return jsonify({"error": "email_required", "message": "请输入邮箱地址"}), 400


def _email_invalid_response():
    return jsonify({"error": "email_invalid", "message": "邮箱格式不正确"}), 400


def _code_required_response():
    return jsonify({"error": "code_required", "message": "请输入验证码"}), 400


def _user_payload(user: MiniappUser) -> dict:
    return {
        "id": user.id,
        "username": user.username,
        "avatar_url": user.avatar_url,
        "email": user.email,
        "role": user.role,
        "created_at": user.created_at.isoformat() if user.created_at else None,
    }


def _bearer_token() -> str | None:
    h = (request.headers.get("Authorization") or "").strip()
    if h.lower().startswith("bearer "):
        return h[7:].strip() or None
    if h.count(".") == 2:
        return h
    q = (request.args.get("token") or "").strip()
    if q.count(".") == 2:
        return q
    x = (request.headers.get("X-Token") or "").strip()
    if x.count(".") == 2:
        return x
    return None


def require_user_token():
    token = _bearer_token()
    if not token:
        return None, (jsonify({"error": "missing_token"}), 401)
    try:
        payload = decode_token(token, _jwt_secret())
    except Exception:
        return None, (jsonify({"error": "invalid_token"}), 401)
    if payload.get("typ") != "user":
        return None, (jsonify({"error": "wrong_token_type"}), 401)
    uid = int(payload["sub"])
    user = db.session.get(MiniappUser, uid)
    if not user:
        return None, (jsonify({"error": "user_not_found"}), 404)
    return user, None


def require_admin_token():
    token = _bearer_token()
    if not token:
        return None, (jsonify({"error": "missing_token"}), 401)
    try:
        payload = decode_token(token, _jwt_secret())
    except Exception:
        return None, (jsonify({"error": "invalid_token"}), 401)
    
    typ = payload.get("typ")
    uid = int(payload["sub"])
    
    if typ == "admin":
        admin = db.session.get(AdminUser, uid)
        if not admin:
            return None, (jsonify({"error": "admin_not_found"}), 404)
        if not admin.is_active:
            return None, (jsonify({"error": "admin_inactive"}), 403)
        return admin, None
    else:
        return None, (jsonify({"error": "wrong_token_type"}), 401)


def _latest_email_code(email: str) -> EmailVerificationCode | None:
    return (
        EmailVerificationCode.query.filter_by(email=email)
        .order_by(EmailVerificationCode.created_at.desc())
        .first()
    )


def _validate_email_code(email: str, code: str):
    stored = _latest_email_code(email)
    if not stored:
        return None, (jsonify({"error": "code_not_found", "message": "请先获取验证码"}), 400)
    if stored.used_at is not None:
        return None, (jsonify({"error": "code_used", "message": "验证码已使用，请重新获取"}), 400)
    if stored.expired_at <= utc_now():
        return None, (jsonify({"error": "code_expired", "message": "验证码已过期"}), 400)
    if stored.code != code:
        return None, (jsonify({"error": "invalid_code", "message": "验证码错误"}), 400)
    return stored, None


def _consume_email_code(row: EmailVerificationCode) -> None:
    row.used_at = utc_now()


def _save_email_code(email: str, code: str) -> None:
    now = utc_now()
    EmailVerificationCode.query.filter(
        EmailVerificationCode.email == email,
        EmailVerificationCode.used_at.is_(None),
    ).delete(synchronize_session=False)
    db.session.add(
        EmailVerificationCode(
            email=email,
            code=code,
            created_at=now,
            expired_at=now + timedelta(minutes=5),
        )
    )
    db.session.commit()


@auth_bp.post("/auth/wechat")
def auth_wechat():
    """微信登录：body { code }。"""
    body = request.get_json(silent=True) or {}
    code = (body.get("code") or "").strip()
    if not code:
        return jsonify({"error": "code_required"}), 400

    sess = jscode2session(code)
    if sess.get("errcode"):
        return jsonify(
            {"error": "wechat_error", "detail": sess.get("errmsg", "")}
        ), 400
    openid = sess.get("openid")
    if not openid:
        return jsonify({"error": "no_openid"}), 400

    user = MiniappUser.query.filter_by(openid=openid).first()
    if not user:
        user = MiniappUser(
            openid=openid,
            unionid=sess.get("unionid"),
            session_key=sess.get("session_key") or "",
            email=None,
            username=f"用户{openid[-6:]}",
            avatar_url=None,
            last_visit_at=utc_now(),
        )
        db.session.add(user)
        db.session.commit()
    else:
        user.session_key = sess.get("session_key") or user.session_key
        user.unionid = sess.get("unionid") or user.unionid
        user.last_visit_at = utc_now()
        db.session.commit()

    token = create_token(user.id, "user", _jwt_secret())
    return jsonify({"token": token, "user": _user_payload(user)})


@auth_bp.post("/auth/email")
def auth_bind_email():
    """已登录用户绑定邮箱：body { email, code }。"""
    user, err = require_user_token()
    if err:
        return err

    body = request.get_json(silent=True) or {}
    email = _normalize_email(body.get("email") or "")
    code = (body.get("code") or "").strip()
    if not email:
        return _email_required_response()
    if not _valid_email(email):
        return _email_invalid_response()
    if not code:
        return _code_required_response()

    other = MiniappUser.query.filter(
        MiniappUser.email == email, MiniappUser.id != user.id
    ).first()
    if other:
        return jsonify({"error": "email_taken"}), 409

    code_row, verify_err = _validate_email_code(email, code)
    if verify_err:
        return verify_err

    user.email = email
    _consume_email_code(code_row)
    db.session.commit()

    token = create_token(user.id, "user", _jwt_secret())
    return jsonify({"token": token, "user": _user_payload(user)})


@auth_bp.post("/auth/send-code")
def auth_send_code():
    """发送邮箱验证码：body { email }。"""
    body = request.get_json(silent=True) or {}
    email = _normalize_email(body.get("email") or "")
    if not email:
        return _email_required_response()
    if not _valid_email(email):
        return _email_invalid_response()

    code = f"{random.randint(100000, 999999)}"
    client = get_email_client()
    if not client.send_code(email, code):
        return jsonify({"error": "email_send_failed", "message": "邮件发送失败，请稍后再试"}), 500

    _save_email_code(email, code)
    return jsonify({"ok": True, "msg": "验证码已发送至邮箱"})


@auth_bp.post("/auth/email-login")
def auth_email_login():
    """邮箱 + 验证码登录/注册：body { email, code, username? }。"""
    body = request.get_json(silent=True) or {}
    email = _normalize_email(body.get("email") or "")
    code = (body.get("code") or "").strip()
    username = (body.get("username") or "").strip()

    if not email:
        return _email_required_response()
    if not _valid_email(email):
        return _email_invalid_response()
    if not code:
        return _code_required_response()

    code_row, verify_err = _validate_email_code(email, code)
    if verify_err:
        return verify_err

    user = MiniappUser.query.filter_by(email=email).first()
    if not user:
        if not username:
            username = f"邮箱用户{email.split('@')[0][:8]}"
        user = MiniappUser(
            openid=f"email_{email}",
            unionid=None,
            session_key="",
            email=email,
            username=username,
            last_visit_at=utc_now(),
        )
        db.session.add(user)
        db.session.commit()
    else:
        user.last_visit_at = utc_now()

    _consume_email_code(code_row)
    db.session.commit()
    token = create_token(user.id, "user", _jwt_secret())
    return jsonify({"token": token, "user": _user_payload(user)})


@auth_bp.post("/auth/guest")
def auth_guest():
    """访客登录：创建一个随机的游客账号。"""
    guest_id = uuid.uuid4().hex[:8]
    openid = f"guest_{guest_id}"
    user = MiniappUser(
        openid=openid,
        username=f"访客{guest_id}",
        role="tourist",
        last_visit_at=utc_now(),
    )
    db.session.add(user)
    db.session.commit()

    token = create_token(user.id, "user", _jwt_secret(), days=1)
    return jsonify({"token": token, "user": _user_payload(user)})


@auth_bp.post("/admin/auth/login")
def admin_login():
    """管理员登录：仅支持 AdminUser，避免后台写入跨身份域外键。"""
    body = request.get_json(silent=True) or {}
    username = (body.get("username") or "").strip()
    password = body.get("password") or ""

    if not username or not password:
        return jsonify({"error": "username_password_required"}), 400

    # 1. 先查 AdminUser 表
    admin = AdminUser.query.filter_by(username=username).first()
    if admin:
        if not check_password_hash(admin.password_hash, password):
            return jsonify({"error": "invalid_credentials"}), 401
        
        admin.last_login_at = utc_now()
        db.session.commit()
        token = create_token(admin.id, "admin", _jwt_secret(), days=1)
        return jsonify({
            "token": token,
            "admin": {
                "id": admin.id,
                "username": admin.username,
                "display_name": admin.display_name,
                "email": admin.email,
            },
        })

    return jsonify({"error": "invalid_credentials"}), 401
