#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
PROJECT_ROOT="${REPO_ROOT}/scripts/blog-audio"
TARGET_VENV="${PROJECT_ROOT}/.venv"

if [[ $# -lt 1 ]]; then
  echo "usage: $0 <script> [args...]" >&2
  exit 2
fi

if [[ ! -x "${TARGET_VENV}/bin/python" ]]; then
  echo "missing copied runtime at ${TARGET_VENV}; run: bash scripts/blog-audio/bootstrap-runtime.sh" >&2
  exit 2
fi

if ! "${TARGET_VENV}/bin/python" - <<'PY'
import sys

try:
    import vllm_omni  # noqa: F401
except Exception as exc:
    print(f"vLLM runtime import failed: {type(exc).__name__}: {exc}", file=sys.stderr)
    print(
        "Run this command inside the same CUDA/libstdc++ runtime that supports the copied tts/.venv environment.",
        file=sys.stderr,
    )
    sys.exit(1)
PY
then
  exit 2
fi

export VLLM_WORKER_MULTIPROC_METHOD="spawn"
export PYTHONPATH="${PROJECT_ROOT}/src${PYTHONPATH:+:${PYTHONPATH}}"
exec uv run --python "${TARGET_VENV}/bin/python" "$@"
