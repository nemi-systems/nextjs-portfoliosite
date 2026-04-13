from __future__ import annotations

import os
from typing import TYPE_CHECKING, Any, Dict, Optional

if TYPE_CHECKING:
    import numpy as _np
    import torch as _torch
    from transformers import AutoConfig as _AutoConfig
    from transformers import AutoTokenizer as _AutoTokenizer
    from vllm_omni import Omni as _Omni
    from vllm_omni.model_executor.models.qwen3_tts.qwen3_tts_talker import (
        Qwen3TTSTalkerForConditionalGeneration as _Qwen3TTSTalkerForConditionalGeneration,
    )

    np: _np
    torch: _torch
    AutoConfig = _AutoConfig
    AutoTokenizer = _AutoTokenizer
    Omni = _Omni
    Qwen3TTSTalkerForConditionalGeneration = _Qwen3TTSTalkerForConditionalGeneration
else:
    np = None
    torch = None
    AutoConfig = None
    AutoTokenizer = None
    Omni = None
    Qwen3TTSTalkerForConditionalGeneration = None


ENGINE_NAME = "vllm"
VOICE_DESIGN_TASK_TYPE = "VoiceDesign"
BASE_TASK_TYPE = "Base"
DEFAULT_BASE_MODEL = "Qwen/Qwen3-TTS-12Hz-1.7B-Base"


def ensure_runtime_imports() -> None:
    global np
    global torch
    global AutoConfig
    global AutoTokenizer
    global Omni
    global Qwen3TTSTalkerForConditionalGeneration

    if all(
        value is not None
        for value in (np, torch, AutoConfig, AutoTokenizer, Omni, Qwen3TTSTalkerForConditionalGeneration)
    ):
        return

    os.environ.setdefault("VLLM_WORKER_MULTIPROC_METHOD", "spawn")

    import numpy as imported_np
    import torch as imported_torch
    from transformers import AutoConfig as imported_auto_config
    from transformers import AutoTokenizer as imported_auto_tokenizer
    from vllm_omni import Omni as imported_omni
    from vllm_omni.model_executor.models.qwen3_tts.qwen3_tts_talker import (
        Qwen3TTSTalkerForConditionalGeneration as imported_talker,
    )

    np = imported_np
    torch = imported_torch
    AutoConfig = imported_auto_config
    AutoTokenizer = imported_auto_tokenizer
    Omni = imported_omni
    Qwen3TTSTalkerForConditionalGeneration = imported_talker


def _first_value(value: Any, default: Any = None) -> Any:
    if isinstance(value, list):
        return value[0] if value else default
    if value is None:
        return default
    return value


class Qwen3TTSVllmModel:
    def __init__(
        self,
        *,
        model_name: str,
        omni: Any,
        tokenizer: Any,
        talker_config: Any,
        init_kwargs: Optional[Dict[str, Any]] = None,
    ) -> None:
        self.model_name = model_name
        self.omni = omni
        self.tokenizer = tokenizer
        self.talker_config = talker_config
        self.init_kwargs = init_kwargs or {}

    @classmethod
    def from_pretrained(
        cls,
        pretrained_model_name_or_path: str,
        **kwargs: Any,
    ) -> "Qwen3TTSVllmModel":
        ensure_runtime_imports()
        omni = Omni(model=pretrained_model_name_or_path)
        tokenizer = AutoTokenizer.from_pretrained(
            pretrained_model_name_or_path,
            trust_remote_code=True,
            padding_side="left",
        )
        config = AutoConfig.from_pretrained(pretrained_model_name_or_path, trust_remote_code=True)
        talker_config = getattr(config, "talker_config", None)
        if talker_config is None:
            raise ValueError(f"Model config for {pretrained_model_name_or_path} is missing talker_config")
        return cls(
            model_name=pretrained_model_name_or_path,
            omni=omni,
            tokenizer=tokenizer,
            talker_config=talker_config,
            init_kwargs=dict(kwargs),
        )

    def close(self) -> None:
        if self.omni is not None:
            self.omni.close()

    def _wrap_scalar(self, value: Any) -> Any:
        if isinstance(value, list):
            return value
        return [value]

    def _estimate_prompt_len(self, *, task_type: str, additional_information: Dict[str, Any]) -> int:
        return Qwen3TTSTalkerForConditionalGeneration.estimate_prompt_len_from_additional_information(
            additional_information=additional_information,
            task_type=task_type,
            tokenize_prompt=lambda text: self.tokenizer(text, padding=False)["input_ids"],
            codec_language_id=getattr(self.talker_config, "codec_language_id", None),
            spk_is_dialect=getattr(self.talker_config, "spk_is_dialect", None),
        )

    def _build_voice_design_information(
        self,
        *,
        text: str,
        language: str,
        instruct: str,
        generation_kwargs: Dict[str, Any],
    ) -> Dict[str, Any]:
        additional_information: Dict[str, Any] = {
            "task_type": [VOICE_DESIGN_TASK_TYPE],
            "text": [text],
            "language": [language],
            "instruct": [instruct],
        }
        for key, value in generation_kwargs.items():
            if value is None:
                continue
            additional_information[key] = self._wrap_scalar(value)
        return additional_information

    def _build_voice_clone_information(
        self,
        *,
        text: str,
        language: str,
        ref_audio: str,
        ref_text: Optional[str],
        x_vector_only_mode: bool,
        generation_kwargs: Dict[str, Any],
    ) -> Dict[str, Any]:
        additional_information: Dict[str, Any] = {
            "task_type": [BASE_TASK_TYPE],
            "text": [text],
            "language": [language],
            "ref_audio": [ref_audio],
            "x_vector_only_mode": [x_vector_only_mode],
        }
        if ref_text is not None:
            additional_information["ref_text"] = [ref_text]
        for key, value in generation_kwargs.items():
            if value is None:
                continue
            additional_information[key] = self._wrap_scalar(value)
        return additional_information

    def _generate(self, *, task_type: str, additional_information: Dict[str, Any]) -> tuple[list[Any], int]:
        prompt_len = self._estimate_prompt_len(task_type=task_type, additional_information=additional_information)
        inputs = {
            "prompt_token_ids": [1] * prompt_len,
            "additional_information": additional_information,
        }

        responses = self.omni.generate([inputs])
        if not responses:
            raise RuntimeError("No response returned by vLLM.")

        multimodal_output = responses[0].multimodal_output
        if not multimodal_output or "audio" not in multimodal_output or "sr" not in multimodal_output:
            raise RuntimeError(f"Missing audio output from vLLM: {multimodal_output!r}")

        wav = self._flatten_audio_tensor(multimodal_output["audio"])
        sample_rate = self._resolve_sample_rate(multimodal_output["sr"])
        return [wav], sample_rate

    def _flatten_audio_tensor(self, audio_data: Any) -> Any:
        ensure_runtime_imports()
        if isinstance(audio_data, list):
            tensors = [chunk for chunk in audio_data if self._is_non_empty_tensor(chunk)]
            if not tensors:
                raise ValueError("No audio chunks returned by vLLM.")
            return torch.cat(tensors, dim=-1).float().cpu().numpy().flatten()

        if self._is_non_empty_tensor(audio_data):
            return audio_data.float().cpu().numpy().flatten()

        return np.asarray(audio_data, dtype=np.float32).flatten()

    def _is_non_empty_tensor(self, value: Any) -> bool:
        ensure_runtime_imports()
        if hasattr(torch, "is_tensor") and torch.is_tensor(value):
            return bool(value.numel() > 0)
        return False

    def _resolve_sample_rate(self, sr_raw: Any) -> int:
        sr_value = sr_raw[-1] if isinstance(sr_raw, list) and sr_raw else sr_raw
        sr_value = sr_value.item() if hasattr(sr_value, "item") else sr_value
        return int(sr_value)

    def generate_voice_design(
        self,
        *,
        text: str,
        language: str,
        instruct: str,
        **generation_kwargs: Any,
    ) -> tuple[list[Any], int]:
        additional_information = self._build_voice_design_information(
            text=text,
            language=language,
            instruct=instruct,
            generation_kwargs=generation_kwargs,
        )
        return self._generate(task_type=VOICE_DESIGN_TASK_TYPE, additional_information=additional_information)

    def generate_voice_clone(
        self,
        *,
        text: str,
        language: str,
        ref_audio: str,
        ref_text: Optional[str] = None,
        x_vector_only_mode: bool = False,
        **generation_kwargs: Any,
    ) -> tuple[list[Any], int]:
        additional_information = self._build_voice_clone_information(
            text=text,
            language=language,
            ref_audio=ref_audio,
            ref_text=ref_text,
            x_vector_only_mode=x_vector_only_mode,
            generation_kwargs=generation_kwargs,
        )
        return self._generate(task_type=BASE_TASK_TYPE, additional_information=additional_information)


VoiceDesignVllmModel = Qwen3TTSVllmModel


__all__ = [
    "BASE_TASK_TYPE",
    "DEFAULT_BASE_MODEL",
    "ENGINE_NAME",
    "Qwen3TTSVllmModel",
    "VOICE_DESIGN_TASK_TYPE",
    "VoiceDesignVllmModel",
    "ensure_runtime_imports",
]
