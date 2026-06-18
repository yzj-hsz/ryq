"""微信小程序 jscode2session、access_token、手机号解密（服务端）。"""
from __future__ import annotations

import hashlib
import os
import time
from typing import Any

import requests

_token_cache: dict[str, Any] = {"access_token": "", "expires_at": 0.0}


def _appid_secret() -> tuple[str | None, str | None]:
    return os.environ.get("WX_APPID"), os.environ.get("WX_SECRET")


def _allow_dev_mock() -> bool:
    explicit = os.environ.get("WECHAT_ALLOW_MOCK")
    if explicit is not None:
        return explicit.strip().lower() in {"1", "true", "yes", "on"}
    app_env = os.environ.get("APP_ENV", os.environ.get("FLASK_ENV", "development")).lower()
    return app_env in {"development", "dev", "local"}


def jscode2session(js_code: str) -> dict[str, Any]:
    """
    返回 {openid, session_key, unionid?} 或 {errcode, errmsg}
    仅允许开发环境在未配置 WX_APPID/WX_SECRET 时走占位逻辑。
    """
    appid, secret = _appid_secret()
    if not appid or not secret:
        if _allow_dev_mock():
            h = hashlib.sha256(js_code.encode()).hexdigest()[:24]
            return {
                "openid": f"dev_{h}",
                "session_key": "dev_session_key",
                "unionid": None,
            }
        return {"errcode": "wechat_config_missing", "errmsg": "WX_APPID or WX_SECRET is not configured"}
    r = requests.get(
        "https://api.weixin.qq.com/sns/jscode2session",
        params={
            "appid": appid,
            "secret": secret,
            "js_code": js_code,
            "grant_type": "authorization_code",
        },
        timeout=15,
    )
    data = r.json()
    if data.get("errcode"):
        return {"errcode": data.get("errcode"), "errmsg": data.get("errmsg", "")}
    return {
        "openid": data.get("openid"),
        "session_key": data.get("session_key"),
        "unionid": data.get("unionid"),
    }


def get_client_credential_access_token() -> str | None:
    appid, secret = _appid_secret()
    if not appid or not secret:
        if _allow_dev_mock():
            return "dev_access_token"
        return None
    now = time.time()
    if _token_cache["access_token"] and now < _token_cache["expires_at"] - 120:
        return _token_cache["access_token"]
    r = requests.get(
        "https://api.weixin.qq.com/cgi-bin/token",
        params={
            "grant_type": "client_credential",
            "appid": appid,
            "secret": secret,
        },
        timeout=15,
    )
    data = r.json()
    if data.get("errcode"):
        return None
    token = data.get("access_token")
    expires = int(data.get("expires_in", 7200))
    if token:
        _token_cache["access_token"] = token
        _token_cache["expires_at"] = now + expires
    return token


def get_phone_pure_number(phone_code: str) -> tuple[str | None, str | None]:
    """
    使用 getPhoneNumber 返回的 code 换手机号。
    返回 (phone, error_message)；仅开发环境允许在未配置时返回占位号。
    """
    appid, secret = _appid_secret()
    if not appid or not secret:
        if _allow_dev_mock():
            h = hashlib.md5(phone_code.encode()).hexdigest()[:10]
            return f"138{h[:8]}", None
        return None, "微信配置缺失"

    access = get_client_credential_access_token()
    if not access:
        return None, "无法获取 access_token"

    r = requests.post(
        f"https://api.weixin.qq.com/wxa/business/getuserphonenumber?access_token={access}",
        json={"code": phone_code},
        timeout=15,
    )
    data = r.json()
    if data.get("errcode") not in (0, None):
        return None, data.get("errmsg") or str(data.get("errcode"))

    info = (data.get("phone_info") or {}) if isinstance(data, dict) else {}
    phone = info.get("purePhoneNumber") or info.get("phoneNumber")
    if not phone:
        return None, "未解析到手机号"
    return str(phone), None
