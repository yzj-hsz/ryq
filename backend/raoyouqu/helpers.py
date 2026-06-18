from __future__ import annotations

import html
import re

from flask import has_request_context, request

from .models import SiteConfig

_DEMO_MEDIA_FALLBACKS = {
    "https://images.unsplash.com/photo-1590005354167-6da97870c91d?auto=format&fit=crop&q=80&w=1000": "/static/uploads/372e50cdb9c749da9308ad1462805a23.png",
    "https://images.unsplash.com/photo-1597481499750-3e6b22637e12?auto=format&fit=crop&q=80&w=1000": "/static/uploads/18bae3125b794438951c6ec1b348871d.png",
    "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&q=80&w=1000": "/static/uploads/386f3e2e939d412e8ac358f763387632.png",
    "https://images.unsplash.com/photo-1523726491678-bf852e717f6a?auto=format&fit=crop&q=80&w=1000": "/static/uploads/46c98000d8d84b218d16bea6860cd5a9.jpg",
    "https://images.unsplash.com/photo-1547032175-7fc8c7bd15b3?auto=format&fit=crop&q=80&w=1000": "/static/uploads/46c98000d8d84b218d16bea6860cd5a9.jpg",
    "https://picsum.photos/seed/t0/400/300": "/static/uploads/task_teadye_cover.jpg",
    "https://picsum.photos/seed/t1/400/300": "/static/uploads/task_teadye_detail.jpg",
    "https://picsum.photos/seed/cv/800/450": "/static/uploads/home_video_placeholder.jpg",
    "https://picsum.photos/seed/e1/800/400": "/static/uploads/exp_sz_workshop.jpg",
    "https://picsum.photos/seed/e2/800/400": "/static/uploads/exp_sz_tea_diy.jpg",
    "https://picsum.photos/seed/e3/800/400": "/static/uploads/exp_raoping_buma.jpg",
}


def stable_media_url(url: str | None) -> str:
    return _DEMO_MEDIA_FALLBACKS.get(url or "", url or "")


def stable_detail_html(html: str | None) -> str:
    out = html or ""
    for src, fallback in _DEMO_MEDIA_FALLBACKS.items():
        out = out.replace(src, fallback)
    if has_request_context():
        origin = request.host_url.rstrip("/")
        out = re.sub(
            r'(?P<prefix>\b(?:src|href)=["\'])(?P<path>/static/uploads/[^"\']+)(?P<suffix>["\'])',
            lambda match: f"{match.group('prefix')}{origin}{match.group('path')}{match.group('suffix')}",
            out,
        )
    return out


_LINE_BREAK_TAG_RE = re.compile(r"<br\s*/?>", re.IGNORECASE)
_BLOCK_END_TAG_RE = re.compile(r"</(p|div|section|article|li|ul|ol|h[1-6])>", re.IGNORECASE)
_LI_START_TAG_RE = re.compile(r"<li[^>]*>", re.IGNORECASE)
_ALL_TAG_RE = re.compile(r"<[^>]+>")
_ORDERED_LINE_RE = re.compile(r"^\d+[\.、]\s*")


def rich_text_to_plain_text(raw: str | None) -> str:
    if not raw:
        return ""
    out = _LINE_BREAK_TAG_RE.sub("\n", raw)
    out = _BLOCK_END_TAG_RE.sub("\n", out)
    out = _LI_START_TAG_RE.sub("- ", out)
    out = _ALL_TAG_RE.sub("", out)
    out = html.unescape(out)
    out = out.replace("\xa0", " ")
    out = re.sub(r"\n[ \t]+", "\n", out)
    out = re.sub(r"\n{3,}", "\n\n", out)
    return out.strip()


def _looks_like_heading(line: str, has_following_line: bool) -> bool:
    cleaned = line.strip().rstrip("：:")
    if not cleaned or not has_following_line:
        return False
    if len(cleaned) > 18:
        return False
    return not bool(re.search(r"[，。；！？,.!?]", cleaned))


def _is_list_line(line: str) -> bool:
    stripped = line.strip()
    return stripped.startswith(("- ", "• ", "* ")) or bool(_ORDERED_LINE_RE.match(stripped))


def _normalize_list_line(line: str) -> str:
    stripped = line.strip()
    stripped = re.sub(r"^[-*•]\s*", "", stripped)
    stripped = _ORDERED_LINE_RE.sub("", stripped)
    return stripped.strip()


def text_to_styled_html(raw: str | None) -> str:
    plain = rich_text_to_plain_text(raw)
    if not plain:
        return ""

    blocks = [block.strip() for block in re.split(r"\n\s*\n", plain) if block.strip()]
    sections: list[str] = []
    for block in blocks:
        lines = [line.strip() for line in block.splitlines() if line.strip()]
        if not lines:
            continue

        title_html = ""
        body_lines = lines
        if _looks_like_heading(lines[0], len(lines) > 1):
            title_html = (
                "<div style='font-size:18px;font-weight:700;color:#5d3419;"
                "line-height:1.5;margin-bottom:10px;'>"
                f"{html.escape(lines[0].rstrip('：:'))}"
                "</div>"
            )
            body_lines = lines[1:]

        content_parts: list[str] = []
        list_items: list[str] = []

        def flush_list() -> None:
            if not list_items:
                return
            content_parts.append(
                "<ul style='margin:0;padding-left:20px;color:#5f4a3d;line-height:1.8;'>"
                + "".join(f"<li style='margin:6px 0;'>{html.escape(item)}</li>" for item in list_items)
                + "</ul>"
            )
            list_items.clear()

        for line in body_lines:
            if _is_list_line(line):
                list_items.append(_normalize_list_line(line))
                continue
            flush_list()
            content_parts.append(
                "<p style='margin:0;color:#5f4a3d;font-size:15px;line-height:1.9;'>"
                f"{html.escape(line)}"
                "</p>"
            )
        flush_list()

        if not content_parts and title_html:
            content_parts.append(
                "<p style='margin:0;color:#5f4a3d;font-size:15px;line-height:1.9;'>"
                f"{html.escape(lines[0])}"
                "</p>"
            )
            title_html = ""

        sections.append(
            "<section style='background:#fffaf6;border-radius:18px;padding:18px 18px 16px;"
            "border:1px solid #f1dfcf;box-shadow:0 6px 18px rgba(125,74,36,0.06);'>"
            + title_html
            + "<div style='display:flex;flex-direction:column;gap:10px;'>"
            + "".join(content_parts)
            + "</div></section>"
        )

    return (
        "<div style='display:flex;flex-direction:column;gap:14px;'>"
        + "".join(sections)
        + "</div>"
    )


def get_site_config_value(key: str) -> str | None:
    row = SiteConfig.query.filter_by(config_key=key).first()
    return row.config_value if row else None


def get_default_want_qrcode() -> str | None:
    return get_site_config_value("default_want_qrcode")


def resolve_want_qrcode(product_qrcode: str | None) -> str | None:
    return stable_media_url(product_qrcode or get_default_want_qrcode())
