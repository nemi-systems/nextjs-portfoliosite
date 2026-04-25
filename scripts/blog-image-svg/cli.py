#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
from pathlib import Path
from typing import Any

from manifest import build_manifest, write_manifest
from paths import (
    dedupe_sources,
    extract_frontmatter_image_sources,
    extract_markdown_image_sources,
    is_local_asset_src,
    layer_svg_src_from_src,
    post_id_from_path,
    public_path_from_src,
    read_post_markdown,
    svg_src_from_src,
)

_LAYER_STYLE: dict[str, dict[str, float | str]] = {
    "bg": {"opacity": 1.0, "blend": "normal"},
    "tone": {"opacity": 0.88, "blend": "normal"},
    "highlight": {"opacity": 0.72, "blend": "normal"},
    "line": {"opacity": 0.62, "blend": "normal"},
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate Potrace SVG variants for post images")
    parser.add_argument("--post", required=True, help="Path to markdown post file")
    parser.add_argument("--public-root", default="public", help="Path to public assets root")
    parser.add_argument("--out-manifest", default="", help="Explicit output sidecar map path")
    parser.add_argument("--style", default="gold-fill-transparent", help="Manifest style label")
    parser.add_argument("--color", default="#d4af37", help="Potrace output color")
    parser.add_argument("--turdsize", type=int, default=3, help="Potrace turdsize")
    parser.add_argument("--alphamax", type=float, default=0.9, help="Potrace alphamax")
    parser.add_argument("--opttolerance", type=float, default=0.25, help="Potrace opttolerance")
    parser.add_argument("--threshold", type=float, default=55.0, help="Threshold percentage (0-100)")
    parser.add_argument("--mkbitmap-filter", type=int, default=2, help="mkbitmap highpass radius")
    parser.add_argument("--mkbitmap-scale", type=int, default=2, help="mkbitmap scale")
    parser.add_argument("--poster-colors", type=int, default=4, help="Posterized palette size for multi-layer generation")
    parser.add_argument("--palette-fuzz", type=float, default=7.0, help="Color matching fuzz percent for layer masks")
    parser.add_argument("--preview", type=int, default=0, choices=[0, 1], help="Render preview PNGs with rsvg-convert")
    parser.add_argument("--optimize", type=int, default=1, choices=[0, 1], help="Optimize SVG with svgo when available")
    parser.add_argument("--verbose", action="store_true", help="Print per-image records")
    return parser.parse_args()


def print_report(records: list[dict[str, Any]]) -> None:
    ok = [r for r in records if r.get("status") == "ok"]
    failed = [r for r in records if r.get("status") != "ok"]

    before = sum(int(r.get("svgBytesBeforeOptimize", 0)) for r in ok)
    after = sum(int(r.get("svgBytes", 0)) for r in ok)

    print(f"processed={len(records)} ok={len(ok)} failed={len(failed)}")
    print(f"svg_bytes_before={before} svg_bytes_after={after}")

    coverages: list[float] = []
    for rec in ok:
        coverage = rec.get("maskCoverage")
        if not isinstance(coverage, dict):
            continue
        line_coverage = coverage.get("line")
        if isinstance(line_coverage, (int, float)):
            coverages.append(float(line_coverage))

    if coverages:
        avg = sum(coverages) / len(coverages)
        print(f"mask_line_coverage_avg={avg:.4f}")

    if failed:
        print("failed_images:")
        for row in failed:
            print(f"- {row.get('src')}: {row.get('error', 'unknown error')}")


def resolve_svg_layer_tool_command() -> list[str] | None:
    tool = shutil.which("svg-layer-tool")
    if tool:
        return [tool]

    uv_tool_path = Path.home() / ".local" / "bin" / "svg-layer-tool"
    if uv_tool_path.exists():
        return [str(uv_tool_path)]

    return None


def parse_json_output(stdout: str) -> dict[str, Any] | None:
    stripped = stdout.strip()
    if not stripped:
        return None

    try:
        parsed = json.loads(stripped)
        return parsed if isinstance(parsed, dict) else None
    except json.JSONDecodeError:
        pass

    for line in reversed(stripped.splitlines()):
        line = line.strip()
        if not line:
            continue
        try:
            parsed = json.loads(line)
            if isinstance(parsed, dict):
                return parsed
        except json.JSONDecodeError:
            continue
    return None


def invoke_svg_layer_tool(
    *,
    tool_command: list[str],
    input_path: Path,
    out_dir: Path,
    base_name: str,
    args: argparse.Namespace,
) -> dict[str, Any]:
    command = [
        *tool_command,
        "--input",
        str(input_path),
        "--out-dir",
        str(out_dir),
        "--base-name",
        base_name,
        "--color",
        args.color,
        "--turdsize",
        str(args.turdsize),
        "--alphamax",
        str(args.alphamax),
        "--opttolerance",
        str(args.opttolerance),
        "--threshold",
        str(args.threshold),
        "--mkbitmap-filter",
        str(args.mkbitmap_filter),
        "--mkbitmap-scale",
        str(args.mkbitmap_scale),
        "--poster-colors",
        str(args.poster_colors),
        "--palette-fuzz",
        str(args.palette_fuzz),
        "--preview",
        str(args.preview),
        "--optimize",
        str(args.optimize),
    ]

    completed = subprocess.run(
        command,
        check=False,
        text=True,
        capture_output=True,
    )

    stdout = completed.stdout.strip()
    stderr = completed.stderr.strip()
    parsed = parse_json_output(stdout) or {}

    status = parsed.get("status")
    if status not in {"ok", "error"}:
        parsed["status"] = "ok" if completed.returncode == 0 else "error"

    if completed.returncode != 0:
        parsed["status"] = "error"

    if parsed.get("status") == "error" and not parsed.get("error"):
        detail = stderr or stdout or f"svg-layer-tool exited with code {completed.returncode}"
        parsed["error"] = detail
    elif parsed.get("status") == "ok" and stderr and not parsed.get("warning"):
        parsed["warning"] = stderr

    return parsed


def build_layer_manifest_entries(src: str) -> list[dict[str, Any]]:
    entries: list[dict[str, Any]] = []
    for kind in ("bg", "tone", "highlight", "line"):
        entries.append({
            "kind": kind,
            "src": layer_svg_src_from_src(src, kind),
            "opacity": float(_LAYER_STYLE[kind]["opacity"]),
            "blend": str(_LAYER_STYLE[kind]["blend"]),
        })
    return entries


def main() -> int:
    args = parse_args()

    tool_command = resolve_svg_layer_tool_command()
    if not tool_command:
        print("missing required tool: svg-layer-tool (install with `uv tool install --editable /path/to/svg-layer-tool`)", file=sys.stderr)
        return 2

    post_path = Path(args.post)
    if not post_path.exists():
        print(f"post file not found: {post_path}", file=sys.stderr)
        return 2

    public_root = Path(args.public_root)
    post_id = post_id_from_path(post_path)

    out_manifest = Path(args.out_manifest) if args.out_manifest else Path("src/_posts") / f"{post_id}.svg-map.json"

    markdown = read_post_markdown(post_path)
    sources = dedupe_sources([
        *extract_frontmatter_image_sources(markdown),
        *extract_markdown_image_sources(markdown),
    ])
    local_asset_sources = [src for src in sources if is_local_asset_src(src)]

    records: list[dict[str, Any]] = []
    for src in local_asset_sources:
        svg_src = svg_src_from_src(src)
        input_path = public_path_from_src(public_root, src)
        out_dir = input_path.parent / "svg"

        raw = invoke_svg_layer_tool(
            tool_command=tool_command,
            input_path=input_path,
            out_dir=out_dir,
            base_name=input_path.stem,
            args=args,
        )

        result: dict[str, Any] = {
            "src": src,
            "status": "error",
        }

        if raw.get("status") == "ok":
            result["status"] = "ok"
            result["svgSrc"] = svg_src
            result["layers"] = build_layer_manifest_entries(src)
            if isinstance(raw.get("palette"), dict):
                result["palette"] = raw["palette"]
            if isinstance(raw.get("maskCoverage"), dict):
                result["maskCoverage"] = raw["maskCoverage"]
            if isinstance(raw.get("inputBytes"), int):
                result["inputBytes"] = raw["inputBytes"]
            if isinstance(raw.get("svgBytesBeforeOptimize"), int):
                result["svgBytesBeforeOptimize"] = raw["svgBytesBeforeOptimize"]
            if isinstance(raw.get("svgBytes"), int):
                result["svgBytes"] = raw["svgBytes"]
        else:
            result["error"] = str(raw.get("error", "svg-layer-tool failed"))

        if "warning" in raw:
            result["warning"] = raw["warning"]

        records.append(result)
        if args.verbose:
            print(json.dumps(result, indent=2))

    manifest_images: list[dict[str, Any]] = []
    for rec in records:
        row = {
            "src": rec["src"],
            "status": rec.get("status", "error"),
        }
        if rec.get("status") == "ok":
            row["svgSrc"] = rec.get("svgSrc")
            if isinstance(rec.get("layers"), list):
                row["layers"] = rec["layers"]
            if isinstance(rec.get("palette"), dict):
                row["palette"] = rec["palette"]
        if "error" in rec:
            row["error"] = rec["error"]
        if "warning" in rec:
            row["warning"] = rec["warning"]
        manifest_images.append(row)

    manifest = build_manifest(post_id=post_id, style=args.style, images=manifest_images)
    write_manifest(out_manifest, manifest)

    print_report(records)
    print(f"manifest={out_manifest}")

    failures = [r for r in records if r.get("status") != "ok"]
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
