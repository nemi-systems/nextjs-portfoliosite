from __future__ import annotations

import importlib
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

    def write(path, wav, sr):
        Path(path).write_bytes(f"{sr}:{len(wav)}".encode())

    fake_soundfile.write = write

    fake_qwen_root = types.ModuleType("qwen_tts")

    class FakeQwen3TTSModel:
        @classmethod
        def from_pretrained(cls, *args, **kwargs):
            raise AssertionError("Tests should patch load_model directly.")

    fake_qwen_root.Qwen3TTSModel = FakeQwen3TTSModel

    sys.modules["torch"] = fake_torch
    sys.modules["soundfile"] = fake_soundfile
    sys.modules["qwen_tts"] = fake_qwen_root


install_dependency_stubs()
voice_workflow = importlib.import_module("blog_audio.workflow")


class FakeDesignModel:
    def generate_voice_design(self, text, language, instruct, **kwargs):
        return [[0.1, 0.2, 0.3]], 24000


class VoiceWorkflowTests(unittest.TestCase):
    def test_parser_is_design_only(self):
        parser = voice_workflow.build_parser()
        help_text = parser.format_help()
        self.assertIn("design", help_text)
        self.assertNotIn("clone", help_text)
        self.assertNotIn("base-model", help_text)

    def test_run_design_uses_default_instruct_when_omitted(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            original_load_model = voice_workflow.load_model
            voice_workflow.load_model = lambda model_name, args: FakeDesignModel()
            try:
                args = SimpleNamespace(
                    text="Reference line",
                    text_file=None,
                    instruct=None,
                    instruct_file=None,
                    run_name="test-voice",
                    output_root=tmpdir,
                    design_model="design-model",
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
                run_dir = voice_workflow.run_design(args)
            finally:
                voice_workflow.load_model = original_load_model

            metadata = voice_workflow.read_metadata(voice_workflow.metadata_path(run_dir))
            self.assertEqual(metadata["instruct"], voice_workflow.DEFAULT_DESIGN_INSTRUCT)
            self.assertEqual(metadata["engine"], "vllm")

    def test_run_design_writes_only_audio_and_metadata(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            original_load_model = voice_workflow.load_model
            voice_workflow.load_model = lambda model_name, args: FakeDesignModel()
            try:
                args = SimpleNamespace(
                    text="Reference line",
                    text_file=None,
                    instruct="Calm, low, deliberate voice",
                    instruct_file=None,
                    run_name="test-voice",
                    output_root=tmpdir,
                    design_model="design-model",
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
                run_dir = voice_workflow.run_design(args)
            finally:
                voice_workflow.load_model = original_load_model

            self.assertTrue(voice_workflow.design_audio_path(run_dir).exists())
            self.assertFalse((run_dir / "clone_prompt.pt").exists())
            metadata = voice_workflow.read_metadata(voice_workflow.metadata_path(run_dir))
            self.assertEqual(metadata["engine"], "vllm")
            self.assertEqual(metadata["text"], "Reference line")
            self.assertEqual(metadata["instruct"], "Calm, low, deliberate voice")
            self.assertEqual(metadata["files"]["design_audio"], "design.wav")
            self.assertNotIn("base_model", metadata)


if __name__ == "__main__":
    unittest.main()
