from __future__ import annotations

import io
import sys
from pathlib import Path

import pytest
from PIL import Image
from werkzeug.security import generate_password_hash


BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from raoyouqu import create_app  # noqa: E402
from raoyouqu.auth_tokens import create_token  # noqa: E402
from raoyouqu.models import (  # noqa: E402
    AdminUser,
    ColorCardDimension,
    ColorCardOption,
    MiniappUser,
    db,
)


@pytest.fixture()
def app(tmp_path, monkeypatch):
    db_path = tmp_path / "test.db"
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{db_path.as_posix()}")
    monkeypatch.setenv("APP_ENV", "test")
    monkeypatch.setenv("JWT_SECRET", "test-secret")
    monkeypatch.setenv("EMAIL_PROVIDER", "mock")
    monkeypatch.setenv("WECHAT_ALLOW_MOCK", "false")
    monkeypatch.setenv("ALLOW_PLACEHOLDER_SEED_DATA", "false")

    app = create_app()
    app.config.update(
        TESTING=True,
        SQLALCHEMY_DATABASE_URI=f"sqlite:///{db_path.as_posix()}",
        UPLOAD_FOLDER=tmp_path / "uploads",
    )
    app.config["UPLOAD_FOLDER"].mkdir(parents=True, exist_ok=True)

    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()


@pytest.fixture()
def client(app):
    return app.test_client()


def create_admin(app, username: str = "admin", password: str = "admin123") -> int:
    with app.app_context():
        admin = AdminUser(
            username=username,
            password_hash=generate_password_hash(password),
            display_name="测试管理员",
            email=f"{username}@example.com",
            is_active=True,
        )
        db.session.add(admin)
        db.session.commit()
        return admin.id


def create_user(app, *, email: str | None = None, role: str = "worker") -> int:
    with app.app_context():
        user = MiniappUser(
            openid=f"test_{role}_{email or 'user'}",
            email=email,
            username="测试用户",
            role=role,
            session_key="session",
        )
        db.session.add(user)
        db.session.commit()
        return user.id


def user_token(app, user_id: int) -> str:
    return create_token(user_id, "user", app.config["JWT_SECRET"])


def admin_token(app, admin_id: int) -> str:
    return create_token(admin_id, "admin", app.config["JWT_SECRET"], days=1)


def make_png_bytes(color: str = "red") -> bytes:
    image = Image.new("RGB", (8, 8), color=color)
    buf = io.BytesIO()
    image.save(buf, format="PNG")
    return buf.getvalue()


def seed_color_card_options(app) -> dict[str, int]:
    with app.app_context():
        dims = {
            "fabric": ColorCardDimension(code="fabric", name="布料", sort_order=0),
            "pattern": ColorCardDimension(code="pattern", name="花纹", sort_order=1),
            "mordant": ColorCardDimension(code="mordant", name="媒染剂", sort_order=2),
            "dye_time": ColorCardDimension(code="dye_time", name="浸染时间", sort_order=3),
        }
        db.session.add_all(dims.values())
        db.session.flush()

        options = {
            "fabric_option_id": ColorCardOption(
                dimension_id=dims["fabric"].id, name="棉布", sort_order=0
            ),
            "pattern_option_id": ColorCardOption(
                dimension_id=dims["pattern"].id, name="纯色", sort_order=0
            ),
            "mordant_option_id": ColorCardOption(
                dimension_id=dims["mordant"].id, name="明矾", sort_order=0
            ),
            "time_option_id": ColorCardOption(
                dimension_id=dims["dye_time"].id, name="10分钟", sort_order=0
            ),
        }
        db.session.add_all(options.values())
        db.session.commit()
        return {key: value.id for key, value in options.items()}
