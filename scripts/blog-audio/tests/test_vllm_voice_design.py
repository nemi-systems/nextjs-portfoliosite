from __future__ import annotations

import importlib
import sys
import types
import unittest
from pathlib import Path


TEST_ROOT = Path(__file__).resolve().parents[1]
SRC_ROOT = TEST_ROOT / "src"
if str(SRC_ROOT) not in sys.path:
    sys.path.insert(0, str(SRC_ROOT))


vllm_voice_design = importlib.import_module("blog_audio.vllm_voice_design")


class FakeTensor:
    def __init__(self, values):
        self.values = list(values)

    def numel(self):
        return len(self.values)

    def float(self):
        return self

    def cpu(self):
        return self

    def numpy(self):
        return FakeArray(self.values)

    def item(self):
        if len(self.values) != 1:
            raise ValueError("item requires a single value")
        return self.values[0]


class FakeArray:
    def __init__(self, values):
        self.values = [float(value) for value in values]

    def flatten(self):
        return self

    def tolist(self):
        return list(self.values)


class FakeTorch(types.SimpleNamespace):
    def __init__(self):
        super().__init__(
            is_tensor=lambda value: isinstance(value, FakeTensor),
            cat=lambda tensors, dim=-1: FakeTensor(
                [value for tensor in tensors for value in tensor.values]
            ),
            float32="float32",
        )


class FakeNumpy(types.SimpleNamespace):
    def __init__(self):
        super().__init__(float32="float32", asarray=lambda values, dtype=None: FakeArray(values))


class FakeTokenizer:
    def __call__(self, text, padding=False):
        return {"input_ids": list(range(len(text)))}


class FakeTalker:
    last_call = None

    @staticmethod
    def estimate_prompt_len_from_additional_information(
        additional_information,
        *,
        task_type,
        tokenize_prompt,
        codec_language_id,
        spk_is_dialect,
        estimate_ref_code_len=None,
    ):
        FakeTalker.last_call = {
            "additional_information": additional_information,
            "task_type": task_type,
            "codec_language_id": codec_language_id,
            "spk_is_dialect": spk_is_dialect,
            "token_count": len(tokenize_prompt("voice design test")),
        }
        return 7


class FakeResponse:
    def __init__(self, multimodal_output):
        self.multimodal_output = multimodal_output


class FakeOmni:
    def __init__(self, responses):
        self.responses = responses
        self.calls = []
        self.closed = False

    def generate(self, prompts):
        self.calls.append(prompts)
        return self.responses

    def close(self):
        self.closed = True


class VoiceDesignVllmModelTests(unittest.TestCase):
    def setUp(self):
        self.original_np = vllm_voice_design.np
        self.original_torch = vllm_voice_design.torch
        self.original_talker = vllm_voice_design.Qwen3TTSTalkerForConditionalGeneration
        self.original_ensure = vllm_voice_design.ensure_runtime_imports

        vllm_voice_design.np = FakeNumpy()
        vllm_voice_design.torch = FakeTorch()
        vllm_voice_design.Qwen3TTSTalkerForConditionalGeneration = FakeTalker
        vllm_voice_design.ensure_runtime_imports = lambda: None

    def tearDown(self):
        vllm_voice_design.np = self.original_np
        vllm_voice_design.torch = self.original_torch
        vllm_voice_design.Qwen3TTSTalkerForConditionalGeneration = self.original_talker
        vllm_voice_design.ensure_runtime_imports = self.original_ensure

    def test_generate_voice_design_builds_vllm_request(self):
        omni = FakeOmni([FakeResponse({"audio": [FakeTensor([0.1, 0.2]), FakeTensor([0.3])], "sr": [FakeTensor([24000])]})])
        model = vllm_voice_design.VoiceDesignVllmModel(
            model_name="Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign",
            omni=omni,
            tokenizer=FakeTokenizer(),
            talker_config=types.SimpleNamespace(codec_language_id={"english": 1}, spk_is_dialect={}),
        )

        wavs, sr = model.generate_voice_design(
            text="Hello world",
            language="English",
            instruct="Calm blog narration",
            max_new_tokens=2048,
            non_streaming_mode=True,
            do_sample=True,
        )

        self.assertEqual(sr, 24000)
        self.assertEqual(wavs[0].tolist(), [0.1, 0.2, 0.3])
        self.assertEqual(FakeTalker.last_call["task_type"], "VoiceDesign")
        payload = FakeTalker.last_call["additional_information"]
        self.assertEqual(payload["task_type"], ["VoiceDesign"])
        self.assertEqual(payload["text"], ["Hello world"])
        self.assertEqual(payload["language"], ["English"])
        self.assertEqual(payload["instruct"], ["Calm blog narration"])
        self.assertEqual(payload["max_new_tokens"], [2048])
        self.assertEqual(payload["non_streaming_mode"], [True])
        self.assertEqual(payload["do_sample"], [True])
        self.assertEqual(omni.calls[0][0]["prompt_token_ids"], [1] * 7)

    def test_generate_voice_design_handles_single_tensor_audio(self):
        omni = FakeOmni([FakeResponse({"audio": FakeTensor([0.4, 0.5]), "sr": FakeTensor([22050])})])
        model = vllm_voice_design.VoiceDesignVllmModel(
            model_name="model",
            omni=omni,
            tokenizer=FakeTokenizer(),
            talker_config=types.SimpleNamespace(codec_language_id={}, spk_is_dialect={}),
        )

        wavs, sr = model.generate_voice_design(text="Hi", language="Auto", instruct="")

        self.assertEqual(sr, 22050)
        self.assertEqual(wavs[0].tolist(), [0.4, 0.5])

    def test_generate_voice_clone_builds_base_request(self):
        omni = FakeOmni([FakeResponse({"audio": [FakeTensor([0.6, 0.7])], "sr": [FakeTensor([24000])]})])
        model = vllm_voice_design.VoiceDesignVllmModel(
            model_name="Qwen/Qwen3-TTS-12Hz-1.7B-Base",
            omni=omni,
            tokenizer=FakeTokenizer(),
            talker_config=types.SimpleNamespace(codec_language_id={"english": 1}, spk_is_dialect={}),
        )

        wavs, sr = model.generate_voice_clone(
            text="Hello clone",
            language="English",
            ref_audio="/tmp/reference.wav",
            x_vector_only_mode=True,
            max_new_tokens=1024,
            non_streaming_mode=True,
        )

        self.assertEqual(sr, 24000)
        self.assertEqual(wavs[0].tolist(), [0.6, 0.7])
        self.assertEqual(FakeTalker.last_call["task_type"], "Base")
        payload = FakeTalker.last_call["additional_information"]
        self.assertEqual(payload["task_type"], ["Base"])
        self.assertEqual(payload["text"], ["Hello clone"])
        self.assertEqual(payload["language"], ["English"])
        self.assertEqual(payload["ref_audio"], ["/tmp/reference.wav"])
        self.assertEqual(payload["x_vector_only_mode"], [True])
        self.assertEqual(payload["max_new_tokens"], [1024])
        self.assertEqual(payload["non_streaming_mode"], [True])

    def test_close_forwards_to_omni(self):
        omni = FakeOmni([])
        model = vllm_voice_design.VoiceDesignVllmModel(
            model_name="model",
            omni=omni,
            tokenizer=FakeTokenizer(),
            talker_config=types.SimpleNamespace(codec_language_id={}, spk_is_dialect={}),
        )

        model.close()

        self.assertTrue(omni.closed)


if __name__ == "__main__":
    unittest.main()
