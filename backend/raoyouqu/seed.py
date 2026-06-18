"""首次启动写入演示数据（与 README / 原型结构对齐）。"""
from __future__ import annotations

from flask import current_app

from .models import (
    AdminUser,
    ColorCardDimension,
    ColorCardOption,
    ColorCardPreset,
    CultureArticle,
    CulturePromo,
    Experience,
    HomeBanner,
    HomeHighlight,
    HomeVideo,
    HomePPT,
    HomeIntroText,
    Product,
    SiteConfig,
    TaskShowcase,
    db,
)


def _allow_placeholder_seed() -> bool:
    explicit = current_app.config.get("ALLOW_PLACEHOLDER_SEED_DATA")
    if explicit is not None:
        return bool(explicit)
    app_env = (current_app.config.get("APP_ENV") or "development").lower()
    return app_env in {"development", "dev", "local"}


def _warn_placeholder_seed_disabled() -> None:
    print(
        "Seed warning: placeholder media seeding is disabled in this environment. "
        "Run the asset sync/import workflow manually before serving traffic."
    )


def seed_if_empty() -> None:
    allow_placeholder_seed = _allow_placeholder_seed()

    # 首页数据
    if not HomeBanner.query.first():
        db.session.add(
            SiteConfig(
                config_key="default_want_qrcode",
                config_value=(
                    "https://picsum.photos/seed/qrcode/300/300"
                    if allow_placeholder_seed
                    else ""
                ),
            )
        )
        db.session.add(
            HomeIntroText(
                html=(
                    "<p><b>项目定位：</b>饶有趣依托饶平在地文化IP，打造非遗文化传播与公益展示平台。</p>"
                    "<p><b>平台属性：</b>1.0 为纯展示形态，无交易结算。</p>"
                )
            )
        )

        if allow_placeholder_seed:
            db.session.add_all(
                [
                    HomeVideo(
                        video_url="https://picsum.photos/seed/video/800/450",
                        cover_url="https://picsum.photos/seed/vc1/800/450",
                        title="品牌宣传片",
                        sort_order=0
                    ),
                    HomePPT(
                        image_url="https://picsum.photos/seed/ppt1/800/450",
                        title="PPT演示1",
                        sort_order=0
                    ),
                    HomePPT(
                        image_url="https://picsum.photos/seed/ppt2/800/450",
                        title="PPT演示2",
                        sort_order=1
                    ),
                ]
            )

            banners = [
                ("精选：非遗茶染工艺", "/static/uploads/372e50cdb9c749da9308ad1462805a23.png", """<p>这里是精选茶染工艺的详细介绍。</p><h3>匠心独运</h3><p>每一寸布料都经过数十小时的浸泡与晾晒。</p>"""),
                ("春季助农专题", "/static/uploads/18bae3125b794438951c6ec1b348871d.png", """<p>春季助农，温暖同行。我们深入饶平茶山，为您挑选最地道的春茶。</p>"""),
            ]
            for i, (title, url, html) in enumerate(banners):
                db.session.add(HomeBanner(title=title, image_url=url, detail_html=html, sort_order=i))

            highlights = [
                (
                    "♻",
                    "原料回收",
                    "废弃茶末茶梗回收利用，变废为宝助农增收",
                    "/static/uploads/18bae3125b794438951c6ec1b348871d.png",
                    """<p>在饶平的广袤茶园中，每年都会产生大量的废弃茶末与茶梗。过去，这些废弃物往往被焚烧或丢弃，不仅造成资源浪费，也对环境造成了一定压力。</p>
<img src="/static/uploads/18bae3125b794438951c6ec1b348871d.png" style="width:100%;border-radius:8px;margin:20rpx 0;" />
<h3>变废为宝的艺术</h3>
<p>“饶有趣”项目通过建立原料回收机制，将这些废弃茶末转化为天然染料。通过科学的萃取工艺，我们从茶梗中提取出深浅不一的棕色、绿色系色素，赋予了织物独特的自然生命力。</p>
<h3>助农增收</h3>
<p>我们以高于市场的价格向农户收购废弃茶料，直接提升了当地茶农的经济收入，实现了环保与扶贫的双赢。</p>""",
                ),
                (
                    "🤲",
                    "手工赋能",
                    "残障人士居家就业，茶染手作实现自我价值",
                    "/static/uploads/386f3e2e939d412e8ac358f763387632.png",
                    """<p>每一件茶染作品的背后，都有一双充满温度的手。我们致力于为饶平当地的残障人士提供专业的茶染技术培训。</p>
<img src="/static/uploads/386f3e2e939d412e8ac358f763387632.png" style="width:100%;border-radius:8px;margin:20rpx 0;" />
<h3>居家就业，尊严生活</h3>
<p>通过“居家工坊"模式，残障伙伴们可以在家中进行手工制作，既照顾了生活便利，又获得了稳定的收入来源。这不仅是经济上的扶持，更是对他们创造力的肯定与尊重。</p>
<h3>匠心手作</h3>
<p>从扎染、夹染到手绘，每一道工序都凝聚着匠心。这些带有手作温度的产品，正通过我们的平台走向全国，讲述着自强不息的故事。</p>""",
                ),
                (
                    "🏪",
                    "平台整合",
                    "文创+文旅+互动一站式展示非遗生态",
                    "/static/uploads/46c98000d8d84b218d16bea6860cd5a9.jpg",
                    """<p>“饶有趣”不仅是一个展示平台，更是一个连接文化与市场的桥梁。我们整合了文创产品、文旅体验与互动教学，打造一站式的非遗生态展示空间。</p>
<img src="/static/uploads/46c98000d8d84b218d16bea6860cd5a9.jpg" style="width:100%;border-radius:8px;margin:20rpx 0;" />
<h3>数字驱动文化传播</h3>
<p>通过小程序，用户可以轻松浏览饶平的非遗文化，预约线下体验课程，购买极具地方特色的文创产品。我们利用数字技术，让传统的非遗文化焕发出年轻的活力。</p>
<h3>全产业链联动</h3>
<p>从原材料供应到成品销售，从线上展示到线下引流，我们打通了非遗产业的全链路，为饶平的文化振兴提供持续动力。</p>""",
                ),
                (
                    "🏙",
                    "深饶联动",
                    "深圳饶平双城互通，线上线下文化联动",
                    "/static/uploads/46c98000d8d84b218d16bea6860cd5a9.jpg",
                    """<p>深圳作为创新之都，饶平作为文化之乡，两地的联动为非遗文化的传播开辟了新路径。我们通过“深饶联动”模式，实现资源互补与品牌共建。</p>
<img src="/static/uploads/46c98000d8d84b218d16bea6860cd5a9.jpg" style="width:100%;border-radius:8px;margin:20rpx 0;" />
<h3>双城互通</h3>
<p>我们在深圳设立展示窗口，将饶平的茶染文化带入特区市民的视野；同时吸引深圳的设计人才与创意资源进入饶平，为传统手工艺注入现代设计灵魂。</p>
<h3>线上线下融合</h3>
<p>通过深饶两地的线下快闪店、文化节活动，配合线上的“饶有趣”平台，我们构建了一个跨地域的文化消费新场景，让更多人爱上非遗，爱上饶平。</p>""",
                ),
            ]
            for i, (icon, title, summary, image_url, detail_html) in enumerate(highlights):
                db.session.add(
                    HomeHighlight(
                        icon=icon,
                        title=title,
                        summary=summary,
                        image_url=image_url,
                        detail_html=detail_html,
                        sort_order=i,
                    )
                )
        else:
            _warn_placeholder_seed_disabled()

        dims = {}
        for order, (code, name) in enumerate(
            [
                ("fabric", "布料"),
                ("pattern", "花纹"),
                ("mordant", "媒染剂"),
                ("dye_time", "浸染时间"),
            ]
        ):
            d = ColorCardDimension(code=code, name=name, sort_order=order)
            db.session.add(d)
            db.session.flush()
            dims[code] = d

        opts: dict[str, list[ColorCardOption]] = {c: [] for c in dims}
        fabric_names = ["棉布", "丝绸", "麻布"]
        pattern_names = ["纯色", "扎染纹", "蜡染纹"]
        mordant_names = ["明矾", "铁媒染", "无媒染"]
        time_names = ["10分钟", "30分钟", "60分钟"]

        for i, n in enumerate(fabric_names):
            o = ColorCardOption(dimension_id=dims["fabric"].id, name=n, sort_order=i)
            db.session.add(o)
            db.session.flush()
            opts["fabric"].append(o)
        for i, n in enumerate(pattern_names):
            o = ColorCardOption(dimension_id=dims["pattern"].id, name=n, sort_order=i)
            db.session.add(o)
            db.session.flush()
            opts["pattern"].append(o)
        for i, n in enumerate(mordant_names):
            o = ColorCardOption(dimension_id=dims["mordant"].id, name=n, sort_order=i)
            db.session.add(o)
            db.session.flush()
            opts["mordant"].append(o)
        for i, n in enumerate(time_names):
            o = ColorCardOption(dimension_id=dims["dye_time"].id, name=n, sort_order=i)
            db.session.add(o)
            db.session.flush()
            opts["dye_time"].append(o)

        if allow_placeholder_seed:
            # 每种组合第一张图作为示例预设（其余组合可后台补）
            for fa in opts["fabric"]:
                for pa in opts["pattern"]:
                    for mo in opts["mordant"]:
                        for ti in opts["dye_time"]:
                            seed_key = f"cc{fa.id}{pa.id}{mo.id}{ti.id}"
                            db.session.add(
                                ColorCardPreset(
                                    fabric_option_id=fa.id,
                                    pattern_option_id=pa.id,
                                    mordant_option_id=mo.id,
                                    time_option_id=ti.id,
                                    image_url=f"https://picsum.photos/seed/{seed_key}/400/400",
                                )
                            )

            exp_sz = [
                (
                    "饶平功夫茶茶染DIY",
                    "/static/uploads/exp_sz_workshop.jpg",
                    "深圳",
                    "周末/活动日",
                    "约2小时",
                    "热门",
                    "#C94D4D",
                    "在深圳体验饶平功夫茶与茶染手作结合的非遗DIY活动，感受茶文化与布艺创作的联动魅力。",
                    "功夫茶导入→茶染材料认识→捆扎媒染→成品展示",
                    "以城市体验场景连接饶平茶文化与茶染非遗，让更多公众通过轻量互动认识地方手工艺。",
                ),
                (
                    "深饶非遗手作研学",
                    "/static/uploads/exp_sz_tea_diy.jpg",
                    "深饶两地联动",
                    "工作日/周末",
                    "约2小时",
                    "研学",
                    "#3D6B50",
                    "结合茶染手作课堂、图文导览与公益传播内容，呈现深饶协作下的非遗研学体验。",
                    "项目讲解→工艺演示→研学互动→成果分享",
                    "强化深圳与饶平双城协同，让非遗展示、公益传播和体验教育形成闭环。",
                ),
            ]
            for i, row in enumerate(exp_sz):
                db.session.add(
                    Experience(
                        region="shenzhen",
                        name=row[0],
                        cover_url=row[1],
                        location=row[2],
                        time_note=row[3],
                        duration_note=row[4],
                        badge=row[5],
                        badge_color=row[6],
                        summary=row[7],
                        flow_text=row[8],
                        value_text=row[9],
                        notice_html="<p>1.0 不支持在线预约，以线下安排为准。</p>",
                        sort_order=i,
                    )
                )
            exp_rp = [
                (
                    "布马舞非遗体验",
                    "/static/uploads/exp_raoping_buma.jpg",
                    "饶平黄冈霞西",
                    "节庆/展演时段",
                    "约1.5小时",
                    "非遗",
                    "#8D5B3D",
                    "布马舞又称竹马舞，是由江西饶州瓷工艺人传入广东饶平的传统舞蹈，融合民间舞蹈、音乐与工艺于一体。",
                    "起源讲述→角色服饰展示→舞步节奏体验→民俗故事讲解",
                    "从宋末元初传入至今，布马舞承载了地方迁徙记忆、民俗叙事与戏曲化演变，是饶平重要的活态非遗表达。",
                ),
            ]
            for i, row in enumerate(exp_rp):
                db.session.add(
                    Experience(
                        region="raoping",
                        name=row[0],
                        cover_url=row[1],
                        location=row[2],
                        time_note=row[3],
                        duration_note=row[4],
                        badge=row[5],
                        badge_color=row[6],
                        summary=row[7],
                        flow_text=row[8],
                        value_text=row[9],
                        notice_html=(
                            "<p><b>布马舞</b>，又称竹马舞，是宋末元初由江西饶州瓷工艺人传入广东饶平的传统舞蹈。"
                            "起源于上饶古驿道旁的新丰镇，后流传至黄冈霞西等地，整体融合民间舞蹈、民间音乐、民间工艺于一体。</p>"
                            "<p><b>起源传说：</b>源于南宋康王“泥马渡江”的传说，后在饶平地方社会中逐步演化为节庆民俗表演。</p>"
                            "<p><b>内容演变：</b>早期演《状元游街》，清代增加武进士角色，建国后更多演绎穆桂英等女英雄事迹。</p>"
                        ),
                        sort_order=i,
                    )
                )

            db.session.add(
                CulturePromo(
                    title="饶平宣传视频",
                    subtitle="全景展示饶平非遗与山海风貌",
                    cover_url="https://picsum.photos/seed/cv/800/450",
                    video_url=None,
                )
            )

            articles = [
                (1, "饶平非遗", "https://picsum.photos/seed/ca1/800/400", "茶染与手工纹样结合的文化名片。"),
                (2, "山海相融风貌", "https://picsum.photos/seed/ca2/800/400", "渔港、农耕与民俗文化交汇。"),
                (3, "文旅融合新活力", "https://picsum.photos/seed/ca3/800/400", "研学与展陈让非遗更生活化。"),
            ]
            for i, (no, title, cover, summary) in enumerate(articles):
                db.session.add(
                    CultureArticle(
                        title=title,
                        cover_url=cover,
                        summary=summary,
                        list_no=no,
                        body_html=f"<p>{summary}</p>",
                        sort_order=i,
                    )
                )

            tasks = [
                (
                    "茶染任务",
                    "teadye",
                    "/static/uploads/task_teadye_cover.jpg",
                    "/static/uploads/task_teadye_detail.jpg",
                    "低",
                    "04-30",
                    "available",
                    "按示例完成茶染纹样制作并拍照上传演示。",
                ),
                (
                    "手工文创",
                    "handcraft",
                    "/static/uploads/task_teadye_detail.jpg",
                    "/static/uploads/task_teadye_detail.jpg",
                    "中",
                    "05-02",
                    "ongoing",
                    "完成手作器物组合加工与外观整理。",
                ),
            ]
            for i, (name, cat, cover_url, reference_image_url, diff, dl, st, desc) in enumerate(tasks):
                db.session.add(
                    TaskShowcase(
                        name=name,
                        category=cat,
                        cover_url=cover_url,
                        difficulty=diff,
                        deadline_note=dl,
                        status_label=st,
                        description=desc,
                        requirement="步骤完整、记录清晰。",
                        process_text="领料→制作→整理→提交",
                        materials="平台材料包",
                        reference_image_url=reference_image_url,
                        sort_order=i,
                    )
                )

    # 商品数据独立判断
    if not Product.query.first():
        if allow_placeholder_seed:
            products_data = [
                {
                    "name": "非遗茶染定制礼盒",
                    "product_type": "礼盒",
                    "list_category": "brand",
                    "summary": "纯天然茶染，匠心手工制作，高端定制礼盒。",
                    "cover_url": "https://picsum.photos/seed/p1/400/400",
                    "origin": "广东饶平",
                    "producer": "饶有趣文创工作室",
                    "process_text": "选料 -> 浸泡 -> 扎染 -> 固色 -> 晾晒",
                    "detail_html": "<p>这款定制礼盒采用饶平在地高山茶叶作为天然染料，结合传统手工扎染工艺，每一件产品都拥有独特的纹理与茶香。</p>",
                    "qr_code_url": "https://picsum.photos/seed/qr1/300/300"
                },
                {
                    "name": "饶平高山生态红茶",
                    "product_type": "助农",
                    "list_category": "farm",
                    "summary": "原生态种植，传统工艺加工，助农增收精品。",
                    "cover_url": "https://picsum.photos/seed/p2/400/400",
                    "origin": "饶平茶山",
                    "producer": "联农助农合作社",
                    "process_text": "采摘 -> 萎凋 -> 揉捻 -> 发酵 -> 干燥",
                    "detail_html": "<p>源自饶平海拔800米以上的生态茶园，坚持有机种植，传统碳焙工艺，滋味醇厚。购买此茶直接支持当地50余户茶农增收。</p>",
                    "qr_code_url": "https://picsum.photos/seed/qr2/300/300"
                },
                {
                    "name": "手工编织茶席",
                    "product_type": "匠心",
                    "list_category": "handmade",
                    "summary": "残障伙伴匠心手作，赋予竹丝新的生命力。",
                    "cover_url": "https://picsum.photos/seed/p3/400/400",
                    "origin": "饶平居家工坊",
                    "producer": "扶残帮残就业基地",
                    "process_text": "选竹 -> 剖丝 -> 编织 -> 整修 -> 包装",
                    "detail_html": "<p>由居家就业的残障伙伴们亲手编织，每一根竹丝都经过精心挑选与打磨，不仅是一件实用的茶道配件，更是一份自强不息的见证。</p>",
                    "qr_code_url": "https://picsum.photos/seed/qr3/300/300"
                },
                {
                    "name": "茶染家居枕套",
                    "product_type": "匠心",
                    "list_category": "handmade",
                    "summary": "以茶染布艺延展出的家居手作产品，色调温润自然，适合居家软装与文创陈列。",
                    "cover_url": "/static/uploads/product_handmade_pillow.jpg",
                    "origin": "饶平茶染手作工坊",
                    "producer": "扶残助残手作工坊",
                    "process_text": "布料选样 -> 茶染浸染 -> 图案整理 -> 缝制收边",
                    "detail_html": "<p>枕套以柔和茶色为主调，将天然染色气质融入家居布艺。产品兼具日常使用性与空间装饰性，也体现了非遗手作从穿戴用品向生活美学场景的延伸。</p>",
                    "qr_code_url": None
                },
                {
                    "name": "茶染手提包",
                    "product_type": "匠心",
                    "list_category": "handmade",
                    "summary": "将茶染纹样与轻便包型结合，兼具实用携带与非遗审美表达。",
                    "cover_url": "/static/uploads/product_handmade_bag.jpg",
                    "origin": "饶平茶染手作工坊",
                    "producer": "扶残助残手作工坊",
                    "process_text": "包型设计 -> 茶染成色 -> 手工缝制 -> 配饰整理",
                    "detail_html": "<p>手提包通过手工染制形成自然晕染纹理，搭配简洁包型与系带设计，让传统茶染工艺以更年轻、轻巧的方式进入日常穿搭与文创消费场景。</p>",
                    "qr_code_url": None
                }
            ]
            for i, p_data in enumerate(products_data):
                db.session.add(
                    Product(
                        name=p_data["name"],
                        product_type=p_data["product_type"],
                        list_category=p_data["list_category"],
                        primary_category=p_data["list_category"],
                        summary=p_data["summary"],
                        cover_url=p_data["cover_url"],
                        origin=p_data["origin"],
                        producer=p_data["producer"],
                        process_text=p_data["process_text"],
                        detail_html=p_data["detail_html"],
                        qr_code_url=p_data["qr_code_url"],
                        sort_order=i
                    )
                )

    db.session.commit()


def seed_admin_if_empty() -> None:
    """默认管理员，仅数据库无记录时写入；小程序端不可创建。"""
    from werkzeug.security import generate_password_hash
    import os

    if AdminUser.query.first():
        return
    
    username = os.environ.get("ADMIN_USERNAME", "admin")
    password = os.environ.get("ADMIN_PASSWORD", "admin123")
    email = os.environ.get("ADMIN_EMAIL", "admin@example.com")

    db.session.add(
        AdminUser(
            username=username,
            password_hash=generate_password_hash(password),
            display_name="超级管理员",
            email=email,
            is_active=True
        )
    )
    db.session.commit()
