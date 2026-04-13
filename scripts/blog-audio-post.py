#!/usr/bin/env python3
from __future__ import annotations

import sys
from pathlib import Path


REPO_SCRIPTS = Path(__file__).resolve().parent
SRC_ROOT = REPO_SCRIPTS / "blog-audio" / "src"
if str(SRC_ROOT) not in sys.path:
    sys.path.insert(0, str(SRC_ROOT))

from blog_audio.post_audio import main


if __name__ == "__main__":
    raise SystemExit(main())
