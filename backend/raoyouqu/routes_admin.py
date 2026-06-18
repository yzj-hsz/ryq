from __future__ import annotations

import json
import mimetypes
from pathlib import Path
from datetime import datetime

from flask import Blueprint, current_app, jsonify, request
from sqlalchemy import or_
from werkzeug.security import generate_password_hash

from .models import (
    AdminUser,
    AnalyticsEvent,
    ColorCardDimension,
    ColorCardOption,
    ColorCardPreset,
    CultureArticle,
    CulturePromo,
    Experience,
    ExperienceDiyChoice,
    ExperienceDiySchema,
    HomeBanner,
    HomeHighlight,
    HomeVideo,
    HomePPT,
    HomeIntroText,
    MiniappUser,
    Product,
    ProductFlowStep,
    ProductGallery,
    SiteConfig,
    TaskShowcase,
    UserDiyRecord,
    UserTask,
    db,
)
from .helpers import rich_text_to_plain_text, text_to_styled_html
from .routes_auth import require_admin_token
from .time_utils import utc_now
from .upload_security import (
    ADMIN_UPLOAD_POLICY,
    UploadValidationError,
    store_validated_upload,
)

admin_bp = Blueprint("admin", __name__)


def _apply_fields(obj, body: dict, fields: list[str]) -> None:
    for f in fields:
        if f in body:
            setattr(obj, f, body[f])


def _admin_plain_text(value: str | None) -> str:
    return rich_text_to_plain_text(value)


def _admin_text_payload(body: dict, text_key: str, html_key: str | None = None) -> str | None:
    if text_key in body:
        return text_to_styled_html(body.get(text_key))
    if html_key and html_key in body:
        return text_to_styled_html(body.get(html_key))
    return None


def _color_card_preset_key(body: dict) -> tuple[int, int, int, int] | None:
    required_keys = (
        "fabric_option_id",
        "pattern_option_id",
        "mordant_option_id",
        "time_option_id",
    )
    values: list[int] = []
    for key in required_keys:
        value = body.get(key)
        if value is None:
            return None
        values.append(int(value))
    return values[0], values[1], values[2], values[3]


def _find_duplicate_color_card_preset(
    body: dict, *, exclude_id: int | None = None
) -> ColorCardPreset | None:
    preset_key = _color_card_preset_key(body)
    if not preset_key:
        return None
    query = ColorCardPreset.query.filter_by(
        fabric_option_id=preset_key[0],
        pattern_option_id=preset_key[1],
        mordant_option_id=preset_key[2],
        time_option_id=preset_key[3],
    )
    if exclude_id is not None:
        query = query.filter(ColorCardPreset.id != exclude_id)
    return query.first()


def _validate_color_card_option_ids(option_ids: list[int]):
    existing_ids = {
        row.id for row in ColorCardOption.query.filter(ColorCardOption.id.in_(option_ids)).all()
    }
    for oid in option_ids:
        if oid not in existing_ids:
            return jsonify({"error": f"option_id_{oid}_not_found"}), 404
    return None


def _derived_admin_email(user: MiniappUser) -> str:
    return user.email or f"miniapp-admin-{user.id}@ryq.local"


def _find_linked_admin_user(user: MiniappUser) -> AdminUser | None:
    candidates = [AdminUser.email == _derived_admin_email(user)]
    if user.email:
        candidates.append(AdminUser.email == user.email)
    if user.username:
        candidates.append(AdminUser.username == user.username)
    return AdminUser.query.filter(or_(*candidates)).order_by(AdminUser.id.asc()).first()


def _ensure_admin_account(
    user: MiniappUser, *, password_hash: str | None = None
) -> tuple[AdminUser | None, tuple | None]:
    admin = _find_linked_admin_user(user)
    admin_email = _derived_admin_email(user)

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
                        "message": "首次授权管理员时必须同时设置登录密码。",
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


def _deactivate_linked_admin_user(user: MiniappUser) -> None:
    admin = _find_linked_admin_user(user)
    if admin:
        admin.is_active = False


def _culture_promo_dict(row: CulturePromo) -> dict:
    return {
        "id": row.id,
        "title": row.title,
        "subtitle": row.subtitle or "",
        "cover_url": row.cover_url,
        "video_url": row.video_url,
    }


def _culture_article_dict(row: CultureArticle) -> dict:
    return {
        "id": row.id,
        "category": row.category,
        "title": row.title,
        "cover_url": row.cover_url,
        "summary": row.summary or "",
        "body_html": _admin_plain_text(row.body_html),
        "list_no": row.list_no,
        "sort_order": row.sort_order,
        "status": row.status,
    }


def _task_dict(row: TaskShowcase) -> dict:
    return {
        "id": row.id,
        "name": row.name,
        "category": row.category,
        "cover_url": row.cover_url,
        "difficulty": row.difficulty,
        "deadline_note": row.deadline_note,
        "status_label": row.status_label,
        "description": row.description,
        "requirement": row.requirement,
        "process_text": row.process_text,
        "materials": row.materials,
        "reference_image_url": row.reference_image_url,
        "sort_order": row.sort_order,
        "is_active": row.is_active,
    }


def _experience_dict(row: Experience, full: bool = False) -> dict:
    data = {
        "id": row.id,
        "region": row.region,
        "name": row.name,
        "cover_url": row.cover_url,
        "location": row.location or "",
        "time_note": row.time_note or "",
        "duration_note": row.duration_note or "",
        "badge": row.badge,
        "badge_color": row.badge_color,
        "summary": row.summary or "",
        "sort_order": row.sort_order,
        "status": row.status,
    }
    if full:
        data.update(
            {
                "flow_text": row.flow_text,
                "value_text": row.value_text,
                "notice_html": _admin_plain_text(row.notice_html),
                "diy_schemas": [
                    {
                        "id": s.id,
                        "group_key": s.group_key,
                        "group_label": s.group_label,
                        "sort_order": s.sort_order,
                        "choices": [
                            {"id": c.id, "label": c.label, "sort_order": c.sort_order}
                            for c in sorted(s.choices, key=lambda x: x.sort_order)
                        ],
                    }
                    for s in sorted(row.diy_schemas, key=lambda x: x.sort_order)
                ],
            }
        )
    return data


@admin_bp.get("/dashboard/summary")
def dashboard_summary():
    admin, err = require_admin_token()
    if err: return err

    now = utc_now()
    today_start = datetime(now.year, now.month, now.day)

    # 只要有邮箱，或者是工作者/管理员，都算入有效用户
    user_filter = or_(MiniappUser.email.isnot(None), MiniappUser.role != "tourist")
    
    total_users = MiniappUser.query.filter(user_filter).count()
    new_users_today = MiniappUser.query.filter(
        MiniappUser.created_at >= today_start,
        user_filter
    ).count()
    
    today_pv = AnalyticsEvent.query.filter(
        AnalyticsEvent.created_at >= today_start,
        AnalyticsEvent.event_type == 'page_view'
    ).count()
    
    today_uv = db.session.query(AnalyticsEvent.user_id).filter(
        AnalyticsEvent.created_at >= today_start,
        AnalyticsEvent.event_type == 'page_view'
    ).distinct().count()

    want_clicks = AnalyticsEvent.query.filter(
        AnalyticsEvent.event_type == 'want_click'
    ).count()

    color_card_uses = AnalyticsEvent.query.filter(
        AnalyticsEvent.event_type == 'color_card_use'
    ).count()

    return jsonify({
        "summary": {
            "total_users": total_users,
            "new_users_today": new_users_today,
            "today_pv": today_pv,
            "today_uv": today_uv,
            "total_want_clicks": want_clicks,
            "total_color_card_uses": color_card_uses,
        }
    })

# --- 首页视频管理 ---

@admin_bp.get("/home/videos")
def admin_get_videos():
    admin, err = require_admin_token()
    if err: return err
    videos = HomeVideo.query.order_by(HomeVideo.sort_order).all()
    return jsonify({
        "items": [
            {
                "id": v.id,
                "video_url": v.video_url,
                "cover_url": v.cover_url,
                "title": v.title,
                "sort_order": v.sort_order,
                "is_active": v.is_active
            } for v in videos
        ]
    })

@admin_bp.post("/home/videos")
def admin_create_video():
    admin, err = require_admin_token()
    if err: return err
    body = request.get_json(silent=True) or {}
    v = HomeVideo(
        video_url=body.get("video_url"),
        cover_url=body.get("cover_url"),
        title=body.get("title"),
        sort_order=body.get("sort_order", 0),
        is_active=body.get("is_active", True)
    )
    db.session.add(v)
    db.session.commit()
    return jsonify({"id": v.id})

@admin_bp.patch("/home/videos/<int:vid>")
def admin_update_video(vid: int):
    admin, err = require_admin_token()
    if err: return err
    v = HomeVideo.query.get_or_404(vid)
    body = request.get_json(silent=True) or {}
    fields = ["video_url", "cover_url", "title", "sort_order", "is_active"]
    for f in fields:
        if f in body:
            setattr(v, f, body[f])
    db.session.commit()
    return jsonify({"ok": True})

@admin_bp.delete("/home/videos/<int:vid>")
def admin_delete_video(vid: int):
    admin, err = require_admin_token()
    if err: return err
    v = HomeVideo.query.get_or_404(vid)
    db.session.delete(v)
    db.session.commit()
    return jsonify({"ok": True})


# --- 首页PPT管理 ---

@admin_bp.get("/home/ppts")
def admin_get_ppts():
    admin, err = require_admin_token()
    if err: return err
    ppts = HomePPT.query.order_by(HomePPT.sort_order).all()
    return jsonify({
        "items": [
            {
                "id": p.id,
                "image_url": p.image_url,
                "title": p.title,
                "sort_order": p.sort_order,
                "is_active": p.is_active
            } for p in ppts
        ]
    })

@admin_bp.post("/home/ppts")
def admin_create_ppt():
    admin, err = require_admin_token()
    if err: return err
    body = request.get_json(silent=True) or {}
    p = HomePPT(
        image_url=body.get("image_url"),
        title=body.get("title"),
        sort_order=body.get("sort_order", 0),
        is_active=body.get("is_active", True)
    )
    db.session.add(p)
    db.session.commit()
    return jsonify({"id": p.id})

@admin_bp.patch("/home/ppts/<int:pid>")
def admin_update_ppt(pid: int):
    admin, err = require_admin_token()
    if err: return err
    p = HomePPT.query.get_or_404(pid)
    body = request.get_json(silent=True) or {}
    fields = ["image_url", "title", "sort_order", "is_active"]
    for f in fields:
        if f in body:
            setattr(p, f, body[f])
    db.session.commit()
    return jsonify({"ok": True})

@admin_bp.delete("/home/ppts/<int:pid>")
def admin_delete_ppt(pid: int):
    admin, err = require_admin_token()
    if err: return err
    p = HomePPT.query.get_or_404(pid)
    db.session.delete(p)
    db.session.commit()
    return jsonify({"ok": True})


# --- 首页图文管理 ---

@admin_bp.get("/home/intro-text")
def admin_get_intro_text():
    admin, err = require_admin_token()
    if err: return err
    text = HomeIntroText.query.first()
    return jsonify({
        "text": _admin_plain_text(text.html if text else ""),
        "html": text.html if text else "",
    })

@admin_bp.post("/home/intro-text")
def admin_save_intro_text():
    admin, err = require_admin_token()
    if err: return err
    body = request.get_json(silent=True) or {}
    text = HomeIntroText.query.first()
    html_value = _admin_text_payload(body, "text", "html")
    if html_value is None:
        html_value = ""
    if not text:
        text = HomeIntroText(html=html_value)
        db.session.add(text)
    else:
        text.html = html_value
    db.session.commit()
    return jsonify({"ok": True})

# --- 首页轮播图 (精选推荐) ---

@admin_bp.get("/home/banners")
def admin_banners():
    admin, err = require_admin_token()
    if err: return err
    banners = HomeBanner.query.order_by(HomeBanner.sort_order).all()
    return jsonify({
        "items": [
            {
                "id": b.id,
                "title": b.title,
                "image_url": b.image_url,
                "detail_html": _admin_plain_text(b.detail_html),
                "link_type": b.link_type,
                "link_value": b.link_value,
                "sort_order": b.sort_order,
                "is_active": b.is_active
            } for b in banners
        ]
    })

@admin_bp.post("/home/banners")
def admin_create_banner():
    admin, err = require_admin_token()
    if err: return err
    body = request.get_json(silent=True) or {}
    b = HomeBanner(
        title=body.get("title"),
        image_url=body.get("image_url"),
        detail_html=_admin_text_payload(body, "detail_text", "detail_html"),
        link_type=body.get("link_type", "none"),
        link_value=body.get("link_value"),
        sort_order=body.get("sort_order", 0),
        is_active=body.get("is_active", True)
    )
    db.session.add(b)
    db.session.commit()
    return jsonify({"id": b.id})

@admin_bp.patch("/home/banners/<int:bid>")
def admin_update_banner(bid: int):
    admin, err = require_admin_token()
    if err: return err
    b = HomeBanner.query.get_or_404(bid)
    body = request.get_json(silent=True) or {}
    _apply_fields(b, body, ["title", "image_url", "link_type", "link_value", "sort_order", "is_active"])
    detail_html = _admin_text_payload(body, "detail_text", "detail_html")
    if detail_html is not None:
        b.detail_html = detail_html
    db.session.commit()
    return jsonify({"ok": True})

@admin_bp.delete("/home/banners/<int:bid>")
def admin_delete_banner(bid: int):
    admin, err = require_admin_token()
    if err: return err
    b = HomeBanner.query.get_or_404(bid)
    db.session.delete(b)
    db.session.commit()
    return jsonify({"ok": True})

# --- 项目亮点 ---

@admin_bp.get("/home/highlights")
def admin_highlights():
    admin, err = require_admin_token()
    if err: return err
    highlights = HomeHighlight.query.order_by(HomeHighlight.sort_order).all()
    return jsonify({
        "items": [
            {
                "id": h.id,
                "icon": h.icon,
                "title": h.title,
                "summary": h.summary,
                "image_url": h.image_url,
                "detail_html": _admin_plain_text(h.detail_html),
                "sort_order": h.sort_order,
                "is_active": h.is_active
            } for h in highlights
        ]
    })

@admin_bp.post("/home/highlights")
def admin_create_highlight():
    admin, err = require_admin_token()
    if err: return err
    body = request.get_json(silent=True) or {}
    h = HomeHighlight(
        icon=body.get("icon"),
        title=body.get("title"),
        summary=body.get("summary"),
        image_url=body.get("image_url"),
        detail_html=_admin_text_payload(body, "detail_text", "detail_html"),
        sort_order=body.get("sort_order", 0),
        is_active=body.get("is_active", True)
    )
    db.session.add(h)
    db.session.commit()
    return jsonify({"id": h.id})

@admin_bp.patch("/home/highlights/<int:hid>")
def admin_update_highlight(hid: int):
    admin, err = require_admin_token()
    if err: return err
    h = HomeHighlight.query.get_or_404(hid)
    body = request.get_json(silent=True) or {}
    fields = ["icon", "title", "summary", "image_url", "sort_order", "is_active"]
    for f in fields:
        if f in body:
            setattr(h, f, body[f])
    detail_html = _admin_text_payload(body, "detail_text", "detail_html")
    if detail_html is not None:
        h.detail_html = detail_html
    db.session.commit()
    return jsonify({"ok": True})

@admin_bp.delete("/home/highlights/<int:hid>")
def admin_delete_highlight(hid: int):
    admin, err = require_admin_token()
    if err: return err
    h = HomeHighlight.query.get_or_404(hid)
    db.session.delete(h)
    db.session.commit()
    return jsonify({"ok": True})

# --- 通用文件上传 ---

@admin_bp.post("/upload")
def admin_upload_file():
    admin, err = require_admin_token()
    if err: return err
    
    if 'file' not in request.files:
        return jsonify({"error": "no_file"}), 400
        
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "empty_filename"}), 400

    try:
        result = store_validated_upload(
            file,
            Path(current_app.config["UPLOAD_FOLDER"]),
            ADMIN_UPLOAD_POLICY,
        )
    except UploadValidationError as exc:
        return jsonify({"error": exc.error, "message": exc.message}), exc.status_code

    return jsonify(result)


# --- 已上传文件列表 ---

@admin_bp.get("/uploads")
def admin_list_uploads():
    admin, err = require_admin_token()
    if err:
        return err

    file_type = (request.args.get("type") or "").strip().lower()
    keyword = (request.args.get("keyword") or "").strip().lower()
    ext = (request.args.get("ext") or "").strip().lower()
    limit = min(request.args.get("limit", 50, type=int), 500)
    offset = max(request.args.get("offset", 0, type=int), 0)

    upload_dir = Path(current_app.config["UPLOAD_FOLDER"])
    if not upload_dir.exists():
        return jsonify({"total": 0, "items": []})

    rows = []
    for p in upload_dir.iterdir():
        if not p.is_file():
            continue
        name = p.name
        if keyword and keyword not in name.lower():
            continue
        if ext:
            want = ext if ext.startswith(".") else f".{ext}"
            if p.suffix.lower() != want:
                continue

        mime = mimetypes.guess_type(name)[0] or "application/octet-stream"
        if mime.startswith("image/"):
            kind = "image"
        elif mime.startswith("video/"):
            kind = "video"
        else:
            kind = "other"

        if file_type in ("image", "video", "other") and kind != file_type:
            continue

        stat = p.stat()
        rows.append(
            {
                "filename": name,
                "url": f"/static/uploads/{name}",
                "mime_type": mime,
                "file_type": kind,
                "size_bytes": stat.st_size,
                "updated_at": datetime.utcfromtimestamp(stat.st_mtime).isoformat(),
            }
        )

    rows.sort(key=lambda x: x["updated_at"], reverse=True)
    total = len(rows)
    items = rows[offset : offset + limit]
    return jsonify({"total": total, "items": items})


# --- 商品管理 ---

@admin_bp.get("/products")
def admin_get_products():
    admin, err = require_admin_token()
    if err: return err
    
    cat = request.args.get("category") or request.args.get("product_type")
    list_category = request.args.get("list_category")
    status = request.args.get("status")
    q = Product.query
    if cat:
        q = q.filter_by(product_type=cat)
    if list_category:
        q = q.filter_by(list_category=list_category)
    if status:
        q = q.filter_by(status=status)
    
    products = q.order_by(Product.sort_order).all()
    return jsonify({
        "items": [
            {
                "id": p.id,
                "name": p.name,
                "product_type": p.product_type,
                "list_category": p.list_category,
                "primary_category": p.primary_category,
                "status": p.status,
                "cover_url": p.cover_url,
                "sort_order": p.sort_order,
                "created_at": p.created_at.isoformat()
            } for p in products
        ]
    })

@admin_bp.post("/products")
def admin_create_product():
    admin, err = require_admin_token()
    if err: return err
    
    body = request.get_json(silent=True) or {}
    required_fields = ("name", "cover_url", "product_type")
    missing_fields = [field for field in required_fields if not body.get(field)]
    if missing_fields:
        return jsonify({
            "error": "validation_error",
            "message": "缺少必填字段",
            "fields": missing_fields,
        }), 400

    p = Product(
        name=body.get("name"),
        summary=body.get("summary"),
        cover_url=body.get("cover_url"),
        product_type=body.get("product_type"),
        list_category=body.get("list_category"),
        primary_category=body.get("primary_category"),
        producer=body.get("producer"),
        origin=body.get("origin"),
        process_text=body.get("process_text"),
        detail_html=_admin_text_payload(body, "detail_text", "detail_html"),
        qr_code_url=body.get("qr_code_url"),
        status=body.get("status", "published"),
        sort_order=body.get("sort_order", 0),
        publisher_id=admin.id
    )
    
    # 处理流程步骤
    if "flow_steps" in body:
        for s in body["flow_steps"]:
            step = ProductFlowStep(
                step_order=s.get("step_order", 0),
                image_url=s.get("image_url"),
                caption=s.get("caption")
            )
            p.flow_steps.append(step)
            
    # 处理图集
    if "gallery" in body:
        for g in body["gallery"]:
            img = ProductGallery(
                url=g.get("url"),
                sort_order=g.get("sort_order", 0)
            )
            p.gallery.append(img)
            
    db.session.add(p)
    db.session.commit()
    return jsonify({"id": p.id})

@admin_bp.get("/products/<int:pid>")
def admin_get_product_detail(pid: int):
    admin, err = require_admin_token()
    if err: return err
    p = Product.query.get_or_404(pid)
    return jsonify({
        "id": p.id,
        "name": p.name,
        "summary": p.summary,
        "cover_url": p.cover_url,
        "product_type": p.product_type,
        "list_category": p.list_category,
        "primary_category": p.primary_category,
        "producer": p.producer,
        "origin": p.origin,
        "process_text": p.process_text,
        "detail_html": _admin_plain_text(p.detail_html),
        "qr_code_url": p.qr_code_url,
        "status": p.status,
        "sort_order": p.sort_order,
        "flow_steps": [
            {
                "step_order": s.step_order,
                "image_url": s.image_url,
                "caption": s.caption
            } for s in sorted(p.flow_steps, key=lambda x: x.step_order)
        ],
        "gallery": [
            {
                "url": g.url,
                "sort_order": g.sort_order
            } for g in sorted(p.gallery, key=lambda x: x.sort_order)
        ]
    })

@admin_bp.patch("/products/<int:pid>")
def admin_update_product(pid: int):
    admin, err = require_admin_token()
    if err: return err
    p = Product.query.get_or_404(pid)
    body = request.get_json(silent=True) or {}
    
    _apply_fields(
        p,
        body,
        [
            "name", "summary", "cover_url", "product_type", "list_category",
            "primary_category", "producer", "origin", "process_text",
            "qr_code_url", "sort_order", "status",
        ],
    )
    detail_html = _admin_text_payload(body, "detail_text", "detail_html")
    if detail_html is not None:
        p.detail_html = detail_html
            
    if "flow_steps" in body:
        # 简单处理：全量替换
        ProductFlowStep.query.filter_by(product_id=p.id).delete()
        for s in body["flow_steps"]:
            step = ProductFlowStep(
                product_id=p.id,
                step_order=s.get("step_order", 0),
                image_url=s.get("image_url"),
                caption=s.get("caption")
            )
            db.session.add(step)
            
    if "gallery" in body:
        # 简单处理：全量替换
        ProductGallery.query.filter_by(product_id=p.id).delete()
        for g in body["gallery"]:
            img = ProductGallery(
                product_id=p.id,
                url=g.get("url"),
                sort_order=g.get("sort_order", 0)
            )
            db.session.add(img)
            
    db.session.commit()
    return jsonify({"ok": True})

@admin_bp.delete("/products/<int:pid>")
def admin_delete_product(pid: int):
    admin, err = require_admin_token()
    if err: return err
    p = Product.query.get_or_404(pid)
    db.session.delete(p)
    db.session.commit()
    return jsonify({"ok": True})


# --- 站点配置（默认「我想要」二维码等） ---

@admin_bp.get("/site-config")
def admin_get_site_config():
    admin, err = require_admin_token()
    if err:
        return err
    rows = SiteConfig.query.all()
    return jsonify({
        "items": [{"key": r.config_key, "value": r.config_value} for r in rows]
    })


@admin_bp.patch("/site-config")
def admin_patch_site_config():
    admin, err = require_admin_token()
    if err:
        return err
    body = request.get_json(silent=True) or {}
    items = body.get("items") or []
    if not items and "key" in body:
        items = [{"key": body["key"], "value": body.get("value", "")}]

    for item in items:
        key = (item.get("key") or "").strip()
        if not key:
            continue
        row = SiteConfig.query.filter_by(config_key=key).first()
        if not row:
            row = SiteConfig(config_key=key, config_value=item.get("value", ""))
            db.session.add(row)
        else:
            row.config_value = item.get("value", "")
    db.session.commit()
    return jsonify({"ok": True})


# --- 认识饶平：宣传视频 ---

@admin_bp.get("/culture/promo")
def admin_get_culture_promo():
    admin, err = require_admin_token()
    if err:
        return err
    row = CulturePromo.query.order_by(CulturePromo.id).first()
    if not row:
        return jsonify({"title": "", "subtitle": "", "cover_url": "", "video_url": None})
    return jsonify(_culture_promo_dict(row))


@admin_bp.patch("/culture/promo")
def admin_update_culture_promo():
    admin, err = require_admin_token()
    if err:
        return err
    body = request.get_json(silent=True) or {}
    row = CulturePromo.query.order_by(CulturePromo.id).first()
    if not row:
        row = CulturePromo(title="", cover_url="")
        db.session.add(row)
    _apply_fields(row, body, ["title", "subtitle", "cover_url", "video_url"])
    db.session.commit()
    return jsonify(_culture_promo_dict(row))


# --- 认识饶平：文化图文 ---

@admin_bp.get("/culture/articles")
def admin_get_culture_articles():
    admin, err = require_admin_token()
    if err:
        return err
    q = CultureArticle.query
    category = request.args.get("category")
    status = request.args.get("status")
    if category:
        q = q.filter_by(category=category)
    if status:
        q = q.filter_by(status=status)
    rows = q.order_by(CultureArticle.sort_order).all()
    return jsonify({"items": [_culture_article_dict(a) for a in rows]})


@admin_bp.post("/culture/articles")
def admin_create_culture_article():
    admin, err = require_admin_token()
    if err:
        return err
    body = request.get_json(silent=True) or {}
    row = CultureArticle(
        category=body.get("category", "heritage"),
        title=body.get("title", ""),
        cover_url=body.get("cover_url", ""),
        summary=body.get("summary"),
        body_html=_admin_text_payload(body, "body_text", "body_html"),
        list_no=body.get("list_no"),
        sort_order=body.get("sort_order", 0),
        status=body.get("status", "published"),
    )
    db.session.add(row)
    db.session.commit()
    return jsonify({"id": row.id})


@admin_bp.get("/culture/articles/<int:aid>")
def admin_get_culture_article(aid: int):
    admin, err = require_admin_token()
    if err:
        return err
    row = CultureArticle.query.get_or_404(aid)
    return jsonify(_culture_article_dict(row))


@admin_bp.patch("/culture/articles/<int:aid>")
def admin_update_culture_article(aid: int):
    admin, err = require_admin_token()
    if err:
        return err
    row = CultureArticle.query.get_or_404(aid)
    body = request.get_json(silent=True) or {}
    _apply_fields(
        row,
        body,
        ["category", "title", "cover_url", "summary", "list_no", "sort_order", "status"],
    )
    body_html = _admin_text_payload(body, "body_text", "body_html")
    if body_html is not None:
        row.body_html = body_html
    db.session.commit()
    return jsonify({"ok": True})


@admin_bp.delete("/culture/articles/<int:aid>")
def admin_delete_culture_article(aid: int):
    admin, err = require_admin_token()
    if err:
        return err
    row = CultureArticle.query.get_or_404(aid)
    db.session.delete(row)
    db.session.commit()
    return jsonify({"ok": True})


# --- 玩转饶平：体验项目 ---

@admin_bp.get("/experiences")
def admin_get_experiences():
    admin, err = require_admin_token()
    if err:
        return err
    q = Experience.query
    region = request.args.get("region")
    if region:
        q = q.filter_by(region=region)
    rows = q.order_by(Experience.sort_order).all()
    return jsonify({"items": [_experience_dict(e) for e in rows]})


@admin_bp.post("/experiences")
def admin_create_experience():
    admin, err = require_admin_token()
    if err:
        return err
    body = request.get_json(silent=True) or {}
    row = Experience(
        region=body.get("region", "shenzhen"),
        name=body.get("name", ""),
        cover_url=body.get("cover_url", ""),
        location=body.get("location"),
        time_note=body.get("time_note"),
        duration_note=body.get("duration_note"),
        badge=body.get("badge"),
        badge_color=body.get("badge_color"),
        summary=body.get("summary"),
        flow_text=body.get("flow_text"),
        value_text=body.get("value_text"),
        notice_html=_admin_text_payload(body, "notice_text", "notice_html"),
        sort_order=body.get("sort_order", 0),
        status=body.get("status", "published"),
    )
    db.session.add(row)
    db.session.commit()
    return jsonify({"id": row.id})


@admin_bp.get("/experiences/<int:eid>")
def admin_get_experience(eid: int):
    admin, err = require_admin_token()
    if err:
        return err
    row = Experience.query.get_or_404(eid)
    return jsonify(_experience_dict(row, full=True))


@admin_bp.patch("/experiences/<int:eid>")
def admin_update_experience(eid: int):
    admin, err = require_admin_token()
    if err:
        return err
    row = Experience.query.get_or_404(eid)
    body = request.get_json(silent=True) or {}
    _apply_fields(
        row,
        body,
        [
            "region", "name", "cover_url", "location", "time_note", "duration_note",
            "badge", "badge_color", "summary", "flow_text", "value_text",
            "sort_order", "status",
        ],
    )
    notice_html = _admin_text_payload(body, "notice_text", "notice_html")
    if notice_html is not None:
        row.notice_html = notice_html
    db.session.commit()
    return jsonify({"ok": True})


@admin_bp.delete("/experiences/<int:eid>")
def admin_delete_experience(eid: int):
    admin, err = require_admin_token()
    if err:
        return err
    row = Experience.query.get_or_404(eid)
    db.session.delete(row)
    db.session.commit()
    return jsonify({"ok": True})


# --- 扶残帮残：任务展示 ---

@admin_bp.get("/task-showcases")
def admin_get_task_showcases():
    admin, err = require_admin_token()
    if err:
        return err
    q = TaskShowcase.query
    category = request.args.get("category")
    if category:
        q = q.filter_by(category=category)
    rows = q.order_by(TaskShowcase.sort_order).all()
    return jsonify({"items": [_task_dict(t) for t in rows]})


@admin_bp.post("/task-showcases")
def admin_create_task_showcase():
    admin, err = require_admin_token()
    if err:
        return err
    body = request.get_json(silent=True) or {}
    row = TaskShowcase(
        name=body.get("name", ""),
        category=body.get("category", "teadye"),
        cover_url=body.get("cover_url", ""),
        difficulty=body.get("difficulty"),
        deadline_note=body.get("deadline_note"),
        status_label=body.get("status_label"),
        description=body.get("description"),
        requirement=body.get("requirement"),
        process_text=body.get("process_text"),
        materials=body.get("materials"),
        reference_image_url=body.get("reference_image_url"),
        sort_order=body.get("sort_order", 0),
        is_active=body.get("is_active", True),
    )
    db.session.add(row)
    db.session.commit()
    return jsonify({"id": row.id})


@admin_bp.get("/task-showcases/<int:tid>")
def admin_get_task_showcase(tid: int):
    admin, err = require_admin_token()
    if err:
        return err
    row = TaskShowcase.query.get_or_404(tid)
    return jsonify(_task_dict(row))


@admin_bp.patch("/task-showcases/<int:tid>")
def admin_update_task_showcase(tid: int):
    admin, err = require_admin_token()
    if err:
        return err
    row = TaskShowcase.query.get_or_404(tid)
    body = request.get_json(silent=True) or {}
    _apply_fields(
        row,
        body,
        [
            "name", "category", "cover_url", "difficulty", "deadline_note",
            "status_label", "description", "requirement", "process_text",
            "materials", "reference_image_url", "sort_order", "is_active",
        ],
    )
    db.session.commit()
    return jsonify({"ok": True})


@admin_bp.delete("/task-showcases/<int:tid>")
def admin_delete_task_showcase(tid: int):
    admin, err = require_admin_token()
    if err:
        return err
    row = TaskShowcase.query.get_or_404(tid)
    UserTask.query.filter_by(task_id=row.id).delete(synchronize_session=False)
    db.session.delete(row)
    db.session.commit()
    return jsonify({"ok": True})


# --- 色卡预设库 ---

@admin_bp.get("/color-card/options")
def admin_color_card_options():
    admin, err = require_admin_token()
    if err:
        return err
    dims = ColorCardDimension.query.order_by(ColorCardDimension.sort_order).all()
    result = []
    for d in dims:
        opts = (
            ColorCardOption.query.filter_by(dimension_id=d.id)
            .order_by(ColorCardOption.sort_order)
            .all()
        )
        result.append({
            "id": d.id,
            "code": d.code,
            "name": d.name,
            "options": [{"id": o.id, "name": o.name, "sort_order": o.sort_order} for o in opts],
        })
    return jsonify({"dimensions": result})


@admin_bp.post("/color-card/options")
def admin_create_color_card_option():
    admin, err = require_admin_token()
    if err:
        return err
    body = request.get_json(silent=True) or {}
    dimension_id = body.get("dimension_id")
    if not dimension_id:
        return jsonify({"error": "dimension_id_required"}), 400
    
    # 检查维度是否存在，避免外键约束错误导致的 500
    dim = ColorCardDimension.query.get(dimension_id)
    if not dim:
        return jsonify({"error": "dimension_not_found"}), 404

    row = ColorCardOption(
        dimension_id=dimension_id,
        name=body.get("name", ""),
        sort_order=body.get("sort_order", 0),
    )
    db.session.add(row)
    db.session.commit()
    return jsonify({"id": row.id})


@admin_bp.patch("/color-card/options/<int:oid>")
def admin_update_color_card_option(oid: int):
    admin, err = require_admin_token()
    if err:
        return err
    row = ColorCardOption.query.get_or_404(oid)
    body = request.get_json(silent=True) or {}
    _apply_fields(row, body, ["name", "sort_order"])
    db.session.commit()
    return jsonify({"ok": True})


@admin_bp.delete("/color-card/options/<int:oid>")
def admin_delete_color_card_option(oid: int):
    admin, err = require_admin_token()
    if err:
        return err
    row = ColorCardOption.query.get_or_404(oid)
    db.session.delete(row)
    db.session.commit()
    return jsonify({"ok": True})


@admin_bp.get("/color-card/presets")
def admin_color_card_presets():
    admin, err = require_admin_token()
    if err:
        return err
    rows = ColorCardPreset.query.all()
    return jsonify({
        "items": [
            {
                "id": r.id,
                "fabric_option_id": r.fabric_option_id,
                "pattern_option_id": r.pattern_option_id,
                "mordant_option_id": r.mordant_option_id,
                "time_option_id": r.time_option_id,
                "image_url": r.image_url,
            }
            for r in rows
        ]
    })


# --- 用户提交内容监控 ---

@admin_bp.get("/user-diy-records")
def admin_get_user_diy_records():
    admin, err = require_admin_token()
    if err: return err
    
    source_type = request.args.get("source_type")
    q = UserDiyRecord.query
    if source_type:
        q = q.filter_by(source_type=source_type)
        
    rows = q.order_by(UserDiyRecord.created_at.desc()).all()
    return jsonify({
        "items": [
            {
                "id": r.id,
                "user": {
                    "id": r.user_id,
                    "username": r.user.username,
                    "avatar_url": r.user.avatar_url
                },
                "source_type": r.source_type,
                "source_id": r.source_id,
                "payload": json.loads(r.payload_json or "{}"),
                "preview_image_url": r.preview_image_url,
                "title": r.title,
                "created_at": r.created_at.isoformat()
            } for r in rows
        ]
    })


@admin_bp.get("/user-tasks")
def admin_get_user_tasks():
    admin, err = require_admin_token()
    if err: return err
    
    status = request.args.get("status")
    q = UserTask.query
    if status:
        q = q.filter_by(status=status)
        
    rows = q.order_by(UserTask.accepted_at.desc()).all()
    return jsonify({
        "items": [
            {
                "id": r.id,
                "user": {
                    "id": r.user_id,
                    "username": r.user.username,
                    "avatar_url": r.user.avatar_url
                },
                "task": {
                    "id": r.task_id,
                    "name": r.task.name,
                    "category": r.task.category
                },
                "status": r.status,
                "submit_image_url": r.submit_image_url,
                "submit_description": r.submit_description,
                "accepted_at": r.accepted_at.isoformat() if r.accepted_at else None,
                "submitted_at": r.submitted_at.isoformat() if r.submitted_at else None,
                "completed_at": r.completed_at.isoformat() if r.completed_at else None,
            } for r in rows
        ]
    })


@admin_bp.patch("/user-tasks/<int:utid>")
def admin_update_user_task(utid: int):
    admin, err = require_admin_token()
    if err: return err
    
    ut = UserTask.query.get_or_404(utid)
    body = request.get_json(silent=True) or {}
    
    if "status" in body:
        ut.status = body["status"]
        if body["status"] == "completed":
            ut.completed_at = utc_now()
            
    db.session.commit()
    return jsonify({"ok": True})


@admin_bp.post("/color-card/presets")
def admin_create_color_card_preset():
    admin, err = require_admin_token()
    if err:
        return err
    body = request.get_json(silent=True) or {}
    required = ["fabric_option_id", "pattern_option_id", "mordant_option_id", "time_option_id", "image_url"]
    if not all(body.get(k) for k in required):
        return jsonify({"error": "preset_fields_required"}), 400
    
    # 验证所有选项 ID 是否真实存在
    option_ids = [
        body["fabric_option_id"],
        body["pattern_option_id"],
        body["mordant_option_id"],
        body["time_option_id"]
    ]
    option_err = _validate_color_card_option_ids(option_ids)
    if option_err:
        return option_err

    duplicate = _find_duplicate_color_card_preset(body)
    if duplicate:
        return jsonify({"error": "preset_already_exists", "id": duplicate.id}), 409

    row = ColorCardPreset(
        fabric_option_id=body["fabric_option_id"],
        pattern_option_id=body["pattern_option_id"],
        mordant_option_id=body["mordant_option_id"],
        time_option_id=body["time_option_id"],
        image_url=body["image_url"],
    )
    db.session.add(row)
    db.session.commit()
    return jsonify({"id": row.id})


@admin_bp.patch("/color-card/presets/<int:pid>")
def admin_update_color_card_preset(pid: int):
    admin, err = require_admin_token()
    if err:
        return err
    row = ColorCardPreset.query.get_or_404(pid)
    body = request.get_json(silent=True) or {}
    _apply_fields(
        row,
        body,
        [
            "fabric_option_id", "pattern_option_id", "mordant_option_id",
            "time_option_id", "image_url",
        ],
    )

    option_err = _validate_color_card_option_ids(
        [
            row.fabric_option_id,
            row.pattern_option_id,
            row.mordant_option_id,
            row.time_option_id,
        ]
    )
    if option_err:
        return option_err

    duplicate = _find_duplicate_color_card_preset(
        {
            "fabric_option_id": row.fabric_option_id,
            "pattern_option_id": row.pattern_option_id,
            "mordant_option_id": row.mordant_option_id,
            "time_option_id": row.time_option_id,
        },
        exclude_id=row.id,
    )
    if duplicate:
        return jsonify({"error": "preset_already_exists", "id": duplicate.id}), 409

    db.session.commit()
    return jsonify({"ok": True})


@admin_bp.delete("/color-card/presets/<int:pid>")
def admin_delete_color_card_preset(pid: int):
    admin, err = require_admin_token()
    if err:
        return err
    row = ColorCardPreset.query.get_or_404(pid)
    db.session.delete(row)
    db.session.commit()
    return jsonify({"ok": True})


# --- 用户管理 ---

@admin_bp.get("/users")
def admin_get_users():
    admin, err = require_admin_token()
    if err: return err
    
    # 过滤掉既没有邮箱又是游客的账号（即：访客快速登录账号）
    user_filter = or_(MiniappUser.email.isnot(None), MiniappUser.role != "tourist")
    users = MiniappUser.query.filter(user_filter).order_by(MiniappUser.created_at.desc()).all()
    return jsonify({
        "items": [
            {
                "id": u.id,
                "openid": u.openid,
                "username": u.username,
                "avatar_url": u.avatar_url,
                "email": u.email,
                "role": u.role,
                "has_password": bool(u.password_hash),
                "created_at": u.created_at.isoformat() if u.created_at else None,
                "last_visit_at": u.last_visit_at.isoformat() if u.last_visit_at else None,
            } for u in users
        ]
    })

@admin_bp.delete("/users/<int:uid>")
def admin_delete_user(uid: int):
    admin, err = require_admin_token()
    if err: return err
    
    user = MiniappUser.query.get_or_404(uid)
    db.session.delete(user)
    db.session.commit()
    return jsonify({"ok": True})

@admin_bp.patch("/users/<int:uid>/role")
def admin_update_user_role(uid: int):
    admin, err = require_admin_token()
    if err: return err
    
    user = MiniappUser.query.get_or_404(uid)
    body = request.get_json(silent=True) or {}
    previous_role = user.role
    
    role = body.get("role")
    if role and role not in ["tourist", "worker", "admin"]:
        return jsonify({"error": "invalid_role"}), 400
    
    if role:
        user.role = role
        
    password = body.get("password")
    if password and user.role != "admin":
        return jsonify({
            "error": "password_only_for_admin",
            "message": "只有管理员账号可以设置后台登录密码。",
        }), 400

    if password:
        user.password_hash = generate_password_hash(password)

    if user.role == "admin":
        _, sync_err = _ensure_admin_account(
            user,
            password_hash=user.password_hash if password else None,
        )
        if sync_err:
            return sync_err
    elif previous_role == "admin":
        _deactivate_linked_admin_user(user)

    db.session.commit()
    return jsonify({"ok": True, "role": user.role})


# --- 埋点查询（可选） ---

@admin_bp.get("/analytics/events")
def admin_analytics_events():
    admin, err = require_admin_token()
    if err:
        return err
    q = AnalyticsEvent.query
    event_type = request.args.get("event_type")
    if event_type:
        q = q.filter_by(event_type=event_type)
    limit = min(request.args.get("limit", 100, type=int), 500)
    rows = q.order_by(AnalyticsEvent.created_at.desc()).limit(limit).all()
    return jsonify({
        "items": [
            {
                "id": r.id,
                "user_id": r.user_id,
                "event_type": r.event_type,
                "page_path": r.page_path,
                "target_type": r.target_type,
                "target_id": r.target_id,
                "meta_json": r.meta_json,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in rows
        ]
    })
