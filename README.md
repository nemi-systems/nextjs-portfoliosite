# Nemi Portfolio Site

Static portfolio for `nemi`, built with Next.js App Router, TypeScript, and Tailwind CSS. The site includes a markdown-powered blog, a reduced single-project portfolio surface, and AWS CDK infrastructure for a parallel `n3mi.net` deployment.

## Architecture
- `src/app/`: App Router routes and UI blocks.
- `src/_posts/`: Markdown blog posts plus optional generated sidecars.
- `src/content/`: Editable content for `ABOUT` and `PROJECTS`.
- `public/`: Static assets.
- `infra/`: CDK stacks for ACM certificate issuance and the static site deployment.

## Site Sections
- `ABOUT`: placeholder copy for `nemi`.
- `PROJECTS`: one surviving `Personal Portfolio Website` entry.
- `BLOG`: recent posts and blog index.

## Development
- Install dependencies: `npm ci`
- Build the static export: `npm run build`
- Serve the built export locally: `npm run serve`
- Lint: `npm run lint`
- Optional dev shell: `nix develop`
- SVG utility prerequisite: `uv tool install --editable /path/to/svg-layer-tool`
- Generate layered SVGs for a post: `npm run svg:post -- --post src/_posts/<post>.md`
- Optimize generated SVG assets: `npm run svg:optimize`
- Bootstrap the copied blog-audio runtime: `npm run audio:bootstrap`
- Generate post audio: `npm run audio:post -- --post src/_posts/<post>.md --language English`

## Content Editing
- About content: `src/content/about.json`
- Projects content: `src/content/projects.ts`
- Blog posts: `src/_posts/*.md`
- Optional sidecars:
  - `src/_posts/<post>.svg-map.json`
  - `src/_posts/<post>.audio-map.json`

## Blog Audio
- Export `BLOG_AUDIO_REF_AUDIO=/absolute/path/to/reference-audio.wav` to set the default shared narration sample.
- Generated public audio is written under `public/assets/post-audio/<post>/post.mp3`.
- `ffmpeg` is required for MP3 generation.

## Deployment
The repo now targets the parallel `n3mi.net` deployment path.

### Certificate stack
- ACM certificate stack lives in `infra/lib/certificate-stack.ts`
- Deploy it in `us-east-1`
- Default SANs:
  - `www.n3mi.net`
  - `*.n3mi.net`
- Validation is manual DNS validation

### Site stack
- Static site stack lives in `infra/lib/static-site-stack.ts`
- It supports CloudFront aliases for `n3mi.net` and `www.n3mi.net`
- Pass the ACM certificate ARN with either:
  - `SITE_CERTIFICATE_ARN=<arn>`
  - `cdk deploy -c certificateArn=<arn>`

### Typical sequence
```bash
npm run build
cd infra
npm ci
npm run build
CERTIFICATE_REGION=us-east-1 npm run cdk -- deploy NemiPortfolioCertificateStack
# create DNS validation records manually
SITE_CERTIFICATE_ARN=<issued-certificate-arn> npm run cdk -- deploy NemiPortfolioSiteStack
```

## Repositories
- Site repo: `https://github.com/nemi-systems/nextjs-portfoliosite`
- Assets submodule: `https://github.com/nemi-systems/nextjs-portfoliosite-assets`
