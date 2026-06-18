from __future__ import annotations

import io

from raoyouqu.models import EmailVerificationCode, TaskShowcase, UserTask, db

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
