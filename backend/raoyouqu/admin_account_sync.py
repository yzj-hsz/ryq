from __future__ import annotations

from flask import jsonify
from sqlalchemy import or_

from .models import AdminUser, MiniappUser, db


def derived_admin_email(user: MiniappUser) -> str:
    return user.email or f"miniapp-admin-{user.id}@ryq.local"


def find_linked_admin_user(user: MiniappUser) -> AdminUser | None:
    candidates = [AdminUser.email == derived_admin_email(user)]
    if user.email:
        candidates.append(AdminUser.email == user.email)
    if user.username:
        candidates.append(AdminUser.username == user.username)
    return AdminUser.query.filter(or_(*candidates)).order_by(AdminUser.id.asc()).first()


def ensure_admin_account(
    user: MiniappUser, *, password_hash: str | None = None
) -> tuple[AdminUser | None, tuple | None]:
    admin = find_linked_admin_user(user)
    admin_email = derived_admin_email(user)

    query = AdminUser.query.filter(
        or_(AdminUser.username == user.username, AdminUser.email == admin_email)
    )
    if admin:
        query = query.filter(AdminUser.id != admin.id)
    conflict = query.first()
    if conflict:
        return None, (
            jsonify(
                {
                    "error": "admin_account_conflict",
                    "message": "该用户名已被后台管理员使用，请先修改用户名后再授权管理员。",
                }
            ),
            409,
        )

    if not admin:
        if not password_hash:
            return None, (
                jsonify(
                    {
                        "error": "admin_password_required",
                        "message": "成为管理员时必须同时设置管理端登录密码。",
                    }
                ),
                400,
            )
        admin = AdminUser(
            username=user.username,
            password_hash=password_hash,
            display_name=user.username,
            email=admin_email,
            is_active=True,
        )
        db.session.add(admin)
        return admin, None

    admin.username = user.username
    admin.display_name = user.username
    admin.email = admin_email
    admin.is_active = True
    if password_hash:
        admin.password_hash = password_hash
    if not admin.password_hash:
        return None, (
            jsonify(
                {
                    "error": "admin_password_required",
                    "message": "该管理员账号尚未设置登录密码，请先设置密码。",
                }
            ),
            400,
        )
    return admin, None


def deactivate_linked_admin_user(user: MiniappUser) -> None:
    admin = find_linked_admin_user(user)
    if admin:
        admin.is_active = False
