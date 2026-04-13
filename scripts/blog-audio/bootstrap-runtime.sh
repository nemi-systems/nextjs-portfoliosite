#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
PROJECT_ROOT="${REPO_ROOT}/scripts/blog-audio"
DEFAULT_SOURCE_VENV="$(cd "${REPO_ROOT}/.." && pwd)/tts/.venv"
TARGET_VENV="${PROJECT_ROOT}/.venv"
SOURCE_VENV="${DEFAULT_SOURCE_VENV}"
REFRESH=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --source-venv)
      SOURCE_VENV="$2"
      shift 2
      ;;
    --refresh)
      REFRESH=1
      shift
      ;;
    *)
      echo "unknown argument: $1" >&2
      exit 2
      ;;
  esac
done

if [[ ! -d "${SOURCE_VENV}" ]]; then
  echo "source venv not found: ${SOURCE_VENV}" >&2
  exit 2
fi

if ! command -v uv >/dev/null 2>&1; then
  echo "uv is required to bootstrap the copied runtime" >&2
  exit 2
fi

if [[ ${REFRESH} -eq 1 && -d "${TARGET_VENV}" ]]; then
  rm -rf "${TARGET_VENV}"
fi

if [[ ! -d "${TARGET_VENV}" ]]; then
  cp -a "${SOURCE_VENV}" "${TARGET_VENV}"
fi

SITE_PACKAGES="$("${TARGET_VENV}/bin/python" - <<'PY'
import sysconfig
print(sysconfig.get_path("purelib"))
PY
)"

find "${SITE_PACKAGES}" -maxdepth 1 -type f -name '__editable__.qwen_tts-*.pth' -delete
find "${SITE_PACKAGES}" -maxdepth 1 -type f -name '__editable___qwen_tts_*_finder.py' -delete
find "${SITE_PACKAGES}" -maxdepth 1 -type d -name 'qwen_tts-*.dist-info' -prune -exec rm -rf {} +
find "${SITE_PACKAGES}" -maxdepth 1 -type d -name 'qwen_tts' -prune -exec rm -rf {} +

uv pip install --python "${TARGET_VENV}/bin/python" --no-deps --editable "${PROJECT_ROOT}"

echo "${TARGET_VENV}"

