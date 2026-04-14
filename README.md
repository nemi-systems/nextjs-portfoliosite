# Nemi Portfolio Site

Static portfolio and app host for `nemi`, built with Next.js App Router, TypeScript, and Tailwind CSS. The repo now manages the root site plus subdomain-hosted apps for `synth` and `gravitylens`.

## Architecture
- `src/app/`: App Router routes and UI blocks.
- `src/_posts/`: Markdown blog posts plus optional generated sidecars.
- `src/content/`: Editable content for `ABOUT` and `PROJECTS`.
- `public/`: Static assets.
- `infra/`: Root CDK stacks for ACM certificate issuance and all static app deployments.
- `hosted-apps.json`: Source of truth for hosted subdomains, build outputs, and deployment targets.
- `projects/`: Hosted app workspaces, including the standalone `synth` app and imported repos such as `gravitylens`.

## Site Sections
- `ABOUT`: placeholder copy for `nemi`.
- `PROJECTS`: portfolio links to the hosted app subdomains.
- `BLOG`: recent posts and blog index.

## Development
- Install dependencies: `npm ci`
- Bootstrap app dependencies: `npm run bootstrap:apps`
- Build the static export: `npm run build`
- Build all hosted apps: `npm run build:apps`
- Serve the built export locally: `npm run serve`
- Lint: `npm run lint`
- Optional dev shell: `nix develop`
- Local hosted-app preview URLs after `npm run serve`:
  - `http://localhost:3000`
  - `http://synth.localhost:3000`
  - `http://gravitylens.localhost:3000`
- If your browser does not resolve `*.localhost` automatically, add temporary hosts entries for the specific preview names you want to use.
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
- It creates distinct CloudFront distributions for:
  - `n3mi.net`
  - `www.n3mi.net`
  - `synth.n3mi.net`
  - `gravitylens.n3mi.net`
- Pass the ACM certificate ARN with either:
  - `SITE_CERTIFICATE_ARN=<arn>`
  - `cdk deploy -c certificateArn=<arn>`

### Typical sequence
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

### Manual Cloudflare DNS
Keep the existing apex and `www` records for the root site. After deploying the site stack, add explicit `CNAME` records for:
- `synth`
- `gravitylens`

Point each record at the corresponding CloudFront domain output from `NemiPortfolioSiteStack`. Keep them `DNS only`. Do not add a wildcard DNS record.

## Repositories
- Site repo: `https://github.com/nemi-systems/nextjs-portfoliosite`
- Assets submodule: `https://github.com/nemi-systems/nextjs-portfoliosite-assets`
