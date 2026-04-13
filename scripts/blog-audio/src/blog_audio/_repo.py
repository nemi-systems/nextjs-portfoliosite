from __future__ import annotations

from pathlib import Path


PACKAGE_ROOT = Path(__file__).resolve().parents[2]
SCRIPTS_ROOT = PACKAGE_ROOT.parent
REPO_ROOT = PACKAGE_ROOT.parents[1]
POSTS_ROOT = REPO_ROOT / "src" / "_posts"
PUBLIC_ROOT = REPO_ROOT / "public"
DEFAULT_STATE_ROOT = PACKAGE_ROOT / ".local"
DEFAULT_DESIGN_ROOT = DEFAULT_STATE_ROOT / "voice_designs"
DEFAULT_POST_AUDIO_STATE_ROOT = DEFAULT_STATE_ROOT / "post-audio"
DEFAULT_PUBLIC_AUDIO_ROOT = PUBLIC_ROOT / "assets" / "post-audio"


def repo_relative(path: Path) -> str:
    resolved = path.resolve()
    try:
        return resolved.relative_to(REPO_ROOT).as_posix()
    except ValueError:
        return resolved.as_posix()
