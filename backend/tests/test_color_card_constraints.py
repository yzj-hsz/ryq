from __future__ import annotations

from sqlalchemy.exc import IntegrityError

from raoyouqu.models import ColorCardPreset, db

from .conftest import admin_token, create_admin, seed_color_card_options


def test_admin_create_color_card_preset_rejects_duplicate(app, client):
    admin_id = create_admin(app)
    token = admin_token(app, admin_id)
    option_ids = seed_color_card_options(app)
    payload = {**option_ids, "image_url": "/static/uploads/preset.png"}

    first = client.post(
        "/api/v1/admin/color-card/presets",
        headers={"Authorization": f"Bearer {token}"},
        json=payload,
    )
    assert first.status_code == 200

    duplicate = client.post(
        "/api/v1/admin/color-card/presets",
        headers={"Authorization": f"Bearer {token}"},
        json=payload,
    )

    assert duplicate.status_code == 409
    assert duplicate.get_json()["error"] == "preset_already_exists"


def test_color_card_preset_model_has_unique_constraint(app):
    option_ids = seed_color_card_options(app)

    with app.app_context():
        first = ColorCardPreset(**option_ids, image_url="/static/uploads/a.png")
        second = ColorCardPreset(**option_ids, image_url="/static/uploads/b.png")
        db.session.add(first)
        db.session.commit()

        db.session.add(second)
        try:
            db.session.commit()
        except IntegrityError:
            db.session.rollback()
        else:
            raise AssertionError("expected unique constraint to reject duplicate preset")
