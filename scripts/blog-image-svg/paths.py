from __future__ import annotations

import re
from pathlib import Path
from urllib.parse import urlparse

_IMAGE_RE = re.compile(r"!\[[^\]]*\]\(([^)\s]+)(?:\s+\"[^\"]*\")?\)")
_FRONTMATTER_RE = re.compile(r"^---\s*\n([\s\S]*?)\n---\s*(?:\n|$)")
_FRONTMATTER_IMAGE_KEYS = {"coverImage", "image"}


def read_post_markdown(post_path: Path) -> str:
    return post_path.read_text(encoding="utf-8")


def extract_markdown_image_sources(markdown: str) -> list[str]:
    seen: set[str] = set()
    ordered: list[str] = []

    for match in _IMAGE_RE.findall(markdown):
        src = match.strip()
        if not src or src in seen:
            continue
        seen.add(src)
        ordered.append(src)

    return ordered


def extract_frontmatter_image_sources(markdown: str) -> list[str]:
    match = _FRONTMATTER_RE.match(markdown)
    if not match:
        return []

    sources: list[str] = []
    for raw_line in match.group(1).splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or ":" not in line:
            continue

        key, value = line.split(":", 1)
        if key.strip() not in _FRONTMATTER_IMAGE_KEYS:
            continue

        src = value.strip().strip("'\"")
        if src:
            sources.append(src)

    return sources


def dedupe_sources(sources: list[str]) -> list[str]:
    seen: set[str] = set()
    ordered: list[str] = []

    for src in sources:
        if not src or src in seen:
            continue
        seen.add(src)
        ordered.append(src)

    return ordered


def post_id_from_path(post_path: Path) -> str:
    return post_path.stem


def is_local_asset_src(src: str) -> bool:
    parsed = urlparse(src)
    if parsed.scheme or parsed.netloc:
        return False
    return src.startswith("/assets/")


def public_path_from_src(public_root: Path, src: str) -> Path:
    return public_root / src.lstrip("/")


def svg_src_from_src(src: str) -> str:
    rel = Path(src.lstrip("/"))
    svg_rel = rel.parent / "svg" / f"{rel.stem}.svg"
    return "/" + svg_rel.as_posix()


def layer_svg_src_from_src(src: str, layer: str) -> str:
    rel = Path(src.lstrip("/"))
    svg_rel = rel.parent / "svg" / f"{rel.stem}.{layer}.svg"
    return "/" + svg_rel.as_posix()


def preview_src_from_src(src: str) -> str:
    rel = Path(src.lstrip("/"))
    preview_rel = rel.parent / "svg" / "preview" / f"{rel.stem}.png"
    return "/" + preview_rel.as_posix()
