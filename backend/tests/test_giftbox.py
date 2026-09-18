from __future__ import annotations

from .conftest import admin_token, create_admin, create_user, user_token


def _admin_headers(app, admin_id: int) -> dict[str, str]:
    return {"Authorization": f"Bearer {admin_token(app, admin_id)}"}


def _user_headers(app, user_id: int) -> dict[str, str]:
    return {"Authorization": f"Bearer {user_token(app, user_id)}"}


def _seed_box_and_goods(client, headers):
    box_res = client.post(
        "/api/v1/admin/giftboxes",
        json={"name": "方形礼盒", "box_type": "square", "packing_fee": 10, "min_price": 0},
        headers=headers,
    )
    assert box_res.status_code == 200
    box_id = box_res.get_json()["id"]

    goods_ids = []
    for i, (name, w, h, price) in enumerate(
        [("丝巾", 1, 1, 30), ("茶席", 2, 2, 100), ("书签", 1, 1, 5)]
    ):
        res = client.post(
            "/api/v1/admin/giftbox-goods",
            json={"name": name, "w": w, "h": h, "price": price},
            headers=headers,
        )
        assert res.status_code == 200, res.get_json()
        goods_ids.append(res.get_json()["id"])

    # 自增排序：未填 sort_order 时按最大 + 1
    lst = client.get("/api/v1/admin/giftbox-goods", headers=headers).get_json()["items"]
    assert [g["sort_order"] for g in lst] == [0, 1, 2]
    return box_id, goods_ids


def test_giftbox_save_flow_and_total(app, client):
    admin_id = create_admin(app)
    headers = _admin_headers(app, admin_id)
    box_id, (silk_id, _, mark_id) = _seed_box_and_goods(client, headers)

    user_id = create_user(app, email="gift@example.com", role="worker")
    uheaders = _user_headers(app, user_id)

    # 客户端拉取款式与可选商品
    boxes = client.get("/api/v1/giftboxes").get_json()["items"]
    assert boxes and boxes[0]["packing_fee"] == 10
    goods = client.get("/api/v1/giftbox-goods").get_json()["items"]
    assert len(goods) == 3

    # 保存礼盒：服务端按库内单价重算（包装费10 + 30 + 5 = 45）
    save = client.post(
        "/api/v1/me/giftboxes",
        json={
            "gift_box_id": box_id,
            "items": [
                {"goods_id": silk_id, "x": 0, "y": 0},
                {"goods_id": mark_id, "x": 1, "y": 0},
            ],
        },
        headers=uheaders,
    )
    assert save.status_code == 200, save.get_json()
    assert save.get_json()["total_price"] == 45

    # 我的礼盒列表回显形状、商品、摆放、价格
    mine = client.get("/api/v1/me/giftboxes", headers=uheaders).get_json()["items"]
    assert len(mine) == 1
    assert mine[0]["box_type"] == "square"
    assert mine[0]["total_price"] == 45
    assert {(i["x"], i["y"]) for i in mine[0]["items"]} == {(0, 0), (1, 0)}

    # 管理员可见全量 + 用户信息
    all_rows = client.get("/api/v1/admin/user-giftboxes", headers=headers).get_json()["items"]
    assert len(all_rows) == 1
    assert all_rows[0]["user"]["email"] == "gift@example.com"
    assert all_rows[0]["total_price"] == 45


def test_giftbox_goods_zero_product_id_stored_as_null(app, client):
    admin_id = create_admin(app)
    headers = _admin_headers(app, admin_id)

    # 管理端数字框留空会传 product_id=0，应存 NULL 而不是外键 500
    res = client.post(
        "/api/v1/admin/giftbox-goods",
        json={"name": "测试商品", "w": 1, "h": 1, "price": 10, "product_id": 0},
        headers=headers,
    )
    assert res.status_code == 200, res.get_json()
    gid = res.get_json()["id"]

    lst = client.get("/api/v1/admin/giftbox-goods", headers=headers).get_json()["items"]
    assert [g["product_id"] for g in lst if g["id"] == gid] == [None]

    # 编辑时同样允许清空关联
    patch = client.patch(
        f"/api/v1/admin/giftbox-goods/{gid}", json={"product_id": 0}, headers=headers
    )
    assert patch.status_code == 200


def test_giftbox_min_price_and_layout_rejected(app, client):
    admin_id = create_admin(app)
    headers = _admin_headers(app, admin_id)
    box_id, (silk_id, tea_id, mark_id) = _seed_box_and_goods(client, headers)
    # 提高起售价
    client.patch(
        f"/api/v1/admin/giftboxes/{box_id}", json={"min_price": 100}, headers=headers
    )

    user_id = create_user(app, email="gift2@example.com", role="worker")
    uheaders = _user_headers(app, user_id)

    # 未达起售价
    res = client.post(
        "/api/v1/me/giftboxes",
        json={"gift_box_id": box_id, "items": [{"goods_id": mark_id, "x": 0, "y": 0}]},
        headers=uheaders,
    )
    assert res.status_code == 400
    assert res.get_json()["error"] == "below_min_price"

    # 摆放重叠
    res = client.post(
        "/api/v1/me/giftboxes",
        json={
            "gift_box_id": box_id,
            "items": [
                {"goods_id": silk_id, "x": 0, "y": 0},
                {"goods_id": mark_id, "x": 0, "y": 0},
            ],
        },
        headers=uheaders,
    )
    assert res.status_code == 400
    assert res.get_json()["error"] == "items_overlapped"

    # 越界
    res = client.post(
        "/api/v1/me/giftboxes",
        json={"gift_box_id": box_id, "items": [{"goods_id": tea_id, "x": 2, "y": 2}]},
        headers=uheaders,
    )
    assert res.status_code == 400
    assert res.get_json()["error"] == "item_out_of_bounds"
