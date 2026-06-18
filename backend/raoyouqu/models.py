from __future__ import annotations

from flask_sqlalchemy import SQLAlchemy

from .time_utils import utc_now

db = SQLAlchemy()


class SiteConfig(db.Model):
    __tablename__ = "site_config"
    id = db.Column(db.Integer, primary_key=True)
    config_key = db.Column(db.String(64), unique=True, nullable=False)
    config_value = db.Column(db.Text, nullable=False)


class AdminUser(db.Model):
    """后台管理员：仅服务端创建，无公开注册接口。"""

    __tablename__ = "admin_user"
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(64), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(256), nullable=False)
    display_name = db.Column(db.String(64))
    email = db.Column(db.String(128), unique=True, nullable=False, index=True)
    is_active = db.Column(db.Boolean, default=True)
    last_login_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=utc_now, nullable=False)


class MediaAsset(db.Model):
    """媒体文件元数据"""
    __tablename__ = "media_asset"
    id = db.Column(db.Integer, primary_key=True)
    storage_key = db.Column(db.String(256), unique=True)
    url = db.Column(db.String(512), nullable=False)
    mime = db.Column(db.String(64))
    size = db.Column(db.Integer) # bytes
    uploaded_by_admin_id = db.Column(db.Integer, db.ForeignKey("admin_user.id"))
    created_at = db.Column(db.DateTime, default=utc_now)


class HomeVideo(db.Model):
    """首页轮播视频"""
    __tablename__ = "home_video"
    id = db.Column(db.Integer, primary_key=True)
    video_url = db.Column(db.String(512), nullable=False)
    cover_url = db.Column(db.String(512)) # 视频封面
    title = db.Column(db.String(128))
    sort_order = db.Column(db.Integer, default=0)
    is_active = db.Column(db.Boolean, default=True)


class HomePPT(db.Model):
    """首页轮播PPT(图片)"""
    __tablename__ = "home_ppt"
    id = db.Column(db.Integer, primary_key=True)
    image_url = db.Column(db.String(512), nullable=False)
    title = db.Column(db.String(128))
    sort_order = db.Column(db.Integer, default=0)
    is_active = db.Column(db.Boolean, default=True)


class HomeIntroText(db.Model):
    """首页介绍图文 (唯一)"""
    __tablename__ = "home_intro_text"
    id = db.Column(db.Integer, primary_key=True)
    html = db.Column(db.Text, nullable=False)
    updated_at = db.Column(db.DateTime, default=utc_now, onupdate=utc_now)


class HomeBanner(db.Model):
    __tablename__ = "home_banner"
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(128), nullable=False)
    image_url = db.Column(db.String(512), nullable=False)
    detail_html = db.Column(db.Text) # 新增：精选推荐详情，参照项目亮点逻辑
    link_type = db.Column(db.String(32), default="none") # 'none', 'miniprogram_page', 'h5', 'detail'
    link_value = db.Column(db.String(512))
    sort_order = db.Column(db.Integer, default=0)
    is_active = db.Column(db.Boolean, default=True)


class HomeHighlight(db.Model):
    __tablename__ = "home_highlight"
    id = db.Column(db.Integer, primary_key=True)
    icon = db.Column(db.String(32), nullable=False)
    title = db.Column(db.String(64), nullable=False)
    summary = db.Column(db.String(256), nullable=False)
    image_url = db.Column(db.String(512))
    detail_html = db.Column(db.Text) # 新增：项目亮点详情
    sort_order = db.Column(db.Integer, default=0)
    is_active = db.Column(db.Boolean, default=True)


class ColorCardDimension(db.Model):
    __tablename__ = "color_card_dimension"
    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(32), unique=True, nullable=False)
    name = db.Column(db.String(32), nullable=False)
    sort_order = db.Column(db.Integer, default=0)


class ColorCardOption(db.Model):
    __tablename__ = "color_card_option"
    id = db.Column(db.Integer, primary_key=True)
    dimension_id = db.Column(
        db.Integer, db.ForeignKey("color_card_dimension.id"), nullable=False
    )
    name = db.Column(db.String(64), nullable=False)
    sort_order = db.Column(db.Integer, default=0)
    dimension = db.relationship("ColorCardDimension", backref="options")


class ColorCardPreset(db.Model):
    __tablename__ = "color_card_preset"
    id = db.Column(db.Integer, primary_key=True)
    fabric_option_id = db.Column(db.Integer, nullable=False)
    pattern_option_id = db.Column(db.Integer, nullable=False)
    mordant_option_id = db.Column(db.Integer, nullable=False)
    time_option_id = db.Column(db.Integer, nullable=False)
    image_url = db.Column(db.String(512), nullable=False)
    __table_args__ = (
        db.UniqueConstraint(
            "fabric_option_id",
            "pattern_option_id",
            "mordant_option_id",
            "time_option_id",
            name="uq_color_card_preset_combination",
        ),
    )


class Experience(db.Model):
    __tablename__ = "experience"
    id = db.Column(db.Integer, primary_key=True)
    region = db.Column(db.String(16), nullable=False)
    name = db.Column(db.String(128), nullable=False)
    cover_url = db.Column(db.String(512), nullable=False)
    location = db.Column(db.String(64))
    time_note = db.Column(db.String(64))
    duration_note = db.Column(db.String(64))
    badge = db.Column(db.String(32))
    badge_color = db.Column(db.String(16))
    summary = db.Column(db.Text)
    flow_text = db.Column(db.String(512))
    value_text = db.Column(db.Text)
    notice_html = db.Column(db.Text)
    sort_order = db.Column(db.Integer, default=0)
    status = db.Column(db.String(16), default="published")
    diy_schemas = db.relationship("ExperienceDiySchema", backref="experience", lazy="selectin")


class ExperienceDiySchema(db.Model):
    """体验下可配置的 DIY 维度"""
    __tablename__ = "experience_diy_schema"
    id = db.Column(db.Integer, primary_key=True)
    experience_id = db.Column(db.Integer, db.ForeignKey("experience.id"), nullable=False)
    group_key = db.Column(db.String(64), nullable=False)
    group_label = db.Column(db.String(64), nullable=False)
    sort_order = db.Column(db.Integer, default=0)
    choices = db.relationship("ExperienceDiyChoice", backref="schema", lazy="selectin")


class ExperienceDiyChoice(db.Model):
    """DIY 可选项"""
    __tablename__ = "experience_diy_choice"
    id = db.Column(db.Integer, primary_key=True)
    schema_id = db.Column(db.Integer, db.ForeignKey("experience_diy_schema.id"), nullable=False)
    label = db.Column(db.String(64), nullable=False)
    sort_order = db.Column(db.Integer, default=0)


class CulturePromo(db.Model):
    __tablename__ = "culture_promo"
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(128), nullable=False)
    subtitle = db.Column(db.String(256))
    cover_url = db.Column(db.String(512), nullable=False)
    video_url = db.Column(db.String(512))


class CultureArticle(db.Model):
    __tablename__ = "culture_article"
    id = db.Column(db.Integer, primary_key=True)
    category = db.Column(db.String(32), default="heritage")
    title = db.Column(db.String(128), nullable=False)
    cover_url = db.Column(db.String(512), nullable=False)
    summary = db.Column(db.Text)
    body_html = db.Column(db.Text)
    list_no = db.Column(db.Integer)
    sort_order = db.Column(db.Integer, default=0)
    status = db.Column(db.String(16), default="published")


class TaskShowcase(db.Model):
    __tablename__ = "task_showcase"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(128), nullable=False)
    category = db.Column(db.String(32), nullable=False)
    cover_url = db.Column(db.String(512), nullable=False)
    difficulty = db.Column(db.String(16))
    deadline_note = db.Column(db.String(64))
    status_label = db.Column(db.String(16))
    description = db.Column(db.Text)
    requirement = db.Column(db.Text)
    process_text = db.Column(db.String(512))
    materials = db.Column(db.Text)
    reference_image_url = db.Column(db.String(512))
    sort_order = db.Column(db.Integer, default=0)
    is_active = db.Column(db.Boolean, default=True)


class Product(db.Model):
    """商品模型"""
    __tablename__ = "product"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(128), nullable=False)
    summary = db.Column(db.Text)
    cover_url = db.Column(db.String(512), nullable=False)
    product_type = db.Column(db.String(32), nullable=False) # '礼盒', '助农', '匠心'
    list_category = db.Column(db.String(32)) # 用于客户端筛选，如 'brand', 'farm', 'handmade'
    primary_category = db.Column(db.String(32))
    producer = db.Column(db.String(128))
    origin = db.Column(db.String(128))
    process_text = db.Column(db.Text)
    detail_html = db.Column(db.Text)
    qr_code_url = db.Column(db.String(512)) # “我想要”跳转的二维码
    sort_order = db.Column(db.Integer, default=0)
    status = db.Column(db.String(32), default="published") # 新增 status 字段
    publisher_id = db.Column(db.Integer, db.ForeignKey("admin_user.id"))
    created_at = db.Column(db.DateTime, default=utc_now)
    
    publisher = db.relationship("AdminUser", backref="published_products")
    flow_steps = db.relationship("ProductFlowStep", backref="product", cascade="all, delete-orphan", lazy="selectin")
    gallery = db.relationship("ProductGallery", backref="product", cascade="all, delete-orphan", lazy="selectin")


class ProductFlowStep(db.Model):
    """商品流程步骤"""
    __tablename__ = "product_flow_step"
    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey("product.id"), nullable=False)
    step_order = db.Column(db.Integer, default=0)
    image_url = db.Column(db.String(512), nullable=False)
    caption = db.Column(db.String(256))


class ProductGallery(db.Model):
    """商品图集"""
    __tablename__ = "product_gallery"
    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey("product.id"), nullable=False)
    url = db.Column(db.String(512), nullable=False)
    sort_order = db.Column(db.Integer, default=0)


class MiniappUser(db.Model):
    """小程序用户：邮箱、用户名、创建时间；openid 用于微信唯一标识。"""

    __tablename__ = "miniapp_user"
    id = db.Column(db.Integer, primary_key=True)
    openid = db.Column(db.String(64), unique=True, nullable=False, index=True)
    unionid = db.Column(db.String(64), index=True)
    email = db.Column(db.String(128), unique=True, index=True)
    username = db.Column(db.String(64), nullable=False)
    avatar_url = db.Column(db.String(512))
    session_key = db.Column(db.String(128))
    role = db.Column(db.String(32), default="tourist") # 'tourist', 'worker', 'admin'
    password_hash = db.Column(db.String(256)) # 可选：供管理员角色登录管理端用
    created_at = db.Column(db.DateTime, default=utc_now, nullable=False)
    last_visit_at = db.Column(db.DateTime, default=utc_now)


class EmailVerificationCode(db.Model):
    __tablename__ = "email_verification_code"
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(128), nullable=False, index=True)
    code = db.Column(db.String(16), nullable=False)
    created_at = db.Column(db.DateTime, default=utc_now, nullable=False)
    expired_at = db.Column(db.DateTime, nullable=False)
    used_at = db.Column(db.DateTime)
    __table_args__ = (
        db.Index("ix_email_verification_code_email_code", "email", "code"),
        db.Index(
            "ix_email_verification_code_email_created_at",
            "email",
            "created_at",
        ),
    )


class UserTask(db.Model):
    """用户接取的任务记录"""
    __tablename__ = "user_task"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("miniapp_user.id"), nullable=False)
    task_id = db.Column(db.Integer, db.ForeignKey("task_showcase.id"), nullable=False)
    
    # 状态: accepted(已接取), submitted(已提交作品), completed(管理员确认完成)
    status = db.Column(db.String(32), default="accepted")
    
    # 提交的作品信息
    submit_image_url = db.Column(db.String(512))
    submit_description = db.Column(db.Text)
    
    accepted_at = db.Column(db.DateTime, default=utc_now)
    submitted_at = db.Column(db.DateTime)
    completed_at = db.Column(db.DateTime)
    
    # 关联关系
    user = db.relationship("MiniappUser", backref=db.backref("tasks", cascade="all, delete-orphan"))
    task = db.relationship("TaskShowcase", backref="user_assignments")


class UserDiyRecord(db.Model):
    """用户 DIY 记录"""
    __tablename__ = "user_diy_record"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("miniapp_user.id"), nullable=False)
    source_type = db.Column(db.String(32), nullable=False) # 'color_card', 'experience'
    source_id = db.Column(db.Integer) # 体验ID，色卡可空
    payload_json = db.Column(db.Text) # 四维 option_id 或选项文案快照
    preview_image_url = db.Column(db.String(512))
    title = db.Column(db.String(128))
    created_at = db.Column(db.DateTime, default=utc_now)
    
    user = db.relationship("MiniappUser", backref=db.backref("diy_records", cascade="all, delete-orphan"))


class UserFavorite(db.Model):
    """用户收藏"""
    __tablename__ = "user_favorite"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("miniapp_user.id"), nullable=False)
    target_type = db.Column(db.String(32), nullable=False) # 'product', 'experience', 'culture_article', 'task_showcase'
    target_id = db.Column(db.Integer, nullable=False)
    created_at = db.Column(db.DateTime, default=utc_now)
    __table_args__ = (db.UniqueConstraint('user_id', 'target_type', 'target_id', name='_user_favorite_uc'),)
    
    user = db.relationship("MiniappUser", backref=db.backref("favorites", cascade="all, delete-orphan"))


class UserFootprint(db.Model):
    """用户浏览足迹"""
    __tablename__ = "user_footprint"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("miniapp_user.id"), nullable=False)
    target_type = db.Column(db.String(32), nullable=False)
    target_id = db.Column(db.Integer, nullable=False)
    visited_at = db.Column(db.DateTime, default=utc_now)
    
    user = db.relationship("MiniappUser", backref=db.backref("footprints", cascade="all, delete-orphan"))


class AnalyticsEvent(db.Model):
    """埋点原始事件"""
    __tablename__ = "analytics_event"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("miniapp_user.id"))
    event_type = db.Column(db.String(64), nullable=False) # 'page_view', 'want_click', etc.
    page_path = db.Column(db.String(256))
    target_type = db.Column(db.String(32))
    target_id = db.Column(db.Integer)
    meta_json = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=utc_now)
    
    user = db.relationship("MiniappUser", backref=db.backref("analytics_events", cascade="all, delete-orphan"))


class AnalyticsDailySummary(db.Model):
    """日聚合统计"""
    __tablename__ = "analytics_daily_summary"
    id = db.Column(db.Integer, primary_key=True)
    stat_date = db.Column(db.Date, unique=True, nullable=False)
    dau = db.Column(db.Integer, default=0)
    mau = db.Column(db.Integer, default=0)
    want_clicks = db.Column(db.Integer, default=0)
    color_card_uses = db.Column(db.Integer, default=0)
    pv_home = db.Column(db.Integer, default=0)
    updated_at = db.Column(db.DateTime, default=utc_now, onupdate=utc_now)

