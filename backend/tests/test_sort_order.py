from __future__ import annotations

from .conftest import admin_token, create_admin


def _auth(app, admin_id: int) -> dict[str, str]:
    return {"Authorization": f"Bearer {admin_token(app, admin_id)}"}


def test_video_sort_auto_increments(app, client):
    admin_id = create_admin(app)
    headers = _auth(app, admin_id)

    first = client.post(
        "/api/v1/admin/home/videos",
        json={"title": "v1", "video_url": "a.mp4"},
        headers=headers,
    )
    assert first.status_code == 200
    second = client.post(
        "/api/v1/admin/home/videos",
        json={"title": "v2", "video_url": "b.mp4"},
        headers=headers,
    )
    assert second.status_code == 200

    res = client.get("/api/v1/admin/home/videos", headers=headers)
    assert res.status_code == 200
    assert [i["sort_order"] for i in res.get_json()["items"]] == [0, 1]


def test_video_sort_explicit_value_respected_and_patch_reorders(app, client):
    admin_id = create_admin(app)
    headers = _auth(app, admin_id)

    client.post(
        "/api/v1/admin/home/videos",
        json={"title": "v1", "video_url": "a.mp4", "sort_order": 5},
        headers=headers,
    )
    # 未填 sort_order 时自动取当前最大 + 1
    client.post(
        "/api/v1/admin/home/videos",
        json={"title": "v2", "video_url": "b.mp4"},
        headers=headers,
    )

    res = client.get("/api/v1/admin/home/videos", headers=headers)
    items = res.get_json()["items"]
    assert [i["sort_order"] for i in items] == [5, 6]

    # 编辑页手改排序数字，列表按升序重排
    vid = items[1]["id"]
    patch = client.patch(
        f"/api/v1/admin/home/videos/{vid}",
        json={"sort_order": 1},
        headers=headers,
    )
    assert patch.status_code == 200
    res = client.get("/api/v1/admin/home/videos", headers=headers)
    assert [i["sort_order"] for i in res.get_json()["items"]] == [1, 5]
