# Commit and Pipeline Cheatsheet

## Post and Asset Paths

- Post markdown: `src/_posts/YYYY-MM-DD-<post-slug>.md`
- SVG map (optional): `src/_posts/YYYY-MM-DD-<post-slug>.svg-map.json`
- Audio map (optional): `src/_posts/YYYY-MM-DD-<post-slug>.audio-map.json`
- Assets (submodule): `public/assets/<post-slug>/...`
- Blog audio asset (submodule): `public/assets/post-audio/YYYY-MM-DD-<post-slug>/post.mp3`

## Pipeline Commands

```bash
# Optional prerequisite for svg:post
uv tool install --editable /path/to/svg-layer-tool

# Generate layered mappings for a post
npm run svg:post -- --post src/_posts/YYYY-MM-DD-<post-slug>.md

# Optimize SVG files in assets folders
npm run svg:optimize

# Bootstrap the copied blog-audio runtime
npm run audio:bootstrap

# Generate narration audio + audio map for a post
npm run audio:post -- --post src/_posts/YYYY-MM-DD-<post-slug>.md --language English
```

## Strict Two-Commit Sequence

```bash
# 1) Commit submodule assets first
git -C public/assets status --short
git -C public/assets add <asset-paths>
git -C public/assets commit -m "feat: add assets for <post-slug>"
git -C public/assets push

# 2) Commit parent repo post + pointer update
git status --short
git add src/_posts/YYYY-MM-DD-<post-slug>.md
git add src/_posts/YYYY-MM-DD-<post-slug>.svg-map.json   # if generated
git add src/_posts/YYYY-MM-DD-<post-slug>.audio-map.json # if generated
git add public/assets
git commit -m "feat(blog): publish <post-slug>"
git push
```

## Commit Message Templates

- Submodule:
  - `feat: add assets for <post-slug>`
  - `fix: replace image set for <post-slug>`
- Parent repo:
  - `feat(blog): publish <post-slug>`
  - `fix(blog): update <post-slug> assets and copy`

## Fast Verification

```bash
git -C public/assets log -1 --oneline
git -C public/assets status --short
git status --short
npm run lint
npm run build
```
