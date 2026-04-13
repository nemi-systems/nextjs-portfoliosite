---
name: blog-post-workflow
description: Guide blog post creation in this portfolio repo, including where to place markdown files and image/audio assets, how to run SVG layering/optimization and blog audio generation commands, and how to commit asset submodule updates and parent repo blog changes using the strict two-commit workflow. Use when creating, updating, or publishing posts in src/_posts with assets in public/assets.
---

# Blog Post Workflow

## Use Repo Paths Correctly

- Create post markdown files in `src/_posts/`.
- Name posts as `YYYY-MM-DD-post-slug.md`.
- Treat the post id as the filename without `.md`.
- Place optional SVG map files next to posts as `src/_posts/<post-id>.svg-map.json`.
- Place optional audio map files next to posts as `src/_posts/<post-id>.audio-map.json`.
- Place post images inside the assets submodule at `public/assets/<post-slug>/`.
- Place generated post narration inside the assets submodule at `public/assets/post-audio/<post-id>/post.mp3`.
- Reference images from markdown with absolute paths like `/assets/<post-slug>/<file>.webp`.

## Author a New Post

- Create `src/_posts/YYYY-MM-DD-<post-slug>.md`.
- Add frontmatter with at least:

```yaml
---
title: <Post title>
date: YYYY-MM-DD
image: /assets/<post-slug>/thumb.webp
---
```

- Keep `<post-slug>` stable across markdown, asset directory, and image URLs.
- Prefer optimized image formats (WebP when practical).

## Run Blog Asset Pipelines

- Ensure `svg-layer-tool` is installed before SVG generation:
  - `uv tool install --editable /path/to/svg-layer-tool`
- Generate layered SVG mappings for a post when needed:
  - `npm run svg:post -- --post src/_posts/YYYY-MM-DD-<post-slug>.md`
- Confirm the generated mapping file exists:
  - `src/_posts/YYYY-MM-DD-<post-slug>.svg-map.json`
- Optimize SVG assets when relevant:
  - `npm run svg:optimize`
- Bootstrap the copied blog-audio runtime before the first audio run in a shell/environment:
  - `npm run audio:bootstrap`
- Generate blog narration audio and sidecar metadata when needed:
  - `npm run audio:post -- --post src/_posts/YYYY-MM-DD-<post-slug>.md --language English`
- Confirm audio outputs exist after generation:
  - `src/_posts/YYYY-MM-DD-<post-slug>.audio-map.json`
  - `public/assets/post-audio/YYYY-MM-DD-<post-slug>/post.mp3`
- Notes for audio generation:
  - `ffmpeg` must be available for the MP3 transcode step.
  - `audio:post` uses the built-in narration prompt when `--instruct` is omitted.
  - Generated audio defaults to overwriting the public MP3 for the post unless the command is changed to disable overwrite.

## Validate Before Committing

- Check submodule and parent working trees separately:
  - `git -C public/assets status --short`
  - `git status --short`
- Run project checks from repo root:
  - `npm run lint`
  - `npm run build`
- Verify post markdown, optional sidecars, and assets to commit are the intended files only.

## Commit With Strict Two-Commit Flow

- Always commit inside `public/assets` first, then commit parent repo changes.

### Step 1: Commit Assets Submodule

```bash
git -C public/assets status --short
git -C public/assets add <asset-paths>
git -C public/assets commit -m "feat: add assets for <post-slug>"
git -C public/assets push
git -C public/assets log -1 --oneline
```

### Step 2: Commit Parent Repo

```bash
git status --short
git add src/_posts/YYYY-MM-DD-<post-slug>.md
git add src/_posts/YYYY-MM-DD-<post-slug>.svg-map.json   # if generated
git add src/_posts/YYYY-MM-DD-<post-slug>.audio-map.json # if generated
git add public/assets                                     # submodule pointer update
git commit -m "feat(blog): publish <post-slug>"
git push
```

- Use `feat(blog): ...`, `fix(blog): ...`, or similar Conventional Commit messages in parent repo.

## Recover Common Git Mistakes

- If parent repo staged `public/assets` before submodule commit:
  - `git restore --staged public/assets`
  - finish submodule commit flow first
- If submodule commit exists but parent pointer is missing:
  - `git add public/assets`
  - create a follow-up parent commit
- If parent commit is done but submodule commit is not pushed:
  - push submodule commit
  - create another parent commit updating `public/assets` pointer

## Reference

- Use [references/commit-and-pipeline-cheatsheet.md](references/commit-and-pipeline-cheatsheet.md) for command templates and fast checks.
