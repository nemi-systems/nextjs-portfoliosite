from __future__ import annotations

import argparse
import gc
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import TYPE_CHECKING, Any, Dict, List, Optional

from blog_audio._repo import DEFAULT_DESIGN_ROOT
from blog_audio.vllm_voice_design import ENGINE_NAME, VoiceDesignVllmModel

if TYPE_CHECKING:
    import soundfile as _soundfile
    import torch as _torch

    sf: _soundfile
    torch: _torch
    VoiceModel = VoiceDesignVllmModel
else:
    sf = None
    torch = None
    VoiceModel = Any


DEFAULT_DESIGN_MODEL = "Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign"
DEFAULT_DESIGN_INSTRUCT = """Speaker: female, alto range, medium-low pitch, smooth and stable timbre

Tone: neutral-to-warm, calm, composed, lightly conversational
Emotion: restrained, low variance, no dramatic shifts

Pacing: slightly slower than natural speech, steady rhythm
Prosody: controlled intonation, gentle downward cadence at sentence endings
Pauses: short at commas, clear at sentence boundaries, longer at paragraph breaks

Articulation: precise, crisp consonants, clean pronunciation, no slurring

Style: informative blog narration, thoughtful and easy to follow, not performative

Constraints: avoid high pitch, avoid exaggerated expressiveness, avoid breathiness, avoid vocal fry, avoid announcer-style projection

Goal: long-form listening comfort with minimal fatigue and consistent delivery"""


def ensure_runtime_imports() -> None:
    global sf
    global torch
    global VoiceModel
    if torch is not None and sf is not None and VoiceModel is not Any:
        return

    import soundfile as imported_sf
    import torch as imported_torch

    sf = imported_sf
    torch = imported_torch
    VoiceModel = VoiceDesignVllmModel


def resolve_dtype(dtype_name: str) -> Any:
    ensure_runtime_imports()
    mapping = {
        "bfloat16": torch.bfloat16,
        "float16": torch.float16,
        "float32": torch.float32,
    }
    return mapping[dtype_name]


def utc_timestamp() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")


def slugify(value: str) -> str:
    text = re.sub(r"[^a-zA-Z0-9]+", "-", value.strip().lower()).strip("-")
    return text or "sample"


def load_text_arg(inline: Optional[str], file_path: Optional[str], field_name: str) -> str:
    if inline:
        return inline.strip()
    if file_path:
        return Path(file_path).read_text(encoding="utf-8").strip()
    raise ValueError(f"{field_name} is required.")


def load_instruct_arg(inline: Optional[str], file_path: Optional[str]) -> str:
    if inline:
        return inline.strip()
    if file_path:
        return Path(file_path).read_text(encoding="utf-8").strip()
    return DEFAULT_DESIGN_INSTRUCT


def ensure_run_dir(root: Path, run_name: Optional[str], label_hint: str) -> Path:
    slug = slugify(run_name or label_hint)
    run_dir = root / f"{utc_timestamp()}_{slug}"
    run_dir.mkdir(parents=True, exist_ok=False)
    return run_dir


def metadata_path(run_dir: Path) -> Path:
    return run_dir / "metadata.json"


def design_audio_path(run_dir: Path) -> Path:
    return run_dir / "design.wav"


def write_metadata(path: Path, payload: Dict[str, Any]) -> None:
    path.write_text(json.dumps(payload, indent=2, sort_keys=True), encoding="utf-8")


def read_metadata(path: Path) -> Dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def release_model(model: Optional[VoiceModel]) -> None:
    ensure_runtime_imports()
    if model is None:
        return
    close = getattr(model, "close", None)
    if callable(close):
        close()
    del model
    gc.collect()
    if torch.cuda.is_available():
        torch.cuda.empty_cache()


def load_model(model_name: str, args: argparse.Namespace) -> VoiceModel:
    ensure_runtime_imports()
    return VoiceModel.from_pretrained(
        model_name,
        device_map=args.device_map,
        dtype=resolve_dtype(args.dtype),
        attn_implementation=args.attn_implementation,
    )


def collect_generation_kwargs(args: argparse.Namespace) -> Dict[str, Any]:
    gen_kwargs: Dict[str, Any] = {}
    for key in [
        "max_new_tokens",
        "temperature",
        "top_k",
        "top_p",
        "repetition_penalty",
        "subtalker_top_k",
        "subtalker_top_p",
        "subtalker_temperature",
    ]:
        value = getattr(args, key, None)
        if value is not None:
            gen_kwargs[key] = value

    for key in ["do_sample", "subtalker_dosample", "non_streaming_mode"]:
        if hasattr(args, key):
            gen_kwargs[key] = getattr(args, key)
    return gen_kwargs


def run_design(args: argparse.Namespace) -> Path:
    ensure_runtime_imports()
    text = load_text_arg(args.text, args.text_file, "Text")
    instruct = load_instruct_arg(args.instruct, args.instruct_file)
    run_dir = ensure_run_dir(Path(args.output_root), args.run_name, instruct[:48])
    gen_kwargs = collect_generation_kwargs(args)

    design_model: Optional[VoiceModel] = None
    try:
        design_model = load_model(args.design_model, args)
        wavs, sr = design_model.generate_voice_design(
            text=text,
            language=args.language,
            instruct=instruct,
            **gen_kwargs,
        )
        sf.write(design_audio_path(run_dir), wavs[0], sr)

        metadata = {
            "kind": "voice_design_output",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "engine": ENGINE_NAME,
            "design_model": args.design_model,
            "language": args.language,
            "text": text,
            "instruct": instruct,
            "generation_kwargs": gen_kwargs,
            "files": {
                "design_audio": design_audio_path(run_dir).name,
            },
        }
        write_metadata(metadata_path(run_dir), metadata)
        return run_dir
    finally:
        release_model(design_model)


def add_common_runtime_args(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("--device-map", default="cuda:0")
    parser.add_argument("--dtype", default="bfloat16", choices=["bfloat16", "float16", "float32"])
    parser.add_argument("--attn-implementation", default="flash_attention_2")


def add_generation_args(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("--language", default="Auto")
    parser.add_argument("--max-new-tokens", type=int, default=None)
    parser.add_argument("--temperature", type=float, default=None)
    parser.add_argument("--top-k", type=int, default=None)
    parser.add_argument("--top-p", type=float, default=None)
    parser.add_argument("--repetition-penalty", type=float, default=None)
    parser.add_argument("--subtalker-top-k", type=int, default=None)
    parser.add_argument("--subtalker-top-p", type=float, default=None)
    parser.add_argument("--subtalker-temperature", type=float, default=None)
    parser.add_argument("--do-sample", action=argparse.BooleanOptionalAction, default=True)
    parser.add_argument("--subtalker-dosample", action=argparse.BooleanOptionalAction, default=True)
    parser.add_argument("--non-streaming-mode", action=argparse.BooleanOptionalAction, default=True)


def add_text_input_args(parser: argparse.ArgumentParser) -> None:
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--text")
    group.add_argument("--text-file")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Minimal Qwen voice design workflow.")
    subparsers = parser.add_subparsers(dest="command", required=True)

    design = subparsers.add_parser("design", help="Generate and save a designed voice sample.")
    add_text_input_args(design)
    instruct_group = design.add_mutually_exclusive_group(required=False)
    instruct_group.add_argument("--instruct")
    instruct_group.add_argument("--instruct-file")
    design.add_argument("--run-name")
    design.add_argument("--output-root", default=str(DEFAULT_DESIGN_ROOT))
    design.add_argument("--design-model", default=DEFAULT_DESIGN_MODEL)
    add_common_runtime_args(design)
    add_generation_args(design)
    design.set_defaults(func=run_design)

    return parser


def main(argv: Optional[List[str]] = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    try:
        run_dir = args.func(args)
    except Exception as exc:
        print(f"error: {type(exc).__name__}: {exc}", file=sys.stderr)
        return 1

    print(run_dir)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
