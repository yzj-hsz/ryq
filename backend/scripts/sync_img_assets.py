from __future__ import annotations

import shutil
import sys
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[2]
BACKEND_ROOT = PROJECT_ROOT / "backend"
sys.path.insert(0, str(BACKEND_ROOT))

from raoyouqu import create_app  # noqa: E402
from raoyouqu.helpers import text_to_styled_html  # noqa: E402
from raoyouqu.models import (  # noqa: E402
    ColorCardPreset,
    CultureArticle,
    CulturePromo,
    Experience,
    HomeBanner,
    HomeHighlight,
    HomeIntroText,
    HomePPT,
    HomeVideo,
    Product,
    ProductFlowStep,
    ProductGallery,
    SiteConfig,
    TaskShowcase,
    db,
)


IMG_ROOT = PROJECT_ROOT / "img"
UPLOAD_ROOT = BACKEND_ROOT / "raoyouqu" / "static" / "uploads"


def copy_media(source: Path, dest_name: str) -> str:
    UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)
    target = UPLOAD_ROOT / dest_name
    shutil.copy2(source, target)
    return f"/static/uploads/{dest_name}"


def image_html(url: str, alt: str) -> str:
    return (
        "<figure style='margin:0;'>"
        f"<img src='{url}' alt='{alt}' "
        "style='width:100%;display:block;border-radius:18px;' />"
        "</figure>"
    )


def image_group_html(items: list[tuple[str, str]]) -> str:
    if not items:
        return ""
    blocks = []
    for url, alt in items:
        blocks.append(
            "<div style='display:flex;flex-direction:column;gap:8px;'>"
            + image_html(url, alt)
            + f"<div style='font-size:13px;color:#8b6b55;line-height:1.6;'>{alt}</div>"
            + "</div>"
        )
    return (
        "<div style='display:flex;flex-direction:column;gap:14px;'>"
        + "".join(blocks)
        + "</div>"
    )


def mix_html(text: str, images: list[tuple[str, str]]) -> str:
    text_block = text_to_styled_html(text)
    image_block = image_group_html(images)
    if text_block and image_block:
        return text_block + image_block
    return text_block or image_block


def reset_home() -> dict[str, str]:
    db.session.query(HomeVideo).delete()
    db.session.query(HomePPT).delete()
    db.session.query(HomeBanner).delete()
    db.session.query(HomeHighlight).delete()
    db.session.query(HomeIntroText).delete()

    home_video_cover = copy_media(
        IMG_ROOT / "首页视频代替图片" / "R-C (1).jpg",
        "home_video_placeholder.jpg",
    )
    ppt_urls = [
        copy_media(
            IMG_ROOT / "PPT截图" / "b3fef01a9617a2db787528852d958053.jpg",
            "home_ppt_policy.jpg",
        ),
        copy_media(IMG_ROOT / "首页ppt轮播" / "1.png", "home_ppt_1.png"),
        copy_media(IMG_ROOT / "首页ppt轮播" / "2.png", "home_ppt_2.png"),
        copy_media(IMG_ROOT / "首页ppt轮播" / "3.png", "home_ppt_3.png"),
    ]
    intro_image = copy_media(
        IMG_ROOT / "首页图文" / "8c1f46df57416e0c5744c4df21b2cc74.png",
        "home_intro_cover.png",
    )
    temp_banner_covers = [
        "/static/uploads/372e50cdb9c749da9308ad1462805a23.png",
        "/static/uploads/18bae3125b794438951c6ec1b348871d.png",
        "/static/uploads/386f3e2e939d412e8ac358f763387632.png",
        "/static/uploads/46c98000d8d84b218d16bea6860cd5a9.jpg",
    ]
    highlight_1_cover = copy_media(
        IMG_ROOT / "亮点" / "1-1.jpg",
        "home_highlight_1_cover.jpg",
    )
    highlight_1_img_1 = copy_media(IMG_ROOT / "亮点" / "1-2.jpg", "home_highlight_1_a.jpg")
    highlight_1_img_2 = copy_media(IMG_ROOT / "亮点" / "1-3.jpg", "home_highlight_1_b.jpg")
    highlight_2_img_1 = copy_media(IMG_ROOT / "亮点" / "2-1.jpg", "home_highlight_2_a.jpg")
    highlight_2_img_2 = copy_media(IMG_ROOT / "亮点" / "2-2.jpg", "home_highlight_2_b.jpg")
    highlight_3_img = copy_media(IMG_ROOT / "亮点" / "3.jpg", "home_highlight_3.jpg")
    copy_media(IMG_ROOT / "茶染任务.jpg", "task_teadye_cover.jpg")
    copy_media(IMG_ROOT / "商品图丝巾" / "4f8fe6ceeed2d81df480da77b42cf74c.jpg", "task_teadye_detail.jpg")
    copy_media(IMG_ROOT / "线下活动" / "5419ce6ae51159c0cb79bdd644727de3.jpg", "exp_sz_workshop.jpg")
    copy_media(IMG_ROOT / "茶染任务.jpg", "exp_sz_tea_diy.jpg")
    copy_media(IMG_ROOT / "认识饶平" / "R-C.jpg", "exp_raoping_buma.jpg")
    linkage_imgs = [
        copy_media(IMG_ROOT / "线下活动" / "5419ce6ae51159c0cb79bdd644727de3.jpg", "home_linkage_1.jpg"),
        copy_media(IMG_ROOT / "线下活动" / "6fff91fb3f988154ab82ae0e68847d94.jpg", "home_linkage_2.jpg"),
        copy_media(IMG_ROOT / "线下活动" / "8042ccff013d0c3e217b8c22ff6f20ce.jpg", "home_linkage_3.jpg"),
    ]

    intro_text = (IMG_ROOT / "首页图文" / "新建 文本文档.txt").read_text(encoding="utf-8").strip()
    intro_html = (
        "<div style='display:flex;flex-direction:column;gap:16px;'>"
        + image_html(intro_image, "首页图文")
        + text_to_styled_html(intro_text)
        + "</div>"
    )

    db.session.add(
        HomeVideo(
            video_url=home_video_cover,
            cover_url=home_video_cover,
            title="项目宣传主视觉",
            sort_order=0,
            is_active=True,
        )
    )
    for idx, url in enumerate(ppt_urls):
        db.session.add(HomePPT(image_url=url, title=f"首页轮播 {idx + 1}", sort_order=idx, is_active=True))
    db.session.add(HomeIntroText(html=intro_html))

    banners = [
        (
            "政策机遇·深饶对口乡村振兴",
            temp_banner_covers[0],
            "依托深饶对口帮扶政策，立足饶平本地茶产业资源，打造非遗茶染助农文创项目。盘活茶园废弃茶渣废料，搭建农户、残障手工者、线上平台联动产业链，以轻量手工产业拓宽乡村增收渠道，落地乡村振兴实践新模式。",
        ),
        (
            "茶染非遗·天然植物文创产业",
            temp_banner_covers[1],
            "深挖潮汕本土天然染色非遗技艺，以茶园废弃茶渣为天然染料，研发丝巾、茶席、伴手礼盒系列文创。摒弃化工颜料，全程纯植物手工制作，把饶平茶文化融入传统手工艺，打造独属于饶平的特色非遗产品。",
        ),
        (
            "助残工坊·柔性居家手工就业",
            temp_banner_covers[2],
            "搭建无障碍公益手工工坊，简化茶染、竹编制作工序，为残障群体提供居家灵活就业岗位。标准化简易操作降低劳作门槛，让特殊群体依靠手艺获得稳定收入，以手工赋能实现自我价值。",
        ),
        (
            "文旅研学·饶平非遗线下体验",
            temp_banner_covers[3],
            "整合饶平山海风光与非遗手工艺资源，面向学生、游客开放线下DIY研学活动。可体验完整茶染制作流程，近距离接触潮汕传统手艺，打通线上文创商城与线下文旅体验，构建完整文旅融合生态。",
        ),
    ]
    for idx, (title, image_url, text) in enumerate(banners):
        db.session.add(
            HomeBanner(
                title=title,
                image_url=image_url,
                detail_html=text_to_styled_html(text),
                sort_order=idx,
                is_active=True,
            )
        )

    highlights = [
        (
            "♻",
            "原料回收",
            "回收茶渣废料，形成天然植物染色原料链路",
            "项目回收饶平茶园制茶后废弃茶渣，将原本直接丢弃的废料加工为天然植物染色原料。既解决茶园茶渣废弃物处理难题，也为本地茶农增加额外收入，践行循环农业与乡村助农理念，真正做到变废为宝。",
            [
                (highlight_1_cover, "项目亮点主视觉"),
                (highlight_1_img_1, "茶园废料回收与原料整理"),
                (highlight_1_img_2, "茶渣转化为天然染料应用"),
            ],
        ),
        (
            "🤲",
            "手工赋能",
            "以简化工序支持残障群体居家灵活就业",
            "简化茶染全套制作工序，降低手工操作门槛，为残障群体提供居家灵活就业渠道。无需高强度劳作，依靠染色、缝制等简单手艺就能获取稳定酬劳，以手工创作帮助特殊人群实现自我价值，传递公益温度。",
            [
                (highlight_2_img_1, "居家工坊手作过程"),
                (highlight_2_img_2, "手工成品整理与展示"),
            ],
        ),
        (
            "🏪",
            "平台整合",
            "整合文创、研学、公益互动的一体化平台",
            "搭建「饶有趣」线上一体化小程序平台，整合文创商城、文旅预约、手工任务、非遗科普四大板块，集购物、研学、公益互动于一体，一站式完整展示潮汕茶染非遗产业生态，打通产业线上宣传销售渠道。",
            [(highlight_3_img, "小程序平台与内容整合展示")],
        ),
        (
            "🏙",
            "深饶联动",
            "深圳与饶平双城互通，线上线下联动传播非遗",
            "依托深圳-饶平对口帮扶政策，实现双城资源互通。线上小程序面向深圳群众售卖饶平非遗文创、预约线下研学；线下在两地开设茶染DIY体验活动，打通线上线下双向文化联动，扩大潮汕非遗传播范围。",
            [
                (linkage_imgs[0], "深圳线下活动现场"),
                (linkage_imgs[1], "深饶联动体验展示"),
                (linkage_imgs[2], "非遗互动活动记录"),
            ],
        ),
    ]
    for idx, (icon, title, summary, detail_text, images) in enumerate(highlights):
        db.session.add(
            HomeHighlight(
                icon=icon,
                title=title,
                summary=summary,
                image_url=images[0][0] if images else None,
                detail_html=mix_html(detail_text, images),
                sort_order=idx,
                is_active=True,
            )
        )

    return {
        "home_video_cover": home_video_cover,
        "intro_image": intro_image,
        "ppt_capture": ppt_urls[0],
    }


def reset_products() -> None:
    db.session.query(ProductFlowStep).delete()
    db.session.query(ProductGallery).delete()
    db.session.query(Product).delete()

    giftbox = copy_media(
        IMG_ROOT / "礼盒" / "定制礼盒（封面+详情页图）.jpg",
        "product_giftbox.jpg",
    )
    scarf_1 = copy_media(
        IMG_ROOT / "商品图丝巾" / "4f8fe6ceeed2d81df480da77b42cf74c.jpg",
        "product_scarf_1.jpg",
    )
    scarf_2 = copy_media(
        IMG_ROOT / "商品图丝巾" / "9868abdf68c725c555dd33e506548055.jpg",
        "product_scarf_2.jpg",
    )
    soap_urls = [
        copy_media(IMG_ROOT / "商品图肥皂" / "212611e5cbd602bb7bf3cd08ec350144.jpg", "product_soap_1.jpg"),
        copy_media(IMG_ROOT / "商品图肥皂" / "3f33a152db4595ce40fc04f9d4a32762.jpg", "product_soap_2.jpg"),
        copy_media(IMG_ROOT / "商品图肥皂" / "9dcd1f016ab0998bcb8cd2b357c6a2f9.jpg", "product_soap_3.jpg"),
        copy_media(IMG_ROOT / "商品图肥皂" / "cf7b0c8c4d0f366cd9ab736f27613f5f.jpg", "product_soap_4.jpg"),
    ]
    handmade_pillow = copy_media(
        IMG_ROOT / "匠心手作" / "微信图片_20260616114248.jpg",
        "product_handmade_pillow.jpg",
    )
    handmade_bag = copy_media(
        IMG_ROOT / "匠心手作" / "微信图片_20260616114254.jpg",
        "product_handmade_bag.jpg",
    )

    products = [
        Product(
            name="非遗茶染定制礼盒",
            product_type="礼盒",
            list_category="brand",
            primary_category="brand",
            summary="以茶染丝巾与饶平文化礼品组合成礼盒，适合企业伴手礼与文旅定制场景。",
            cover_url=giftbox,
            origin="广东饶平",
            producer="饶有趣文创项目组",
            process_text="礼盒策划 -> 茶染打样 -> 内容组合 -> 包装成盒",
            detail_html=mix_html(
                "礼盒围绕饶平茶文化与非遗茶染工艺设计，可根据活动、企业和研学场景灵活组合内容。礼盒中突出天然茶染纹理与地方文化故事，适合作为城市联名、文旅推广和公益传播载体。",
                [(giftbox, "定制礼盒整体展示")],
            ),
            qr_code_url=None,
            sort_order=0,
            status="published",
        ),
        Product(
            name="茶染真丝围巾",
            product_type="匠心",
            list_category="handmade",
            primary_category="handmade",
            summary="以天然茶渣染色工艺制作的真丝围巾，色泽柔和，适合作为文创伴手礼。",
            cover_url=scarf_1,
            origin="饶平茶染工坊",
            producer="扶残助残手作工坊",
            process_text="真丝选坯 -> 茶汤煮染 -> 纹样整理 -> 定型收边",
            detail_html=mix_html(
                "围巾采用轻盈丝质面料，以茶汤层层浸染形成自然晕染纹理。作品兼具佩戴实用性和手作温度，能够直观呈现茶染非遗在当代文创中的应用。",
                [
                    (scarf_1, "茶染真丝围巾细节"),
                    (scarf_2, "围巾成品展示"),
                ],
            ),
            qr_code_url=None,
            sort_order=1,
            status="published",
        ),
        Product(
            name="茶染手工皂",
            product_type="匠心",
            list_category="handmade",
            primary_category="handmade",
            summary="结合天然茶色灵感与手工皂造型设计，适合研学展示、公益礼赠与文创售卖。",
            cover_url=soap_urls[0],
            origin="饶平公益手作工坊",
            producer="扶残助残手作工坊",
            process_text="皂基准备 -> 茶色调配 -> 模具成型 -> 干燥包装",
            detail_html=mix_html(
                "手工皂围绕茶染项目延展开发，通过茶色调性、纹理变化和包装设计，形成兼顾审美与纪念意义的文创产品，适合在线上展示和线下活动礼赠中使用。",
                [
                    (soap_urls[0], "茶染手工皂款式一"),
                    (soap_urls[1], "茶染手工皂款式二"),
                    (soap_urls[2], "茶染手工皂款式三"),
                    (soap_urls[3], "茶染手工皂款式四"),
                ],
            ),
            qr_code_url=None,
            sort_order=2,
            status="published",
        ),
        Product(
            name="茶染家居枕套",
            product_type="匠心",
            list_category="handmade",
            primary_category="handmade",
            summary="以茶染布艺延展出的家居手作产品，色调温润自然，适合居家软装与文创陈列。",
            cover_url=handmade_pillow,
            origin="饶平茶染手作工坊",
            producer="扶残助残手作工坊",
            process_text="布料选样 -> 茶染浸染 -> 图案整理 -> 缝制收边",
            detail_html=mix_html(
                "枕套以柔和茶色为主调，将天然染色气质融入家居布艺。产品兼具日常使用性与空间装饰性，也体现了非遗手作从穿戴用品向生活美学场景的延伸。",
                [(handmade_pillow, "茶染家居枕套展示")],
            ),
            qr_code_url=None,
            sort_order=3,
            status="published",
        ),
        Product(
            name="茶染手提包",
            product_type="匠心",
            list_category="handmade",
            primary_category="handmade",
            summary="将茶染纹样与轻便包型结合，兼具实用携带与非遗审美表达。",
            cover_url=handmade_bag,
            origin="饶平茶染手作工坊",
            producer="扶残助残手作工坊",
            process_text="包型设计 -> 茶染成色 -> 手工缝制 -> 配饰整理",
            detail_html=mix_html(
                "手提包通过手工染制形成自然晕染纹理，搭配简洁包型与系带设计，让传统茶染工艺以更年轻、轻巧的方式进入日常穿搭与文创消费场景。",
                [(handmade_bag, "茶染手提包展示")],
            ),
            qr_code_url=None,
            sort_order=4,
            status="published",
        ),
    ]
    db.session.add_all(products)
    db.session.flush()

    gallery_map = {
        products[1].id: [scarf_1, scarf_2],
        products[2].id: soap_urls,
        products[3].id: [handmade_pillow],
        products[4].id: [handmade_bag],
    }
    for product_id, urls in gallery_map.items():
        for idx, url in enumerate(urls):
            db.session.add(ProductGallery(product_id=product_id, url=url, sort_order=idx))


def reset_culture() -> None:
    db.session.query(CultureArticle).delete()
    db.session.query(CulturePromo).delete()

    promo_cover = copy_media(
        IMG_ROOT / "认识饶平" / "6b13b4f785a64517abd0aa466641a9f1.jpg",
        "know_promo_cover.jpg",
    )
    promo_video = copy_media(
        IMG_ROOT / "认识饶平" / "屏幕录制 2026-04-27 212546.mp4",
        "know_promo_video.mp4",
    )

    assist_imgs = [
        copy_media(IMG_ROOT / "助农-放到认识饶平的图文中" / "5ab7274a915fcf09e978d87af87ecdae.jpg", "know_assist_1.jpg"),
        copy_media(IMG_ROOT / "助农-放到认识饶平的图文中" / "860e4e1a60c56e8a5e310df861b9f2fd.jpg", "know_assist_2.jpg"),
        copy_media(IMG_ROOT / "助农-放到认识饶平的图文中" / "93f60119cade84331c5a42e40caf03e0.jpg", "know_assist_3.jpg"),
        copy_media(IMG_ROOT / "助农-放到认识饶平的图文中" / "fe09c5d621a4ea59ae44c950d5b07697.jpg", "know_assist_4.jpg"),
    ]
    tea_imgs = [
        copy_media(IMG_ROOT / "饶平风景图+茶园" / "32b651aa53f8fb78c05f155a62d8dcf8.jpg", "know_tea_1.jpg"),
        copy_media(IMG_ROOT / "饶平风景图+茶园" / "饶平.jfif", "know_tea_2.jfif"),
        copy_media(IMG_ROOT / "饶平风景图+茶园" / "饶平2.jpg", "know_tea_3.jpg"),
        copy_media(IMG_ROOT / "饶平风景图+茶园" / "饶平5.jpg", "know_tea_4.jpg"),
    ]
    know_city_imgs = [
        copy_media(IMG_ROOT / "认识饶平" / "R-C.jpg", "know_city_1.jpg"),
        copy_media(IMG_ROOT / "认识饶平" / "R-C (1).jpg", "know_city_2.jpg"),
        copy_media(IMG_ROOT / "认识饶平" / "video-to-gif-1777298217013.gif", "know_city_3.gif"),
    ]

    db.session.add(
        CulturePromo(
            title="认识饶平",
            subtitle="从山海风貌、茶园产业到非遗手作，快速了解饶平的在地文化与产业故事。",
            cover_url=promo_cover,
            video_url=promo_video,
        )
    )

    articles = [
        (
            "茶乡助农共生实践",
            assist_imgs[0],
            "从茶渣回收到文创转化，了解饶平茶产业与助农项目如何协同发展。",
            [
                (assist_imgs[0], "茶园与助农实践现场"),
                (assist_imgs[1], "茶产业链条中的在地协作"),
                (assist_imgs[2], "茶渣资源再利用场景"),
                (assist_imgs[3], "助农项目的日常记录"),
            ],
            "饶平以茶为媒，逐步形成从种植、制茶到文创转化的链路。项目以茶渣回收和公益手作结合的方式，让传统产业与乡村增收、文化传播协同发生。",
        ),
        (
            "山海茶园与饶平风光",
            tea_imgs[0],
            "通过茶园、山海与村落风貌，感受饶平兼具自然生态与人文底蕴的地方气质。",
            [
                (tea_imgs[0], "饶平茶园风貌"),
                (tea_imgs[1], "山海自然景观"),
                (tea_imgs[2], "茶山与人文环境"),
                (tea_imgs[3], "地方生态与文旅景致"),
            ],
            "饶平拥有丰富的山海资源和茶园景观，既是潮汕文化的重要组成，也是文旅研学和非遗体验活动落地的重要空间基础。",
        ),
        (
            "认识饶平的人文印象",
            know_city_imgs[0],
            "从影像与图文中认识饶平的在地生活氛围、城市气质与文化记忆。",
            [
                (know_city_imgs[0], "饶平城市与文化印象"),
                (know_city_imgs[1], "地方生活场景记录"),
                (know_city_imgs[2], "动态影像节选"),
            ],
            "除茶产业与非遗手作外，饶平也拥有鲜明的人文生活肌理。通过影像记录与图文内容，能够更直观地感受到地方风貌、民俗文化和城市记忆。",
        ),
    ]

    for idx, (title, cover_url, summary, images, body_text) in enumerate(articles, start=1):
        db.session.add(
            CultureArticle(
                category="heritage",
                title=title,
                cover_url=cover_url,
                summary=summary,
                body_html=mix_html(body_text, images),
                list_no=idx,
                sort_order=idx - 1,
                status="published",
            )
        )


def audit_remaining_placeholders() -> list[str]:
    checks: list[tuple[str, str, object]] = [
        ("SiteConfig", "config_value", SiteConfig.query),
        ("Experience", "cover_url", Experience.query),
        ("TaskShowcase", "cover_url", TaskShowcase.query),
        ("TaskShowcase", "reference_image_url", TaskShowcase.query),
        ("ColorCardPreset", "image_url", ColorCardPreset.query),
        ("Product", "qr_code_url", Product.query),
    ]
    remaining: list[str] = []
    for model_name, field_name, query in checks:
        for row in query.all():
            value = getattr(row, field_name, None)
            if isinstance(value, str) and "picsum.photos" in value:
                remaining.append(f"{model_name}.{field_name}#{getattr(row, 'id', 'n/a')}: {value}")

    farm_count = Product.query.filter_by(list_category="farm", status="published").count()
    if farm_count == 0:
        remaining.append("缺少“联农助农”分类的独立商品素材，当前分类将为空。")
    if not Experience.query.filter(Experience.cover_url.like("%/static/uploads/%")).count():
        remaining.append("缺少“深圳体验 / 饶平体验”专用封面素材，当前体验页仍保留临时封面。")
    if not TaskShowcase.query.filter(TaskShowcase.cover_url.like("%/static/uploads/%")).count():
        remaining.append("缺少“任务展示”专用封面素材，当前任务卡片仍保留临时封面。")
    if any("ColorCardPreset.image_url" in item for item in remaining):
        remaining.append("缺少色卡材料预览图素材，色卡预览仍保留临时图片。")
    if any("SiteConfig.config_value" in item or "Product.qr_code_url" in item for item in remaining):
        remaining.append("缺少商品咨询二维码素材，'我想要' 弹窗仍会使用临时二维码。")
    return remaining


def main() -> None:
    app = create_app()
    with app.app_context():
        reset_home()
        reset_products()
        reset_culture()
        db.session.commit()

        remaining = audit_remaining_placeholders()
        print("素材同步完成。")
        print("仍需补充或仍在使用临时素材的位置：")
        if remaining:
            for item in remaining:
                print(f"- {item}")
        else:
            print("- 无")


if __name__ == "__main__":
    main()
