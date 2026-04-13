from __future__ import annotations

import argparse
import html
import json
import os
import re
import shutil
import subprocess
import sys
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Iterable, Optional

import numpy as np

from blog_audio import workflow
from blog_audio._repo import DEFAULT_POST_AUDIO_STATE_ROOT, DEFAULT_PUBLIC_AUDIO_ROOT, POSTS_ROOT, PUBLIC_ROOT, repo_relative
from blog_audio.vllm_voice_design import BASE_TASK_TYPE, DEFAULT_BASE_MODEL, ENGINE_NAME


DEFAULT_CHUNK_MIN_CHARS = 200
DEFAULT_CHUNK_MAX_CHARS = 500
DEFAULT_PAUSE_MS = 100
DEFAULT_MP3_BITRATE = "96k"
DEFAULT_REF_AUDIO = Path(os.environ.get("BLOG_AUDIO_REF_AUDIO", "reference-audio.wav"))

FRONTMATTER_RE = re.compile(r"^---\s*\n.*?\n---\s*(?:\n|$)", re.DOTALL)
HEADING_RE = re.compile(r"^(#{1,6})\s+(.*)$")
LIST_ITEM_RE = re.compile(r"^\s{0,3}(?:[-+*]|\d+\.)\s+(.*)$")
HR_RE = re.compile(r"^\s*(?:[-*_]\s*){3,}\s*$")
IMAGE_ONLY_RE = re.compile(r"^\s*!\[[^\]]*]\([^)]*\)\s*$")
INLINE_IMAGE_RE = re.compile(r"!\[[^\]]*]\([^)]*\)")
INLINE_LINK_RE = re.compile(r"\[([^\]]+)]\([^)]*\)")
INLINE_CODE_RE = re.compile(r"`([^`]+)`")
INLINE_MATH_DOLLAR_RE = re.compile(r"(?<!\\)\$.*?(?<!\\)\$")
INLINE_MATH_PAREN_RE = re.compile(r"\\\((.*?)\\\)")
HTML_TAG_RE = re.compile(r"<[^>]+>")
ESCAPED_MARKDOWN_RE = re.compile(r"\\([\\`*_{}\[\]()#+\-.!])")
PURE_EMPHASIS_RE = re.compile(r"^\s*(\*{1,3}|_{1,3})(.+?)\1\s*$")
BLOCK_MATH_OPENERS = {"$$", r"\["}
BLOCK_MATH_CLOSERS = {"$$": "$$", r"\[": r"\]"}


@dataclass(frozen=True)
class NarrationBlock:
    kind: str
    text: str


@dataclass(frozen=True)
class NarrationUnit:
    source_text: str
    spoken_text: str
    block_id: int
    block_char_start: int
    block_char_end: int


@dataclass(frozen=True)
class NarrationChunkSegment:
    block_id: int
    start_char: int
    end_char: int
    text: str


@dataclass(frozen=True)
class NarrationChunk:
    text: str
    spoken_text: str
    start_char: int
    end_char: int
    block_start: int
    block_end: int
    segments: list[NarrationChunkSegment]


@dataclass(frozen=True)
class TextSlice:
    text: str
    start: int
    end: int


def iso_utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def metadata_path(run_dir: Path) -> Path:
    return run_dir / "metadata.json"


def chunk_manifest_path(run_dir: Path) -> Path:
    return run_dir / "chunks.json"


def stitched_wav_path(run_dir: Path) -> Path:
    return run_dir / "post.wav"


def chunks_dir(run_dir: Path) -> Path:
    return run_dir / "chunks"


def resolve_post_path(post_value: str, posts_root: Path) -> Path:
    direct = Path(post_value)
    if direct.exists():
        return direct.resolve()

    if direct.suffix == ".md":
        candidate = posts_root / direct.name
    else:
        candidate = posts_root / f"{post_value}.md"

    if candidate.exists():
        return candidate.resolve()

    raise FileNotFoundError(f"post file not found: {post_value}")


def post_id_from_path(post_path: Path) -> str:
    return post_path.stem


def write_json(path: Path, payload: Dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")


def read_json(path: Path) -> Dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def strip_frontmatter(markdown: str) -> str:
    return FRONTMATTER_RE.sub("", markdown, count=1)


def normalize_inline_markdown(text: str) -> str:
    normalized = text.strip()
    normalized = HTML_TAG_RE.sub(" ", normalized)
    normalized = INLINE_IMAGE_RE.sub(" ", normalized)
    normalized = INLINE_LINK_RE.sub(r"\1", normalized)
    normalized = INLINE_MATH_DOLLAR_RE.sub(" ", normalized)
    normalized = INLINE_MATH_PAREN_RE.sub(" ", normalized)
    normalized = INLINE_CODE_RE.sub(r"\1", normalized)
    normalized = ESCAPED_MARKDOWN_RE.sub(r"\1", normalized)
    normalized = normalized.replace("**", "").replace("__", "")
    normalized = normalized.replace("*", "").replace("_", "")
    normalized = html.unescape(normalized)
    normalized = re.sub(r"\s+", " ", normalized).strip()
    return normalized


def ensure_terminal_punctuation(text: str) -> str:
    stripped = text.strip()
    if not stripped:
        return ""
    if stripped[-1] in ".?!;:":
        return stripped
    return f"{stripped}."


def is_caption_like(raw_text: str) -> bool:
    return PURE_EMPHASIS_RE.match(raw_text.strip()) is not None


def is_html_block_start(line: str) -> bool:
    stripped = line.lstrip()
    return stripped.startswith("<") and not stripped.startswith("<!--")


def split_sentences(text: str) -> list[TextSlice]:
    return [
        TextSlice(text=match.group(0).strip(), start=match.start(), end=match.end())
        for match in re.finditer(r".+?(?:[.?!;:](?=\s|$)|$)", text, flags=re.DOTALL)
        if match.group(0).strip()
    ]


def split_at_word_boundary(text: str, max_chars: int, *, start_offset: int = 0) -> list[TextSlice]:
    remaining_start = 0
    chunks: list[TextSlice] = []
    while len(text) - remaining_start > max_chars:
        cut = text.rfind(" ", remaining_start, remaining_start + max_chars + 1)
        if cut <= remaining_start:
            cut = remaining_start + max_chars
        piece = text[remaining_start:cut]
        if not piece.strip():
            break
        chunks.append(
            TextSlice(
                text=piece.strip(),
                start=start_offset + remaining_start,
                end=start_offset + cut,
            )
        )
        remaining_start = cut
        while remaining_start < len(text) and text[remaining_start].isspace():
            remaining_start += 1

    if remaining_start < len(text):
        chunks.append(
            TextSlice(
                text=text[remaining_start:].strip(),
                start=start_offset + remaining_start,
                end=start_offset + len(text),
            )
        )
    return chunks


def split_long_text(text: str, max_chars: int) -> list[TextSlice]:
    stripped = text.strip()
    if len(stripped) <= max_chars:
        return [TextSlice(text=stripped, start=0, end=len(stripped))]

    sentences = split_sentences(stripped)
    if len(sentences) <= 1:
        return split_at_word_boundary(stripped, max_chars)

    chunks: list[TextSlice] = []
    current_start: int | None = None
    current_end: int | None = None
    for sentence in sentences:
        candidate_start = sentence.start if current_start is None else current_start
        candidate_text = stripped[candidate_start:sentence.end].strip()
        if len(candidate_text) <= max_chars:
            current_start = candidate_start
            current_end = sentence.end
            continue

        if current_start is not None and current_end is not None:
            chunks.append(
                TextSlice(
                    text=stripped[current_start:current_end].strip(),
                    start=current_start,
                    end=current_end,
                )
            )
            current_start = None
            current_end = None

        if len(sentence.text) <= max_chars:
            current_start = sentence.start
            current_end = sentence.end
        else:
            chunks.extend(split_at_word_boundary(sentence.text, max_chars, start_offset=sentence.start))

    if current_start is not None and current_end is not None:
        chunks.append(
            TextSlice(
                text=stripped[current_start:current_end].strip(),
                start=current_start,
                end=current_end,
            )
        )
    return chunks


def split_block_into_units(block: NarrationBlock, *, block_index: int, max_chars: int) -> list[NarrationUnit]:
    return [
        NarrationUnit(
            source_text=text_slice.text,
            spoken_text=ensure_terminal_punctuation(text_slice.text),
            block_id=block_index,
            block_char_start=text_slice.start,
            block_char_end=text_slice.end,
        )
        for text_slice in split_long_text(block.text, max_chars=max_chars)
    ]


def chunk_narration_blocks(
    blocks: list[NarrationBlock],
    *,
    min_chars: int = DEFAULT_CHUNK_MIN_CHARS,
    max_chars: int = DEFAULT_CHUNK_MAX_CHARS,
) -> list[str]:
    return [chunk.text for chunk in build_narration_chunks(blocks, min_chars=min_chars, max_chars=max_chars)]


def build_narration_chunks(
    blocks: list[NarrationBlock],
    *,
    min_chars: int = DEFAULT_CHUNK_MIN_CHARS,
    max_chars: int = DEFAULT_CHUNK_MAX_CHARS,
) -> list[NarrationChunk]:
    if min_chars <= 0:
        raise ValueError("chunk min chars must be greater than zero")
    if max_chars < min_chars:
        raise ValueError("chunk max chars must be greater than or equal to chunk min chars")

    units: list[NarrationUnit] = []
    for block_index, block in enumerate(blocks):
        units.extend(split_block_into_units(block, block_index=block_index, max_chars=max_chars))

    chunks: list[NarrationChunk] = []
    index = 0
    transcript_cursor = 0
    while index < len(units):
        current_units = [units[index]]
        current_text_length = len(units[index].source_text)
        index += 1

        while index < len(units) and current_text_length < min_chars:
            separator_length = 1 if current_units[-1].block_id == units[index].block_id else 2
            candidate_length = current_text_length + separator_length + len(units[index].source_text)
            if candidate_length > max_chars:
                break
            current_units.append(units[index])
            current_text_length = candidate_length
            index += 1

        segments: list[NarrationChunkSegment] = []
        spoken_groups: list[str] = []
        current_group_texts: list[str] = []
        for unit in current_units:
            if segments and segments[-1].block_id == unit.block_id:
                previous = segments[-1]
                segments[-1] = NarrationChunkSegment(
                    block_id=previous.block_id,
                    start_char=previous.start_char,
                    end_char=unit.block_char_end,
                    text=blocks[unit.block_id].text[previous.start_char:unit.block_char_end],
                )
                current_group_texts.append(unit.spoken_text)
                continue

            if current_group_texts:
                spoken_groups.append(" ".join(current_group_texts))
            current_group_texts = [unit.spoken_text]
            segments.append(
                NarrationChunkSegment(
                    block_id=unit.block_id,
                    start_char=unit.block_char_start,
                    end_char=unit.block_char_end,
                    text=blocks[unit.block_id].text[unit.block_char_start:unit.block_char_end],
                )
            )

        if current_group_texts:
            spoken_groups.append(" ".join(current_group_texts))

        chunk_text = "\n\n".join(segment.text for segment in segments)
        chunk_spoken_text = "\n\n".join(spoken_groups)

        start_char = transcript_cursor
        end_char = start_char + len(chunk_text)
        chunks.append(
            NarrationChunk(
                text=chunk_text,
                spoken_text=chunk_spoken_text,
                start_char=start_char,
                end_char=end_char,
                block_start=segments[0].block_id,
                block_end=segments[-1].block_id,
                segments=segments,
            )
        )
        transcript_cursor = end_char + 2

    return chunks


def collect_post_narration_chunks(
    markdown: str,
    *,
    min_chars: int = DEFAULT_CHUNK_MIN_CHARS,
    max_chars: int = DEFAULT_CHUNK_MAX_CHARS,
) -> list[str]:
    content = strip_frontmatter(markdown)
    blocks = extract_narration_blocks(content)
    return chunk_narration_blocks(blocks, min_chars=min_chars, max_chars=max_chars)


def collect_post_narration(
    markdown: str,
    *,
    min_chars: int = DEFAULT_CHUNK_MIN_CHARS,
    max_chars: int = DEFAULT_CHUNK_MAX_CHARS,
) -> tuple[str, list[NarrationChunk]]:
    content = strip_frontmatter(markdown)
    blocks = extract_narration_blocks(content)
    chunks = build_narration_chunks(blocks, min_chars=min_chars, max_chars=max_chars)
    transcript = "\n\n".join(chunk.text for chunk in chunks)
    return transcript, chunks


def extract_narration_blocks(markdown: str) -> list[NarrationBlock]:
    lines = strip_frontmatter(markdown).splitlines()
    blocks: list[NarrationBlock] = []
    index = 0
    in_fence = False
    fence_marker = ""
    in_block_math = False
    block_math_closer = ""
    pending_media_caption = False

    while index < len(lines):
        raw_line = lines[index]
        stripped = raw_line.strip()

        if in_fence:
            if stripped.startswith(fence_marker):
                in_fence = False
                fence_marker = ""
            index += 1
            continue

        if in_block_math:
            if stripped == block_math_closer:
                in_block_math = False
                block_math_closer = ""
            index += 1
            continue

        if not stripped:
            pending_media_caption = False
            index += 1
            continue

        if stripped.startswith("```") or stripped.startswith("~~~"):
            in_fence = True
            fence_marker = stripped[:3]
            index += 1
            continue

        if stripped in BLOCK_MATH_OPENERS:
            in_block_math = True
            block_math_closer = BLOCK_MATH_CLOSERS[stripped]
            index += 1
            continue

        if stripped.startswith("$$") and stripped.endswith("$$") and len(stripped) > 4:
            index += 1
            continue

        if HR_RE.match(stripped):
            pending_media_caption = False
            index += 1
            continue

        if IMAGE_ONLY_RE.match(stripped):
            pending_media_caption = True
            index += 1
            continue

        if is_html_block_start(raw_line):
            pending_media_caption = any(token in stripped.lower() for token in ("<img", "<video", "<source", "<figure", "<div"))
            index += 1
            while index < len(lines) and lines[index].strip():
                index += 1
            continue

        heading_match = HEADING_RE.match(stripped)
        if heading_match:
            normalized_heading = normalize_inline_markdown(heading_match.group(2))
            if normalized_heading:
                blocks.append(NarrationBlock(kind="heading", text=normalized_heading))
            pending_media_caption = False
            index += 1
            continue

        list_match = LIST_ITEM_RE.match(raw_line)
        if list_match:
            item_lines = [list_match.group(1).strip()]
            index += 1
            while index < len(lines):
                continuation = lines[index]
                continuation_stripped = continuation.strip()
                if not continuation_stripped:
                    break
                if LIST_ITEM_RE.match(continuation) or HEADING_RE.match(continuation_stripped) or continuation_stripped.startswith("```") or continuation_stripped.startswith("~~~"):
                    break
                if is_html_block_start(continuation) or IMAGE_ONLY_RE.match(continuation_stripped):
                    break
                item_lines.append(continuation_stripped)
                index += 1

            normalized_item = normalize_inline_markdown(" ".join(item_lines))
            if normalized_item:
                blocks.append(NarrationBlock(kind="paragraph", text=normalized_item))
            pending_media_caption = False
            continue

        if stripped.startswith(">"):
            quote_lines: list[str] = []
            while index < len(lines):
                quote_raw = lines[index].strip()
                if not quote_raw.startswith(">"):
                    break
                quote_lines.append(re.sub(r"^>\s?", "", quote_raw))
                index += 1

            normalized_quote = normalize_inline_markdown(" ".join(quote_lines))
            if normalized_quote:
                blocks.append(NarrationBlock(kind="paragraph", text=normalized_quote))
            pending_media_caption = False
            continue

        paragraph_lines = [stripped]
        index += 1
        while index < len(lines):
            candidate_raw = lines[index]
            candidate = candidate_raw.strip()
            if not candidate:
                break
            if (
                HEADING_RE.match(candidate)
                or LIST_ITEM_RE.match(candidate_raw)
                or candidate.startswith("```")
                or candidate.startswith("~~~")
                or candidate in BLOCK_MATH_OPENERS
                or IMAGE_ONLY_RE.match(candidate)
                or HR_RE.match(candidate)
                or is_html_block_start(candidate_raw)
            ):
                break
            paragraph_lines.append(candidate)
            index += 1

        raw_paragraph = " ".join(paragraph_lines)
        if pending_media_caption and is_caption_like(raw_paragraph):
            pending_media_caption = False
            continue

        normalized_paragraph = normalize_inline_markdown(raw_paragraph)
        if normalized_paragraph:
            blocks.append(NarrationBlock(kind="paragraph", text=normalized_paragraph))
        pending_media_caption = False

    return blocks


def stitch_chunks(chunk_wavs: Iterable[np.ndarray], *, pause_ms: int, sample_rate: int) -> np.ndarray:
    wavs = [np.asarray(wav, dtype=np.float32) for wav in chunk_wavs]
    if not wavs:
        raise ValueError("cannot stitch empty chunk list")

    if len(wavs) == 1 or pause_ms <= 0:
        return wavs[0]

    pause_samples = int(round(sample_rate * (pause_ms / 1000.0)))
    if pause_samples <= 0:
        return np.concatenate(wavs, axis=0)

    pause_shape = (pause_samples, *wavs[0].shape[1:])
    silence = np.zeros(pause_shape, dtype=np.float32)

    parts: list[np.ndarray] = []
    for index, wav in enumerate(wavs):
        if index > 0:
            parts.append(silence)
        parts.append(wav)

    return np.concatenate(parts, axis=0)


def transcode_to_mp3(input_wav: Path, output_mp3: Path, *, bitrate: str) -> None:
    ffmpeg_bin = shutil.which("ffmpeg")
    if not ffmpeg_bin:
        raise FileNotFoundError("ffmpeg is required to encode blog post narration mp3 output")

    output_mp3.parent.mkdir(parents=True, exist_ok=True)
    completed = subprocess.run(
        [
            ffmpeg_bin,
            "-y",
            "-i",
            str(input_wav),
            "-vn",
            "-codec:a",
            "libmp3lame",
            "-b:a",
            bitrate,
            str(output_mp3),
        ],
        check=False,
        capture_output=True,
        text=True,
    )
    if completed.returncode != 0:
        stderr = completed.stderr.strip()
        raise RuntimeError(stderr or f"ffmpeg exited with code {completed.returncode}")


def build_audio_map(
    *,
    existing_map: Optional[Dict[str, Any]],
    post_id: str,
    post_path: Path,
    public_audio_src: str,
    public_mime_type: str,
    run_dir: Path,
    metadata: Dict[str, Any],
) -> Dict[str, Any]:
    payload = dict(existing_map or {})
    payload.update(
        {
            "version": 3,
            "postId": post_id,
            "generatedAt": iso_utc_now(),
            "status": "ok",
        }
    )

    narration = {
        "postPath": repo_relative(post_path),
        "language": metadata.get("language"),
        "model": metadata.get("model"),
        "taskType": metadata.get("task_type"),
        "refAudio": metadata.get("ref_audio"),
        "xVectorOnlyMode": metadata.get("x_vector_only_mode", False),
        "instruct": metadata.get("instruct"),
        "usedDefaultInstruct": metadata.get("used_default_instruct", False),
        "generationKwargs": metadata.get("generation_kwargs", {}),
        "chunkCount": metadata.get("chunk_count", 0),
        "pauseMs": metadata.get("pause_ms", DEFAULT_PAUSE_MS),
        "durationSeconds": metadata.get("duration_seconds", 0),
        "transcript": {
            "text": metadata.get("transcript_text", ""),
            "chunkSeparator": "\n\n",
            "chunks": metadata.get("chunk_records", []),
            "blockCount": metadata.get("block_count", 0),
        },
        "publicAssets": {
            "audioSrc": public_audio_src,
            "mimeType": public_mime_type,
        },
        "privateArtifacts": {
            "runDir": repo_relative(run_dir),
            "metadataPath": repo_relative(metadata_path(run_dir)),
            "chunkManifestPath": repo_relative(chunk_manifest_path(run_dir)),
            "stitchedWavPath": repo_relative(stitched_wav_path(run_dir)),
            "mp3Path": metadata.get("public_audio_path"),
        },
    }
    payload["narration"] = narration
    return payload


def parse_args(argv: Optional[list[str]] = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate stitched narration audio for a markdown post.")
    parser.add_argument("--post", required=True, help="Post id or markdown path under src/_posts")
    parser.add_argument("--run-name")
    parser.add_argument("--posts-root", default=str(POSTS_ROOT))
    parser.add_argument("--public-root", default=str(PUBLIC_ROOT))
    parser.add_argument("--state-root", default=str(DEFAULT_POST_AUDIO_STATE_ROOT))
    parser.add_argument("--audio-map", default="")
    parser.add_argument("--asset-root", default=str(DEFAULT_PUBLIC_AUDIO_ROOT))
    parser.add_argument("--overwrite-public-audio", action=argparse.BooleanOptionalAction, default=True)
    parser.add_argument("--model", default=DEFAULT_BASE_MODEL)
    parser.add_argument("--ref-audio", default=str(DEFAULT_REF_AUDIO))
    parser.add_argument("--chunk-min-chars", type=int, default=DEFAULT_CHUNK_MIN_CHARS)
    parser.add_argument("--chunk-max-chars", type=int, default=DEFAULT_CHUNK_MAX_CHARS)
    parser.add_argument("--pause-ms", type=int, default=DEFAULT_PAUSE_MS)
    parser.add_argument("--mp3-bitrate", default=DEFAULT_MP3_BITRATE)
    workflow.add_common_runtime_args(parser)
    workflow.add_generation_args(parser)
    return parser.parse_args(argv)


def run_post_narration(args: argparse.Namespace) -> Path:
    posts_root = Path(args.posts_root)
    public_root = Path(args.public_root)
    asset_root = Path(args.asset_root)
    state_root = Path(args.state_root)

    post_path = resolve_post_path(args.post, posts_root)
    post_id = post_id_from_path(post_path)

    markdown = post_path.read_text(encoding="utf-8")
    content = strip_frontmatter(markdown)
    blocks = extract_narration_blocks(content)
    chunks = build_narration_chunks(
        blocks,
        min_chars=args.chunk_min_chars,
        max_chars=args.chunk_max_chars,
    )
    transcript_text = "\n\n".join(chunk.text for chunk in chunks)
    if not chunks:
        raise ValueError(f"no narratable text found in post: {post_path}")

    output_root = state_root / post_id / "narration-runs"
    run_dir = workflow.ensure_run_dir(output_root, args.run_name, post_id)
    chunk_audio_dir = chunks_dir(run_dir)
    chunk_audio_dir.mkdir(parents=True, exist_ok=True)

    ref_audio_path = Path(args.ref_audio).expanduser().resolve()
    if not ref_audio_path.exists():
        raise FileNotFoundError(f"reference audio not found: {ref_audio_path}")

    generation_kwargs = workflow.collect_generation_kwargs(args)

    workflow.ensure_runtime_imports()

    chunk_records: list[Dict[str, Any]] = []
    chunk_wavs: list[np.ndarray] = []
    sample_rate: Optional[int] = None

    model = None
    try:
        model = workflow.load_model(args.model, args)
        for index, chunk in enumerate(chunks, start=1):
            wavs, sr = model.generate_voice_clone(
                text=chunk.spoken_text,
                language=args.language,
                ref_audio=str(ref_audio_path),
                x_vector_only_mode=True,
                **generation_kwargs,
            )
            wav = np.asarray(wavs[0], dtype=np.float32)
            if sample_rate is None:
                sample_rate = sr
            elif sample_rate != sr:
                raise ValueError(f"inconsistent sample rate across chunks: {sample_rate} vs {sr}")

            chunk_path = chunk_audio_dir / f"chunk-{index:03d}.wav"
            workflow.sf.write(chunk_path, wav, sr)
            chunk_wavs.append(wav)
            chunk_records.append(
                {
                    "index": index,
                    "charCount": len(chunk.text),
                    "text": chunk.text,
                    "spokenText": chunk.spoken_text,
                    "startChar": chunk.start_char,
                    "endChar": chunk.end_char,
                    "blockStart": chunk.block_start,
                    "blockEnd": chunk.block_end,
                    "segments": [
                        {
                            "blockId": segment.block_id,
                            "startChar": segment.start_char,
                            "endChar": segment.end_char,
                            "text": segment.text,
                        }
                        for segment in chunk.segments
                    ],
                    "audioFile": chunk_path.name,
                    "durationSeconds": round(float(wav.shape[0]) / float(sr), 3),
                }
            )
    finally:
        workflow.release_model(model)

    if sample_rate is None:
        raise ValueError("no audio chunks were generated")

    stitched_wav = stitch_chunks(chunk_wavs, pause_ms=args.pause_ms, sample_rate=sample_rate)
    workflow.sf.write(stitched_wav_path(run_dir), stitched_wav, sample_rate)

    timeline_cursor = 0.0
    for index, chunk_record in enumerate(chunk_records):
        start_time = round(timeline_cursor, 3)
        duration = chunk_record["durationSeconds"]
        end_time = round(start_time + duration, 3)
        chunk_record["startTimeSeconds"] = start_time
        chunk_record["endTimeSeconds"] = end_time
        if index < len(chunk_records) - 1:
            chunk_record["pauseAfterMs"] = args.pause_ms
            timeline_cursor = end_time + (args.pause_ms / 1000.0)
        else:
            chunk_record["pauseAfterMs"] = 0
            timeline_cursor = end_time

    duration_seconds = round(float(stitched_wav.shape[0]) / float(sample_rate), 3)

    manifest_payload = {
        "postId": post_id,
        "createdAt": iso_utc_now(),
        "transcript": {
            "text": transcript_text,
            "chunkSeparator": "\n\n",
            "blockCount": len(blocks),
        },
        "chunks": chunk_records,
    }
    write_json(chunk_manifest_path(run_dir), manifest_payload)

    public_audio_dir = asset_root / post_id
    public_audio_dir.mkdir(parents=True, exist_ok=True)
    public_mp3_path = public_audio_dir / "post.mp3"
    if public_mp3_path.exists() and not args.overwrite_public_audio:
        raise FileExistsError(f"public audio already exists: {public_mp3_path}")

    transcode_to_mp3(stitched_wav_path(run_dir), public_mp3_path, bitrate=args.mp3_bitrate)
    public_audio_src = "/" + public_mp3_path.relative_to(public_root).as_posix()

    metadata = {
        "kind": "post_narration_output",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "engine": ENGINE_NAME,
        "post_id": post_id,
        "post_path": repo_relative(post_path),
        "model": args.model,
        "task_type": BASE_TASK_TYPE,
        "ref_audio": str(ref_audio_path),
        "x_vector_only_mode": True,
        "language": args.language,
        "instruct": None,
        "used_default_instruct": False,
        "generation_kwargs": generation_kwargs,
        "chunk_min_chars": args.chunk_min_chars,
        "chunk_max_chars": args.chunk_max_chars,
        "pause_ms": args.pause_ms,
        "chunk_count": len(chunk_records),
        "block_count": len(blocks),
        "duration_seconds": duration_seconds,
        "public_audio_path": repo_relative(public_mp3_path),
        "transcript_text": transcript_text,
        "chunk_records": chunk_records,
        "files": {
            "chunk_manifest": chunk_manifest_path(run_dir).name,
            "stitched_wav": stitched_wav_path(run_dir).name,
        },
    }
    write_json(metadata_path(run_dir), metadata)

    audio_map_path = Path(args.audio_map) if args.audio_map else posts_root / f"{post_id}.audio-map.json"
    existing_map: Optional[Dict[str, Any]] = None
    if audio_map_path.exists():
        existing_map = read_json(audio_map_path)

    write_json(
        audio_map_path,
        build_audio_map(
            existing_map=existing_map,
            post_id=post_id,
            post_path=post_path,
            public_audio_src=public_audio_src,
            public_mime_type="audio/mpeg",
            run_dir=run_dir,
            metadata=metadata,
        ),
    )
    return audio_map_path


def main(argv: Optional[list[str]] = None) -> int:
    args = parse_args(argv)
    try:
        audio_map_path = run_post_narration(args)
    except Exception as exc:
        print(f"error: {type(exc).__name__}: {exc}", file=sys.stderr)
        return 1

    print(audio_map_path)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
