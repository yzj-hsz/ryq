from __future__ import annotations

import io
from datetime import timedelta

from raoyouqu.models import EmailVerificationCode, RoleAccessToken, TaskShowcase, UserTask, db
from raoyouqu.time_utils import utc_now

from .conftest import admin_token, create_admin, create_user, make_png_bytes, user_token


def test_email_code_login_persists_and_is_single_use(app, client):
    email = "tester@example.com"

    send_res = client.post("/api/v1/auth/send-code", json={"email": email})
    assert send_res.status_code == 200

    with app.app_context():
        row = (
            EmailVerificationCode.query.filter_by(email=email)
            .order_by(EmailVerificationCode.created_at.desc())
            .first()
        )
        assert row is not None
        assert row.used_at is None
        code = row.code

    login_res = client.post(
        "/api/v1/auth/email-login",
        json={"email": email, "code": code, "username": "邮箱用户"},
    )
    assert login_res.status_code == 200
    assert login_res.get_json()["token"]

    with app.app_context():
        used_row = (
            EmailVerificationCode.query.filter_by(email=email)
            .order_by(EmailVerificationCode.created_at.desc())
            .first()
        )
        assert used_row is not None
        assert used_row.used_at is not None

    reuse_res = client.post(
        "/api/v1/auth/email-login",
        json={"email": email, "code": code, "username": "邮箱用户"},
    )
    assert reuse_res.status_code == 400
    assert reuse_res.get_json()["error"] == "code_used"


def test_admin_endpoint_rejects_user_token(app, client):
    user_id = create_user(app, email="user@example.com", role="worker")
    token = user_token(app, user_id)

    res = client.get(
        "/api/v1/admin/dashboard/summary",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert res.status_code == 401
    assert res.get_json()["error"] == "wrong_token_type"


def test_user_upload_accepts_real_image(app, client):
    user_id = create_user(app, email="upload@example.com", role="worker")
    token = user_token(app, user_id)

    res = client.post(
        "/api/v1/upload",
        headers={"Authorization": f"Bearer {token}"},
        data={"file": (io.BytesIO(make_png_bytes()), "avatar.png")},
        content_type="multipart/form-data",
    )

    assert res.status_code == 200
    body = res.get_json()
    assert body["url"].startswith("/static/uploads/")
    assert body["file_type"] == "image"
    assert body["mime_type"] == "image/png"
    assert (app.config["UPLOAD_FOLDER"] / body["filename"]).exists()


def test_user_upload_rejects_fake_image_content(app, client):
    user_id = create_user(app, email="invalid@example.com", role="worker")
    token = user_token(app, user_id)

    res = client.post(
        "/api/v1/upload",
        headers={"Authorization": f"Bearer {token}"},
        data={"file": (io.BytesIO(b"not-a-real-image"), "avatar.png")},
        content_type="multipart/form-data",
    )

    assert res.status_code == 400
    assert res.get_json()["error"] == "invalid_file_content"


def test_admin_upload_accepts_video_header(app, client):
    admin_id = create_admin(app)
    token = admin_token(app, admin_id)
    fake_mp4 = b"\x00\x00\x00\x18ftypmp42" + (b"\x00" * 32)

    res = client.post(
        "/api/v1/admin/upload",
        headers={"Authorization": f"Bearer {token}"},
        data={"file": (io.BytesIO(fake_mp4), "demo.mp4")},
        content_type="multipart/form-data",
    )

    assert res.status_code == 200
    assert res.get_json()["file_type"] == "video"


def test_promoted_admin_user_can_login_admin_backend(app, client):
    root_admin_id = create_admin(app, username="root")
    admin_auth = admin_token(app, root_admin_id)
    user_id = create_user(app, email="worker@example.com", role="worker")

    promote_res = client.patch(
        f"/api/v1/admin/users/{user_id}/role",
        headers={"Authorization": f"Bearer {admin_auth}"},
        json={"role": "admin", "password": "secret123"},
    )
    assert promote_res.status_code == 200

    login_res = client.post(
        "/api/v1/admin/auth/login",
        json={"username": "测试用户", "password": "secret123"},
    )
    assert login_res.status_code == 200
    assert login_res.get_json()["token"]


def test_admin_can_generate_worker_role_token(app, client):
    admin_id = create_admin(app, username="issuer")
    token = admin_token(app, admin_id)

    res = client.post(
        "/api/v1/admin/role-tokens",
        headers={"Authorization": f"Bearer {token}"},
        json={"role": "worker"},
    )

    assert res.status_code == 200
    body = res.get_json()
    assert body["role"] == "worker"
    assert body["token"]

    with app.app_context():
        row = RoleAccessToken.query.filter_by(token=body["token"]).first()
        assert row is not None
        assert row.role == "worker"
        lifetime = row.expired_at - row.created_at
        assert timedelta(hours=9, minutes=59) <= lifetime <= timedelta(hours=10, minutes=1)


def test_email_login_with_role_token_assigns_and_reuses_worker_role(app, client):
    admin_id = create_admin(app, username="issuer2")
    admin_auth = admin_token(app, admin_id)
    token_res = client.post(
        "/api/v1/admin/role-tokens",
        headers={"Authorization": f"Bearer {admin_auth}"},
        json={"role": "worker"},
    )
    role_token = token_res.get_json()["token"]

    first_email = "worker1@example.com"
    client.post("/api/v1/auth/send-code", json={"email": first_email})
    with app.app_context():
        first_code = (
            EmailVerificationCode.query.filter_by(email=first_email)
            .order_by(EmailVerificationCode.created_at.desc())
            .first()
            .code
        )

    first_login = client.post(
        "/api/v1/auth/email-login",
        json={"email": first_email, "code": first_code, "username": "批量用户1", "role_token": role_token},
    )
    assert first_login.status_code == 200
    assert first_login.get_json()["user"]["role"] == "worker"

    second_email = "worker2@example.com"
    client.post("/api/v1/auth/send-code", json={"email": second_email})
    with app.app_context():
        second_code = (
            EmailVerificationCode.query.filter_by(email=second_email)
            .order_by(EmailVerificationCode.created_at.desc())
            .first()
            .code
        )

    second_login = client.post(
        "/api/v1/auth/email-login",
        json={"email": second_email, "code": second_code, "username": "批量用户2", "role_token": role_token},
    )
    assert second_login.status_code == 200
    assert second_login.get_json()["user"]["role"] == "worker"


def test_email_login_with_limited_role_token_exhausts_after_max_uses(app, client):
    admin_id = create_admin(app, username="issuer_limited")
    admin_auth = admin_token(app, admin_id)
    token_res = client.post(
        "/api/v1/admin/role-tokens",
        headers={"Authorization": f"Bearer {admin_auth}"},
        json={"role": "worker", "max_uses": 1},
    )
    role_token = token_res.get_json()["token"]

    first_email = "limited1@example.com"
    client.post("/api/v1/auth/send-code", json={"email": first_email})
    with app.app_context():
        first_code = (
            EmailVerificationCode.query.filter_by(email=first_email)
            .order_by(EmailVerificationCode.created_at.desc())
            .first()
            .code
        )

    first_login = client.post(
        "/api/v1/auth/email-login",
        json={"email": first_email, "code": first_code, "username": "限次用户1", "role_token": role_token},
    )
    assert first_login.status_code == 200

    second_email = "limited2@example.com"
    client.post("/api/v1/auth/send-code", json={"email": second_email})
    with app.app_context():
        second_code = (
            EmailVerificationCode.query.filter_by(email=second_email)
            .order_by(EmailVerificationCode.created_at.desc())
            .first()
            .code
        )

    second_login = client.post(
        "/api/v1/auth/email-login",
        json={"email": second_email, "code": second_code, "username": "限次用户2", "role_token": role_token},
    )
    assert second_login.status_code == 400
    assert second_login.get_json()["error"] == "role_token_exhausted"


def test_email_login_rejects_expired_role_token(app, client):
    email = "expired@example.com"
    client.post("/api/v1/auth/send-code", json={"email": email})
    with app.app_context():
        code = (
            EmailVerificationCode.query.filter_by(email=email)
            .order_by(EmailVerificationCode.created_at.desc())
            .first()
            .code
        )
        expired_token = RoleAccessToken(
            token="EXPIRED-TOKEN",
            role="worker",
            created_at=utc_now() - timedelta(hours=11),
            expired_at=utc_now() - timedelta(minutes=1),
        )
        db.session.add(expired_token)
        db.session.commit()

    res = client.post(
        "/api/v1/auth/email-login",
        json={"email": email, "code": code, "username": "过期用户", "role_token": "EXPIRED-TOKEN"},
    )
    assert res.status_code == 400
    body = res.get_json()
    assert body["error"] == "role_token_expired"


def test_email_login_with_admin_role_token_sets_password_and_creates_admin(app, client):
    issuer_id = create_admin(app, username="issuer_admin")
    admin_auth = admin_token(app, issuer_id)
    token_res = client.post(
        "/api/v1/admin/role-tokens",
        headers={"Authorization": f"Bearer {admin_auth}"},
        json={"role": "admin"},
    )
    role_token = token_res.get_json()["token"]

    email = "new-admin@example.com"
    client.post("/api/v1/auth/send-code", json={"email": email})
    with app.app_context():
        code = (
            EmailVerificationCode.query.filter_by(email=email)
            .order_by(EmailVerificationCode.created_at.desc())
            .first()
            .code
        )

    res = client.post(
        "/api/v1/auth/email-login",
        json={
            "email": email,
            "code": code,
            "username": "新管理员",
            "role_token": role_token,
            "password": "secret123",
        },
    )
    assert res.status_code == 200
    assert res.get_json()["user"]["role"] == "admin"

    admin_login = client.post(
        "/api/v1/admin/auth/login",
        json={"username": "新管理员", "password": "secret123"},
    )
    assert admin_login.status_code == 200


def test_email_login_with_admin_role_token_requires_password(app, client):
    issuer_id = create_admin(app, username="issuer_admin2")
    admin_auth = admin_token(app, issuer_id)
    token_res = client.post(
        "/api/v1/admin/role-tokens",
        headers={"Authorization": f"Bearer {admin_auth}"},
        json={"role": "admin"},
    )
    role_token = token_res.get_json()["token"]

    email = "admin-no-password@example.com"
    client.post("/api/v1/auth/send-code", json={"email": email})
    with app.app_context():
        code = (
            EmailVerificationCode.query.filter_by(email=email)
            .order_by(EmailVerificationCode.created_at.desc())
            .first()
            .code
        )

    res = client.post(
        "/api/v1/auth/email-login",
        json={
            "email": email,
            "code": code,
            "username": "未设密码管理员",
            "role_token": role_token,
        },
    )
    assert res.status_code == 400
    body = res.get_json()
    assert body["error"] == "admin_password_required"


def test_delete_task_showcase_cleans_up_user_assignments(app, client):
    admin_id = create_admin(app, username="owner")
    token = admin_token(app, admin_id)
    user_id = create_user(app, email="tasker@example.com", role="worker")

    with app.app_context():
        task = TaskShowcase(name="茶染任务", category="teadye", cover_url="/static/uploads/task.png")
        db.session.add(task)
        db.session.commit()

        assignment = UserTask(user_id=user_id, task_id=task.id, status="accepted")
        db.session.add(assignment)
        db.session.commit()
        task_id = task.id

    delete_res = client.delete(
        f"/api/v1/admin/task-showcases/{task_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert delete_res.status_code == 200

    with app.app_context():
        assert db.session.get(TaskShowcase, task_id) is None
        assert UserTask.query.filter_by(task_id=task_id).count() == 0
