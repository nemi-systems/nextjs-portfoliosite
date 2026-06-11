# nemi portfolio

Static portfolio and hosted-app monorepo for `n3mi.net`.

The root site is a Next.js App Router export. Project apps live under `projects/` and are deployed as separate static origins/subdomains by the CDK stacks in `infra/`.

## Hosted projects

| Project | URL | Source | GitHub-readable docs |
| --- | --- | --- | --- |
| Portfolio | https://n3mi.net | `src/app`, `src/content`, `src/_posts` | this README |
| xand1 | https://xand1.n3mi.net | `projects/xand1` + `infra/lambda/xand1` | [`projects/xand1/README.md`](projects/xand1/README.md) |
| Ontology Viewer | https://ontology.n3mi.net | `projects/ontology` | [`projects/ontology/README.md`](projects/ontology/README.md) |
| GravityLens | https://gravitylens.n3mi.net | `projects/black-hole-laboratory` | [`projects/black-hole-laboratory/README.md`](projects/black-hole-laboratory/README.md) |
| Synth | https://synth.n3mi.net | `projects/synth` | [`projects/synth/docs/synthesizer.md`](projects/synth/docs/synthesizer.md) |

`hosted-apps.json` is the source of truth for hosted app IDs, project paths, build commands, output directories, domains, and CloudFront behavior.

## Repository layout

- `src/app/` — root portfolio routes and UI blocks.
- `src/_posts/` — Markdown blog posts and optional generated sidecars.
- `src/content/` — editable portfolio content.
- `public/` — root public files.
- `public/assets/` — asset submodule (`nemi-systems/nextjs-portfoliosite-assets`). Keep shared media such as blog images, project thumbnails, post audio, and reference audio here.
- `projects/` — independently buildable hosted apps.
- `infra/` — CDK app for the static site distributions and xand1 API.
- `scripts/` — hosted-app build helpers plus blog SVG/audio tooling.

## Common commands

```bash
npm ci
npm run bootstrap:apps
npm run build
npm run build:apps
npm run lint
```

Target one hosted app when iterating:

```bash
npm run build:synth
npm run build:ontology
npm run build:gravitylens
npm run build:xand1
```

Static preview of the already-built exports:

```bash
npm run serve
```

Do not use the static preview server as a development server; run app-specific workflows from the project README/docs when needed.

## Content and assets

- About content: `src/content/about.json`
- Project cards: `src/content/projects.ts`
- Blog posts: `src/_posts/*.md`
- Project thumbnails and generated blog assets: `public/assets/`
- Blog narration reference audio: `public/assets/reference-audio.wav`

Blog asset helpers:

```bash
uv tool install --editable /home/james/projects/svg-layer-tool
npm run svg:post -- --post src/_posts/<post>.md
npm run svg:optimize
npm run audio:bootstrap
BLOG_AUDIO_REF_AUDIO=public/assets/reference-audio.wav npm run audio:post -- --post src/_posts/<post>.md --language English
```

Generated public audio is written under `public/assets/post-audio/<post>/post.mp3`. `ffmpeg` is required for MP3 generation.

## Deployment

The site deploys through the CDK app in `infra/`.

Certificate stack:

- `infra/lib/certificate-stack.ts`
- deploy in `us-east-1`
- validates `www.n3mi.net` and `*.n3mi.net` manually through DNS

Static site stack:

- `infra/lib/static-site-stack.ts`
- reads `hosted-apps.json`
- creates S3/CloudFront hosting for the root site and each hosted app
- requires the ACM certificate ARN via `SITE_CERTIFICATE_ARN` or `-c certificateArn=<arn>`

Typical sequence:

```bash
npm ci
npm run bootstrap:apps
npm run build
npm run build:apps
cd infra
npm ci
npm run build
CERTIFICATE_REGION=us-east-1 npm run cdk -- deploy NemiPortfolioCertificateStack
# create DNS validation records manually
SITE_CERTIFICATE_ARN=<issued-certificate-arn> npm run cdk -- deploy NemiPortfolioSiteStack
```

Manual Cloudflare DNS records should point each hosted app subdomain at the corresponding CloudFront domain output and remain `DNS only`.

## Repositories

- Site repo: https://github.com/nemi-systems/nextjs-portfoliosite
- Assets submodule: https://github.com/nemi-systems/nextjs-portfoliosite-assets
