from __future__ import annotations

import importlib
import json
import sys
import tempfile
import types
import unittest
from pathlib import Path
from types import SimpleNamespace


TEST_ROOT = Path(__file__).resolve().parents[1]
SRC_ROOT = TEST_ROOT / "src"
if str(SRC_ROOT) not in sys.path:
    sys.path.insert(0, str(SRC_ROOT))


def install_dependency_stubs() -> None:
    class FakeArray:
        def __init__(self, data):
            self.data = [float(value) for value in data]

        @property
        def shape(self):
            return (len(self.data),)

        def __len__(self):
            return len(self.data)

        def __iter__(self):
            return iter(self.data)

        def __getitem__(self, item):
            if isinstance(item, slice):
                return FakeArray(self.data[item])
            return self.data[item]

        def __mul__(self, value):
            return FakeArray([sample * value for sample in self.data])

        __rmul__ = __mul__

        def tolist(self):
            return list(self.data)

    fake_numpy = types.ModuleType("numpy")
    fake_numpy.float32 = float
    fake_numpy.ndarray = FakeArray
    fake_numpy.asarray = lambda values, dtype=None: values if isinstance(values, FakeArray) else FakeArray(values)
    fake_numpy.linspace = lambda start, stop, num, dtype=None: FakeArray(
        [start + ((stop - start) * index / max(num - 1, 1)) for index in range(num)]
    )
    fake_numpy.ones = lambda count, dtype=None: FakeArray([1.0] * count)
    fake_numpy.zeros = lambda shape, dtype=None: FakeArray([0.0] * (shape[0] if isinstance(shape, tuple) else shape))
    fake_numpy.concatenate = lambda arrays, axis=0: FakeArray(
        [sample for array in arrays for sample in (array.data if isinstance(array, FakeArray) else list(array))]
    )

    class FakeCudaModule:
        @staticmethod
        def is_available():
            return False

        @staticmethod
        def empty_cache():
            return None

    fake_torch = types.ModuleType("torch")
    fake_torch.cuda = FakeCudaModule()
    fake_torch.bfloat16 = "bfloat16"
    fake_torch.float16 = "float16"
    fake_torch.float32 = "float32"
    fake_torch.dtype = object

    fake_soundfile = types.ModuleType("soundfile")
    fake_soundfile.write = lambda path, wav, sr: Path(path).write_bytes(f"{sr}:{len(wav)}".encode())

    fake_qwen_root = types.ModuleType("qwen_tts")
    fake_qwen_root.Qwen3TTSModel = type("FakeQwen3TTSModel", (), {"from_pretrained": classmethod(lambda cls, *args, **kwargs: cls())})

    sys.modules["numpy"] = fake_numpy
    sys.modules["torch"] = fake_torch
    sys.modules["soundfile"] = fake_soundfile
    sys.modules["qwen_tts"] = fake_qwen_root


install_dependency_stubs()
import numpy as np

post_audio = importlib.import_module("blog_audio.post_audio")


class FakeNarrationModel:
    def __init__(self):
        self.calls = []

    def generate_voice_clone(self, text, language, ref_audio, x_vector_only_mode, **kwargs):
        self.calls.append(
            {
                "text": text,
                "language": language,
                "ref_audio": ref_audio,
                "x_vector_only_mode": x_vector_only_mode,
                **kwargs,
            }
        )
        samples = max(4, len(text.split()))
        return [np.linspace(0.0, 0.5, samples, dtype=np.float32)], 24000


class PostAudioTests(unittest.TestCase):
    def test_resolve_post_path_accepts_id(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            posts_root = Path(tmpdir)
            post_path = posts_root / "example-post.md"
            post_path.write_text("# hi\n", encoding="utf-8")
            resolved = post_audio.resolve_post_path("example-post", posts_root)
            self.assertEqual(resolved, post_path.resolve())

    def test_extract_narration_blocks_skips_non_prose_content(self):
        markdown = """---
title: Sample
date: 2026-03-29
---

## Intro

Paragraph with [link](https://example.com) and `inline code`.

![Alt text](/assets/example.png)
*Caption text*

- First bullet
- Second bullet

```mermaid
graph TD
  A-->B
```

$$
E = mc^2
$$

<video autoplay>
  <source src="/assets/demo.mp4" />
</video>

| Label | Value |
|---|---|
| Narrate | No |
| Also narrate | No |

> Quoted line
"""
        blocks = post_audio.extract_narration_blocks(markdown)
        self.assertEqual(
            [block.text for block in blocks],
            [
                "Intro",
                "Paragraph with link and inline code.",
                "First bullet",
                "Second bullet",
                "Quoted line",
            ],
        )

    def test_extract_narration_blocks_skips_markdown_tables(self):
        markdown = """---
title: Sample
---

## Before table

Introductory prose stays in the narration.

| Things to distinguish | Bits required | Everyday analogue |
|---|---:|:---|
| 2 | 1 | on/off |
| "Effectively unique" | 128+ | fingerprints |

## After table

Closing prose also stays in the narration.
"""
        blocks = post_audio.extract_narration_blocks(markdown)

        self.assertEqual(
            [block.text for block in blocks],
            [
                "Before table",
                "Introductory prose stays in the narration.",
                "After table",
                "Closing prose also stays in the narration.",
            ],
        )

    def test_chunk_narration_blocks_combines_short_heading_with_following_paragraph(self):
        blocks = [
            post_audio.NarrationBlock(kind="heading", text="1. Short heading"),
            post_audio.NarrationBlock(kind="paragraph", text="This paragraph is long enough to stay useful but short enough to combine cleanly with the heading for a single chunk."),
            post_audio.NarrationBlock(kind="paragraph", text="Second paragraph stays separate because the first chunk already satisfied the size target."),
        ]
        chunks = post_audio.chunk_narration_blocks(blocks, min_chars=80, max_chars=180)

        self.assertEqual(len(chunks), 2)
        self.assertIn("1. Short heading", chunks[0])
        self.assertIn("This paragraph is long enough", chunks[0])
        self.assertTrue(chunks[0].endswith("."))

    def test_collect_post_narration_chunks_splits_long_paragraph_at_major_punctuation(self):
        markdown = """---
title: Sample
---

## Long section

This is a very long paragraph that should split on punctuation rather than at arbitrary positions, because the generated audio sounds better when the chunk boundary lands after a natural clause. This sentence keeps going so the chunker has to make a real decision; it should still stay readable and preserve punctuation when it breaks. This final sentence ensures there is enough content to create multiple chunks without falling back to character-only slicing.
"""
        chunks = post_audio.collect_post_narration_chunks(markdown, min_chars=120, max_chars=220)

        self.assertGreaterEqual(len(chunks), 2)
        self.assertTrue(all(chunk[-1] in ".?!;:" for chunk in chunks))
        self.assertTrue(all(len(chunk) <= 220 for chunk in chunks))

    def test_chunk_narration_blocks_keeps_short_adjacent_steps_together(self):
        blocks = [
            post_audio.NarrationBlock(kind="paragraph", text="Apply rotational transforms in 3D."),
            post_audio.NarrationBlock(kind="paragraph", text="Project transformed points with perspective."),
            post_audio.NarrationBlock(kind="paragraph", text="Draw segmented latitude longitude wireframe shells."),
            post_audio.NarrationBlock(kind="paragraph", text="Render gated rotating band highlights core plus glow passes."),
            post_audio.NarrationBlock(kind="paragraph", text="Finish with vignette and palette specific compositing."),
        ]

        chunks = post_audio.chunk_narration_blocks(blocks, min_chars=200, max_chars=320)

        self.assertEqual(len(chunks), 1)
        self.assertIn("Apply rotational transforms in 3D.", chunks[0])
        self.assertIn("Finish with vignette and palette specific compositing.", chunks[0])

    def test_collect_post_narration_returns_transcript_offsets(self):
        markdown = """---
title: Sample
---

## Intro

This paragraph is long enough to stand on its own as one narration chunk.

This second paragraph is also substantial enough to remain separate.
"""
        transcript, chunks = post_audio.collect_post_narration(markdown, min_chars=60, max_chars=120)

        self.assertEqual(len(chunks), 2)
        self.assertEqual(transcript, "\n\n".join(chunk.text for chunk in chunks))
        for chunk in chunks:
            self.assertEqual(transcript[chunk.start_char:chunk.end_char], chunk.text)

    def test_collect_post_narration_tracks_block_relative_segments(self):
        markdown = """---
title: Sample
---

## Intro

This paragraph is long enough to stand on its own as one narration chunk.
"""
        transcript, chunks = post_audio.collect_post_narration(markdown, min_chars=60, max_chars=160)

        self.assertEqual(transcript, "Intro\n\nThis paragraph is long enough to stand on its own as one narration chunk.")
        self.assertEqual(len(chunks), 1)
        self.assertEqual(
            [
                {
                    "block_id": segment.block_id,
                    "start_char": segment.start_char,
                    "end_char": segment.end_char,
                    "text": segment.text,
                }
                for segment in chunks[0].segments
            ],
            [
                {"block_id": 0, "start_char": 0, "end_char": 5, "text": "Intro"},
                {
                    "block_id": 1,
                    "start_char": 0,
                    "end_char": 73,
                    "text": "This paragraph is long enough to stand on its own as one narration chunk.",
                },
            ],
        )
        self.assertEqual(chunks[0].spoken_text, "Intro.\n\nThis paragraph is long enough to stand on its own as one narration chunk.")

    def test_stitch_chunks_inserts_silence(self):
        first = np.ones(4, dtype=np.float32)
        second = np.ones(4, dtype=np.float32) * 2
        stitched = post_audio.stitch_chunks([first, second], pause_ms=100, sample_rate=10)
        self.assertEqual(stitched.tolist(), [1.0, 1.0, 1.0, 1.0, 0.0, 2.0, 2.0, 2.0, 2.0])

    def test_build_audio_map_preserves_existing_design_payload(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            post_path = root / "src/_posts/example-post.md"
            run_dir = root / "state/run"
            post_path.parent.mkdir(parents=True)
            run_dir.mkdir(parents=True)
            (run_dir / "metadata.json").write_text("{}", encoding="utf-8")
            (run_dir / "chunks.json").write_text("{}", encoding="utf-8")
            (run_dir / "post.wav").write_bytes(b"wav")

            original_repo_root = post_audio.repo_relative.__globals__["REPO_ROOT"]
            post_audio.repo_relative.__globals__["REPO_ROOT"] = root
            try:
                audio_map = post_audio.build_audio_map(
                    existing_map={"design": {"publicAssets": {"designAudioSrc": "/assets/post-audio/example/design.wav"}}},
                    post_id="example-post",
                    post_path=post_path,
                    public_audio_src="/assets/post-audio/example-post/post.mp3",
                    public_mime_type="audio/mpeg",
                    run_dir=run_dir,
                    metadata={
                        "language": "English",
                        "model": "design-model",
                        "task_type": "Base",
                        "ref_audio": "/tmp/reference.wav",
                        "x_vector_only_mode": True,
                        "instruct": None,
                        "used_default_instruct": False,
                        "generation_kwargs": {"temperature": 0.7},
                        "chunk_count": 3,
                        "pause_ms": 100,
                        "duration_seconds": 12.5,
                        "block_count": 2,
                        "public_audio_path": "public/assets/post-audio/example-post/post.mp3",
                        "transcript_text": "Chunk one.\n\nChunk two.",
                        "chunk_records": [
                            {
                                "index": 1,
                                "text": "Chunk one.",
                                "spokenText": "Chunk one.",
                                "startChar": 0,
                                "endChar": 10,
                                "segments": [
                                    {"blockId": 0, "startChar": 0, "endChar": 10, "text": "Chunk one."}
                                ],
                            },
                            {
                                "index": 2,
                                "text": "Chunk two.",
                                "spokenText": "Chunk two.",
                                "startChar": 12,
                                "endChar": 22,
                                "segments": [
                                    {"blockId": 1, "startChar": 0, "endChar": 10, "text": "Chunk two."}
                                ],
                            },
                        ],
                    },
                )
            finally:
                post_audio.repo_relative.__globals__["REPO_ROOT"] = original_repo_root

            self.assertIn("design", audio_map)
            self.assertEqual(audio_map["narration"]["publicAssets"]["audioSrc"], "/assets/post-audio/example-post/post.mp3")
            self.assertEqual(audio_map["narration"]["privateArtifacts"]["stitchedWavPath"], "state/run/post.wav")
            self.assertEqual(audio_map["narration"]["taskType"], "Base")
            self.assertEqual(audio_map["narration"]["refAudio"], "/tmp/reference.wav")
            self.assertTrue(audio_map["narration"]["xVectorOnlyMode"])
            self.assertEqual(audio_map["narration"]["transcript"]["text"], "Chunk one.\n\nChunk two.")
            self.assertEqual(audio_map["narration"]["transcript"]["blockCount"], 2)
            self.assertEqual(audio_map["narration"]["transcript"]["chunks"][0]["startChar"], 0)
            self.assertEqual(audio_map["version"], 3)

    def test_transcode_to_mp3_uses_requested_bitrate(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            input_wav = root / "input.wav"
            output_mp3 = root / "output.mp3"
            input_wav.write_bytes(b"wav")

            calls: list[list[str]] = []
            original_which = post_audio.shutil.which
            original_run = post_audio.subprocess.run
            post_audio.shutil.which = lambda command: "/usr/bin/ffmpeg" if command == "ffmpeg" else None

            def fake_run(command, check, capture_output, text):
                calls.append(command)
                output_mp3.write_bytes(b"mp3")
                return SimpleNamespace(returncode=0, stderr="")

            post_audio.subprocess.run = fake_run
            try:
                post_audio.transcode_to_mp3(input_wav, output_mp3, bitrate="96k")
            finally:
                post_audio.shutil.which = original_which
                post_audio.subprocess.run = original_run

            self.assertEqual(calls[0][-2:], ["96k", str(output_mp3)])

    def test_run_post_narration_writes_audio_map_and_public_mp3(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            posts_root = root / "src/_posts"
            public_root = root / "public"
            state_root = root / "state"
            posts_root.mkdir(parents=True)
            public_root.mkdir(parents=True)
            post_path = posts_root / "example-post.md"
            post_path.write_text(
                """---
title: Example Post
---

## Intro

This paragraph is comfortably long enough to generate a chunk for narration and to prove that the markdown pipeline extracts useful prose.

This second paragraph creates another chunk and ensures the stitcher is exercised.
""",
                encoding="utf-8",
            )

            original_load_model = post_audio.workflow.load_model
            original_release_model = post_audio.workflow.release_model
            original_transcode = post_audio.transcode_to_mp3
            original_repo_root = post_audio.repo_relative.__globals__["REPO_ROOT"]
            fake_model = FakeNarrationModel()
            post_audio.workflow.load_model = lambda model_name, args: fake_model
            post_audio.workflow.release_model = lambda model: None
            post_audio.transcode_to_mp3 = lambda input_wav, output_mp3, bitrate: output_mp3.write_bytes(b"mp3")
            post_audio.repo_relative.__globals__["REPO_ROOT"] = root
            ref_audio_path = root / "reference.wav"
            ref_audio_path.write_bytes(b"wav")
            try:
                args = SimpleNamespace(
                    post=str(post_path),
                    run_name="example-post",
                    posts_root=str(posts_root),
                    public_root=str(public_root),
                    state_root=str(state_root),
                    audio_map="",
                    asset_root=str(public_root / "assets" / "post-audio"),
                    overwrite_public_audio=True,
                    model="base-model",
                    ref_audio=str(ref_audio_path),
                    chunk_min_chars=80,
                    chunk_max_chars=220,
                    pause_ms=100,
                    mp3_bitrate="96k",
                    language="English",
                    device_map="cuda:0",
                    dtype="bfloat16",
                    attn_implementation="flash_attention_2",
                    max_new_tokens=None,
                    temperature=None,
                    top_k=None,
                    top_p=None,
                    repetition_penalty=None,
                    subtalker_top_k=None,
                    subtalker_top_p=None,
                    subtalker_temperature=None,
                    do_sample=True,
                    subtalker_dosample=True,
                    non_streaming_mode=True,
                )
                audio_map_path = post_audio.run_post_narration(args)
            finally:
                post_audio.workflow.load_model = original_load_model
                post_audio.workflow.release_model = original_release_model
                post_audio.transcode_to_mp3 = original_transcode
                post_audio.repo_relative.__globals__["REPO_ROOT"] = original_repo_root

            self.assertTrue(audio_map_path.exists())
            self.assertTrue((public_root / "assets" / "post-audio" / "example-post" / "post.mp3").exists())
            payload = json.loads(audio_map_path.read_text(encoding="utf-8"))
            self.assertEqual(payload["postId"], "example-post")
            self.assertEqual(payload["narration"]["publicAssets"]["audioSrc"], "/assets/post-audio/example-post/post.mp3")
            self.assertFalse(payload["narration"]["usedDefaultInstruct"])
            self.assertEqual(payload["narration"]["taskType"], "Base")
            self.assertEqual(payload["narration"]["refAudio"], str(ref_audio_path.resolve()))
            self.assertTrue(payload["narration"]["xVectorOnlyMode"])
            self.assertIn("transcript", payload["narration"])
            self.assertGreaterEqual(len(payload["narration"]["transcript"]["chunks"]), 1)
            run_dir = root / payload["narration"]["privateArtifacts"]["runDir"]
            metadata = json.loads((run_dir / "metadata.json").read_text(encoding="utf-8"))
            self.assertEqual(metadata["engine"], "vllm")
            self.assertEqual(metadata["task_type"], "Base")
            self.assertEqual(metadata["ref_audio"], str(ref_audio_path.resolve()))
            self.assertTrue(metadata["x_vector_only_mode"])
            self.assertGreaterEqual(len(fake_model.calls), 1)
            self.assertTrue(all(call["x_vector_only_mode"] for call in fake_model.calls))
            self.assertTrue(all(call["ref_audio"] == str(ref_audio_path.resolve()) for call in fake_model.calls))
            first_chunk = payload["narration"]["transcript"]["chunks"][0]
            self.assertIn("startChar", first_chunk)
            self.assertIn("startTimeSeconds", first_chunk)
            self.assertIn("segments", first_chunk)
            self.assertGreaterEqual(payload["narration"]["transcript"]["blockCount"], 1)

    def test_post_parser_defaults_to_post_driven_workflow(self):
        parser = post_audio.parse_args([
            "--post", "example-post",
        ])
        self.assertFalse(hasattr(parser, "instruct"))
        self.assertEqual(parser.chunk_min_chars, post_audio.DEFAULT_CHUNK_MIN_CHARS)
        self.assertEqual(parser.chunk_max_chars, post_audio.DEFAULT_CHUNK_MAX_CHARS)
        self.assertEqual(parser.mp3_bitrate, post_audio.DEFAULT_MP3_BITRATE)
        self.assertEqual(parser.model, post_audio.DEFAULT_BASE_MODEL)
        self.assertEqual(parser.ref_audio, str(post_audio.DEFAULT_REF_AUDIO))

    def test_post_parser_accepts_legacy_runtime_flags(self):
        parser = post_audio.parse_args([
            "--post", "example-post",
            "--device-map", "cuda:1",
            "--dtype", "float16",
            "--attn-implementation", "flash_attention_2",
        ])
        self.assertEqual(parser.device_map, "cuda:1")
        self.assertEqual(parser.dtype, "float16")
        self.assertEqual(parser.attn_implementation, "flash_attention_2")


if __name__ == "__main__":
    unittest.main()
