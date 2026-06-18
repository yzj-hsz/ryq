from __future__ import annotations

import json
from pathlib import Path

from flask import Blueprint, current_app, jsonify, request

from .helpers import resolve_want_qrcode, stable_detail_html, stable_media_url
from .models import (
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
    TaskShowcase,
    Product,
    ProductFlowStep,
    ProductGallery,
    UserDiyRecord,
    UserFavorite,
    UserFootprint,
    UserTask,
    MiniappUser,
    db,
)
from .routes_auth import require_admin_token, require_user_token
from .time_utils import utc_now
from .upload_security import (
    USER_UPLOAD_POLICY,
    UploadValidationError,
    store_validated_upload,
)

bp = Blueprint("api", __name__)
TASK_TEMP_COVER = "/static/uploads/task_teadye_cover.jpg"
TASK_TEMP_REFERENCE = "/static/uploads/task_teadye_detail.jpg"


def _user_payload(user: MiniappUser) -> dict:
    return {
        "id": user.id,
        "username": user.username,
        "avatar_url": user.avatar_url,
        "email": user.email,
        "role": user.role,
        "created_at": user.created_at.isoformat() if user.created_at else None,
    }


def _publisher_payload(publisher) -> dict | None:
    if not publisher:
        return None
    return {
        "id": publisher.id,
        "username": publisher.username,
        "avatar_url": None,
        "email": publisher.email,
        "created_at": publisher.created_at.isoformat() if publisher.created_at else None,
    }


def _published_products_query():
    return Product.query.filter_by(status="published")


@bp.get("/home")
def home():
    banners = (
        HomeBanner.query.filter_by(is_active=True)
        .order_by(HomeBanner.sort_order)
        .all()
    )
    highlights = (
        HomeHighlight.query.filter_by(is_active=True)
        .order_by(HomeHighlight.sort_order)
        .all()
    )
    
    # 获取视频轮播
    videos = HomeVideo.query.filter_by(is_active=True).order_by(HomeVideo.sort_order).all()
    # 获取PPT轮播
    ppts = HomePPT.query.filter_by(is_active=True).order_by(HomePPT.sort_order).all()
    # 获取图文
    intro_text = HomeIntroText.query.first()

    return jsonify(
        {
            "intro": {
                "videos": [
                    {"id": v.id, "video_url": v.video_url, "cover_url": v.cover_url, "title": v.title}
                    for v in videos
                ],
                "ppts": [
                    {"id": p.id, "image_url": p.image_url, "title": p.title}
                    for p in ppts
                ],
                "text_html": intro_text.html if intro_text else "",
                # --- 兼容旧版前端字段，防止 length of undefined 错误 ---
                "video_cover": videos[0].cover_url if videos else "",
                "ppt_slides": [p.image_url for p in ppts]
            },
            "banners": [
                {
                    "id": b.id, 
                    "title": b.title, 
                    "image_url": stable_media_url(b.image_url),
                    "link_type": b.link_type,
                    "link_value": b.link_value,
                    "has_detail": bool(b.detail_html)
                } for b in banners
            ],
            "highlights": [
                {
                    "id": h.id, 
                    "icon": h.icon, 
                    "title": h.title, 
                    "summary": h.summary,
                    "image_url": stable_media_url(h.image_url),
                }
                for h in highlights
            ],
        }
    )


@bp.get("/home/highlights/<int:hid>")
def highlight_detail(hid: int):
    h = HomeHighlight.query.filter_by(id=hid, is_active=True).first_or_404()
    return jsonify({
        "id": h.id,
        "icon": h.icon,
        "title": h.title,
        "summary": h.summary,
        "image_url": stable_media_url(h.image_url),
        "detail_html": stable_detail_html(h.detail_html)
    })


@bp.get("/home/banners/<int:bid>")
def banner_detail(bid: int):
    b = HomeBanner.query.filter_by(id=bid, is_active=True).first_or_404()
    return jsonify({
        "id": b.id,
        "title": b.title,
        "image_url": stable_media_url(b.image_url),
        "detail_html": stable_detail_html(b.detail_html)
    })


@bp.get("/color-card/options")
def color_options():
    dims = (
        ColorCardDimension.query.order_by(ColorCardDimension.sort_order).all()
    )
    result = []
    for d in dims:
        opts = (
            ColorCardOption.query.filter_by(dimension_id=d.id)
            .order_by(ColorCardOption.sort_order)
            .all()
        )
        result.append(
            {
                "code": d.code,
                "name": d.name,
                "options": [
                    {"id": o.id, "dimension_code": d.code, "name": o.name} for o in opts
                ],
            }
        )
    return jsonify({"dimensions": result})


@bp.get("/color-card/preset")
def color_preset():
    fid = request.args.get("fabric_id", type=int)
    pid = request.args.get("pattern_id", type=int)
    mid = request.args.get("mordant_id", type=int)
    tid = request.args.get("time_id", type=int)
    if not all([fid, pid, mid, tid]):
        return jsonify({"image_url": None})
    row = ColorCardPreset.query.filter_by(
        fabric_option_id=fid,
        pattern_option_id=pid,
        mordant_option_id=mid,
        time_option_id=tid,
    ).first()
    return jsonify({"image_url": stable_media_url(row.image_url) if row else None})


@bp.get("/experiences")
def experiences():
    region = request.args.get("region", "shenzhen")
    rows = (
        Experience.query.filter_by(region=region, status="published")
        .order_by(Experience.sort_order)
        .all()
    )
    return jsonify(
        {
            "items": [
                {
                    "id": e.id,
                    "name": e.name,
                    "cover_url": stable_media_url(e.cover_url),
                    "region": e.region,
                    "location": e.location or "",
                    "time_note": e.time_note or "",
                    "duration_note": e.duration_note or "",
                    "badge": e.badge,
                    "badge_color": e.badge_color,
                    "summary": e.summary or "",
                }
                for e in rows
            ]
        }
    )


@bp.get("/experiences/<int:eid>")
def experience_detail(eid: int):
    e = Experience.query.filter_by(id=eid, status="published").first_or_404()
    return jsonify(
        {
            "id": e.id,
            "name": e.name,
            "cover_url": stable_media_url(e.cover_url),
            "region": e.region,
            "location": e.location,
            "time_note": e.time_note,
            "duration_note": e.duration_note,
            "badge": e.badge,
            "badge_color": e.badge_color,
            "summary": e.summary,
            "flow_text": e.flow_text,
            "value_text": e.value_text,
            "notice_html": e.notice_html,
            "diy_schemas": [
                {
                    "id": s.id,
                    "group_key": s.group_key,
                    "group_label": s.group_label,
                    "choices": [
                        {"id": c.id, "label": c.label}
                        for c in sorted(s.choices, key=lambda x: x.sort_order)
                    ]
                }
                for s in sorted(e.diy_schemas, key=lambda x: x.sort_order)
            ]
        }
    )


@bp.get("/culture/promo")
def culture_promo():
    row = CulturePromo.query.order_by(CulturePromo.id).first()
    if not row:
        return jsonify({"title": "", "subtitle": "", "cover_url": "", "video_url": None})
    return jsonify(
        {
            "id": row.id,
            "title": row.title,
            "subtitle": row.subtitle or "",
            "cover_url": stable_media_url(row.cover_url),
            "video_url": row.video_url,
        }
    )


@bp.get("/culture/articles")
def culture_articles():
    q = CultureArticle.query.filter_by(status="published")
    category = request.args.get("category")
    if category:
        q = q.filter_by(category=category)
    rows = q.order_by(CultureArticle.sort_order).all()
    return jsonify(
        {
            "items": [
                {
                    "id": a.id,
                    "title": a.title,
                    "category": a.category,
                    "cover_url": stable_media_url(a.cover_url),
                    "summary": a.summary or "",
                    "list_no": a.list_no,
                }
                for a in rows
            ]
        }
    )


@bp.get("/culture/articles/<int:aid>")
def culture_article_detail(aid: int):
    a = CultureArticle.query.filter_by(id=aid, status="published").first_or_404()
    return jsonify(
        {
            "id": a.id,
            "title": a.title,
            "category": a.category,
            "cover_url": stable_media_url(a.cover_url),
            "summary": a.summary,
            "body_html": stable_detail_html(a.body_html),
        }
    )


@bp.get("/task-showcases")
def task_showcases():
    rows = (
        TaskShowcase.query.filter_by(is_active=True)
        .order_by(TaskShowcase.sort_order)
        .all()
    )
    cat = request.args.get("category")
    if cat:
        rows = [r for r in rows if r.category == cat]
    return jsonify({"items": [_task_brief(r) for r in rows]})


@bp.get("/task-showcases/<int:tid>")
def task_detail(tid: int):
    t = TaskShowcase.query.filter_by(id=tid, is_active=True).first_or_404()
    return jsonify(_task_full(t))


def _task_brief(t: TaskShowcase):
    return {
        "id": t.id,
        "name": t.name,
        "category": t.category,
        "cover_url": stable_media_url(t.cover_url or TASK_TEMP_COVER),
        "difficulty": t.difficulty,
        "deadline_note": t.deadline_note,
        "status_label": t.status_label,
        "summary": (t.description or "")[:120],
    }


def _task_full(t: TaskShowcase):
    return {
        "id": t.id,
        "name": t.name,
        "category": t.category,
        "cover_url": stable_media_url(t.cover_url or TASK_TEMP_COVER),
        "difficulty": t.difficulty,
        "deadline_note": t.deadline_note,
        "status_label": t.status_label,
        "description": t.description,
        "requirement": t.requirement,
        "process_text": t.process_text,
        "materials": t.materials,
        "reference_image_url": stable_media_url(t.reference_image_url or TASK_TEMP_REFERENCE),
    }


@bp.post("/analytics/events")
def analytics():
    user, err = require_user_token()
    # 统计接口允许匿名，如果有 token 错误（非缺失）则忽略或记录
    # 这里我们只在没有错误时获取 user_id
    user_id = user.id if not err and user else None
    
    body = request.get_json(silent=True) or {}
    event_type = body.get("event_type")
    if not event_type:
        return jsonify({"error": "event_type_required"}), 400
    
    event = AnalyticsEvent(
        user_id=user_id,
        event_type=event_type,
        page_path=body.get("page_path"),
        target_type=body.get("target_type"),
        target_id=body.get("target_id"),
        meta_json=json.dumps(body.get("meta", {}))
    )
    db.session.add(event)
    db.session.commit()
    return jsonify({"ok": True})


# --- 商品接口 ---

@bp.get("/products")
def products():
    cat = request.args.get("list_category")
    p_cat = request.args.get("primary_category")
    p_type = request.args.get("product_type")
    keyword = (request.args.get("keyword") or "").strip()

    q = _published_products_query()
    if cat:
        q = q.filter_by(list_category=cat)
    if p_cat:
        q = q.filter_by(primary_category=p_cat)
    if p_type:
        q = q.filter_by(product_type=p_type)
    if keyword:
        like = f"%{keyword}%"
        q = q.filter(
            db.or_(
                Product.name.ilike(like),
                Product.summary.ilike(like),
            )
        )

    rows = q.order_by(Product.sort_order).all()
    return jsonify({
        "items": [
            {
                "id": p.id,
                "name": p.name,
                "summary": p.summary or "",
                "cover_url": stable_media_url(p.cover_url),
                "product_type": p.product_type,
                "list_category": p.list_category,
                "primary_category": p.primary_category,
                "producer": p.producer,
                "sort_order": p.sort_order,
                "created_at": p.created_at.isoformat(),
                "publisher": _publisher_payload(p.publisher),
                "tags": [p.product_type] if p.product_type else []
            } for p in rows
        ]
    })

@bp.get("/products/<int:pid>")
def product_detail(pid: int):
    p = _published_products_query().filter_by(id=pid).first_or_404()
    return jsonify({
        "id": p.id,
        "name": p.name,
        "summary": p.summary or "",
        "cover_url": stable_media_url(p.cover_url),
        "product_type": p.product_type,
        "list_category": p.list_category,
        "primary_category": p.primary_category,
        "producer": p.producer,
        "origin": p.origin,
        "process_text": p.process_text,
        "detail_html": stable_detail_html(p.detail_html),
        "sort_order": p.sort_order,
        "created_at": p.created_at.isoformat(),
        "publisher": _publisher_payload(p.publisher),
        "tags": [p.product_type] if p.product_type else [],
        "flow_steps": [
            {
                "step_order": s.step_order,
                "image_url": stable_media_url(s.image_url),
                "caption": s.caption
            } for s in sorted(p.flow_steps, key=lambda x: x.step_order)
        ],
        "gallery": [
            {
                "url": stable_media_url(g.url),
                "sort_order": g.sort_order
            } for g in sorted(p.gallery, key=lambda x: x.sort_order)
        ]
    })

@bp.get("/products/<int:pid>/want-qrcode")
def product_want_qrcode(pid: int):
    p = _published_products_query().filter_by(id=pid).first_or_404()
    return jsonify({
        "qrcode_url": resolve_want_qrcode(p.qr_code_url),
        "is_default": not bool(p.qr_code_url),
    })


@bp.post("/products/<int:pid>/want-click")
def product_want_click(pid: int):
    if not _published_products_query().filter_by(id=pid).first():
        return jsonify({"error": "product_not_found"}), 404

    user, err = require_user_token()
    user_id = user.id if not err and user else None

    event = AnalyticsEvent(
        user_id=user_id,
        event_type="want_click",
        target_type="product",
        target_id=pid
    )
    db.session.add(event)
    db.session.commit()
    return jsonify({"ok": True})


# --- 用户个人中心接口 ---

@bp.get("/me")
def me():
    user, err = require_user_token()
    if err:
        return err

    diy_count = UserDiyRecord.query.filter_by(user_id=user.id).count()
    favorite_count = UserFavorite.query.filter_by(user_id=user.id).count()

    return jsonify(
        {
            **_user_payload(user),
            "stats": {
                "diy_count": diy_count,
                "favorite_count": favorite_count,
            },
        }
    )


@bp.patch("/me")
def update_me():
    user, err = require_user_token()
    if err:
        return err

    body = request.get_json(silent=True) or {}
    if "username" in body:
        user.username = body["username"]
    if "avatar_url" in body:
        user.avatar_url = body["avatar_url"]

    db.session.commit()
    return jsonify({"ok": True})


@bp.get("/me/diy-records")
def get_diy_records():
    user, err = require_user_token()
    if err: return err
    
    records = UserDiyRecord.query.filter_by(user_id=user.id).order_by(UserDiyRecord.created_at.desc()).all()
    return jsonify({
        "items": [
            {
                "id": r.id,
                "source_type": r.source_type,
                "source_id": r.source_id,
                "payload": json.loads(r.payload_json or "{}"),
                "preview_image_url": r.preview_image_url,
                "title": r.title,
                "created_at": r.created_at.isoformat()
            } for r in records
        ]
    })


@bp.post("/me/diy-records")
def create_diy_record():
    user, err = require_user_token()
    if err: return err
    
    body = request.get_json(silent=True) or {}
    record = UserDiyRecord(
        user_id=user.id,
        source_type=body.get("source_type"),
        source_id=body.get("source_id"),
        payload_json=json.dumps(body.get("payload", {})),
        preview_image_url=body.get("preview_image_url"),
        title=body.get("title")
    )
    db.session.add(record)
    db.session.commit()
    return jsonify({"id": record.id})


@bp.delete("/me/diy-records/<int:rid>")
def delete_diy_record(rid: int):
    user, err = require_user_token()
    if err: return err
    
    record = UserDiyRecord.query.filter_by(id=rid, user_id=user.id).first_or_404()
    db.session.delete(record)
    db.session.commit()
    return jsonify({"ok": True})


@bp.get("/me/favorites")
def get_favorites():
    user, err = require_user_token()
    if err: return err
    
    target_type = request.args.get("target_type")
    q = UserFavorite.query.filter_by(user_id=user.id)
    if target_type:
        q = q.filter_by(target_type=target_type)
        
    favs = q.order_by(UserFavorite.created_at.desc()).all()
    return jsonify({
        "items": [
            {
                "id": f.id,
                "target_type": f.target_type,
                "target_id": f.target_id,
                "created_at": f.created_at.isoformat()
            } for f in favs
        ]
    })


@bp.post("/me/favorites")
def add_favorite():
    user, err = require_user_token()
    if err: return err
    
    body = request.get_json(silent=True) or {}
    target_type = body.get("target_type")
    target_id = body.get("target_id")
    
    if not target_type or not target_id:
        return jsonify({"error": "target_type_and_id_required"}), 400
        
    # 检查是否已存在
    existing = UserFavorite.query.filter_by(
        user_id=user.id, target_type=target_type, target_id=target_id
    ).first()
    if existing:
        return jsonify({"id": existing.id, "msg": "already_favorited"})
        
    fav = UserFavorite(user_id=user.id, target_type=target_type, target_id=target_id)
    db.session.add(fav)
    db.session.commit()
    return jsonify({"id": fav.id})


@bp.delete("/me/favorites")
def remove_favorite():
    user, err = require_user_token()
    if err: return err
    
    # 支持两种删除方式：通过 ID 或通过 target_type+target_id
    fid = request.args.get("id", type=int)
    if fid:
        fav = UserFavorite.query.filter_by(id=fid, user_id=user.id).first_or_404()
    else:
        target_type = request.args.get("target_type")
        target_id = request.args.get("target_id", type=int)
        if not target_type or not target_id:
            return jsonify({"error": "id_or_target_required"}), 400
        fav = UserFavorite.query.filter_by(
            user_id=user.id, target_type=target_type, target_id=target_id
        ).first_or_404()
        
    db.session.delete(fav)
    db.session.commit()
    return jsonify({"ok": True})


@bp.patch("/me/diy-records/<int:rid>")
def update_diy_record(rid: int):
    user, err = require_user_token()
    if err: return err
    
    record = UserDiyRecord.query.filter_by(id=rid, user_id=user.id).first_or_404()
    body = request.get_json(silent=True) or {}
    
    if "title" in body:
        record.title = body["title"]
    if "payload" in body:
        record.payload_json = json.dumps(body["payload"])
    if "preview_image_url" in body:
        record.preview_image_url = body["preview_image_url"]
        
    db.session.commit()
    return jsonify({"ok": True})


# --- 任务互动接口 ---

@bp.post("/task-showcases/<int:tid>/accept")
def accept_task(tid: int):
    user, err = require_user_token()
    if err: return err
    
    if user.role not in ["worker", "admin"]:
        return jsonify({"error": "permission_denied", "message": "仅工作者或管理员可接取任务"}), 403
    
    # 检查任务是否存在且激活
    task = TaskShowcase.query.filter_by(id=tid, is_active=True).first_or_404()
    
    # 检查是否已接取
    existing = UserTask.query.filter_by(user_id=user.id, task_id=tid).first()
    if existing:
        return jsonify({"msg": "already_accepted", "status": existing.status})
        
    ut = UserTask(user_id=user.id, task_id=tid, status="accepted")
    db.session.add(ut)
    db.session.commit()
    return jsonify({"id": ut.id, "status": ut.status})


@bp.post("/task-showcases/<int:tid>/submit")
def submit_task_work(tid: int):
    user, err = require_user_token()
    if err: return err
    
    if user.role not in ["worker", "admin"]:
        return jsonify({"error": "permission_denied", "message": "仅工作者或管理员可提交任务"}), 403
    
    ut = UserTask.query.filter_by(user_id=user.id, task_id=tid).first_or_404()
    if ut.status == "completed":
        return jsonify({"error": "task_already_completed"}), 400
        
    body = request.get_json(silent=True) or {}
    image_url = body.get("image_url")
    description = body.get("description")
    
    if not image_url:
        return jsonify({"error": "image_url_required"}), 400
        
    ut.submit_image_url = image_url
    ut.submit_description = description
    ut.status = "submitted"
    ut.submitted_at = utc_now()
    
    db.session.commit()
    return jsonify({"ok": True, "status": ut.status})


@bp.get("/me/tasks")
def get_my_tasks():
    user, err = require_user_token()
    if err: return err
    
    tasks = UserTask.query.filter_by(user_id=user.id).order_by(UserTask.accepted_at.desc()).all()
    return jsonify({
        "items": [
            {
                "id": ut.id,
                "task_id": ut.task_id,
                "task_name": ut.task.name,
                "task_cover": stable_media_url(ut.task.cover_url or TASK_TEMP_COVER),
                "status": ut.status,
                "submit_image_url": stable_media_url(ut.submit_image_url),
                "submit_description": ut.submit_description,
                "accepted_at": ut.accepted_at.isoformat() if ut.accepted_at else None,
                "submitted_at": ut.submitted_at.isoformat() if ut.submitted_at else None,
                "completed_at": ut.completed_at.isoformat() if ut.completed_at else None,
            } for ut in tasks
        ]
    })


@bp.get("/me/footprints")
def get_footprints():
    user, err = require_user_token()
    if err: return err
    
    # 仅保留最近 20 条
    fps = UserFootprint.query.filter_by(user_id=user.id).order_by(UserFootprint.visited_at.desc()).limit(20).all()
    return jsonify({
        "items": [
            {
                "id": f.id,
                "target_type": f.target_type,
                "target_id": f.target_id,
                "visited_at": f.visited_at.isoformat()
            } for f in fps
        ]
    })


@bp.post("/upload")
def upload_file():
    user, err = require_user_token()
    if err:
        admin, admin_err = require_admin_token()
        if admin_err:
            return err
    
    if 'file' not in request.files:
        return jsonify({"error": "no_file"}), 400
        
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "empty_filename"}), 400

    try:
        result = store_validated_upload(
            file,
            Path(current_app.config["UPLOAD_FOLDER"]),
            USER_UPLOAD_POLICY,
        )
    except UploadValidationError as exc:
        return jsonify({"error": exc.error, "message": exc.message}), exc.status_code

    return jsonify(result)
