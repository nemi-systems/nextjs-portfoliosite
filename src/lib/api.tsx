
// lib/api.ts
import fs from "fs";
import matter from "gray-matter";
import { join } from "path";
import { unified } from "unified";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import rehypeRaw from "rehype-raw";
import rehypeKatex from "rehype-katex";
import rehypeStringify from "rehype-stringify";
import rehypePrettyCode from "rehype-pretty-code";
import { visit } from "unist-util-visit";
import remarkFigureCaption from "remark-figure-caption";

// memoize/cache the creation of the markdown parser, this sped up the
// building of the blog from ~60s->~10s
let p: ReturnType<typeof getParserPre> | undefined;
const postSvgMapCache = new Map<string, Promise<PostSvgMap | null>>();
const postAudioMapCache = new Map<string, Promise<PostAudioMap | null>>();
const postAiImageMapCache = new Map<string, Promise<PostAiImageMap | null>>();

interface PostSvgMapImageEntry {
  src: string;
  svgSrc?: string;
  status?: string;
  layers?: PostSvgMapLayerEntry[];
  aspectRatio?: string;
}

interface PostSvgMapLayerEntry {
  kind?: string;
  src: string;
  opacity?: number;
  blend?: string;
}

function isBackgroundSvgLayer(kind: string | undefined): boolean {
  if (typeof kind !== "string") {
    return false;
  }

  return kind === "bg" || kind === "background";
}

function readSvgAspectRatio(publicRelativePath: string): string | undefined {
  try {
    const fullPath = join("public", publicRelativePath.replace(/^\//, ""));
    const fd = fs.openSync(fullPath, "r");
    try {
      const buf = Buffer.alloc(2048);
      const n = fs.readSync(fd, buf, 0, 2048, 0);
      const head = buf.toString("utf8", 0, n);
      const vb = head.match(/viewBox\s*=\s*"\s*[-\d.eE]+\s+[-\d.eE]+\s+([\d.eE]+)\s+([\d.eE]+)\s*"/);
      if (vb) {
        const w = parseFloat(vb[1]);
        const h = parseFloat(vb[2]);
        if (w > 0 && h > 0) {
          return `${w} / ${h}`;
        }
      }
      const wAttr = head.match(/\swidth\s*=\s*"([\d.eE]+)(?:px)?"/);
      const hAttr = head.match(/\sheight\s*=\s*"([\d.eE]+)(?:px)?"/);
      if (wAttr && hAttr) {
        const w = parseFloat(wAttr[1]);
        const h = parseFloat(hAttr[1]);
        if (w > 0 && h > 0) {
          return `${w} / ${h}`;
        }
      }
    } finally {
      fs.closeSync(fd);
    }
  } catch {
    /* ignore */
  }
  return undefined;
}

interface PostSvgMap {
  version: number;
  postId: string;
  images: PostSvgMapImageEntry[];
}

interface PostAudioNarrationPublicAssets {
  audioSrc: string;
  mimeType?: string;
}

interface PostAudioNarrationTranscriptChunk {
  index?: number;
  text: string;
  spokenText?: string;
  startChar?: number;
  endChar?: number;
  blockStart?: number;
  blockEnd?: number;
  durationSeconds?: number;
  startTimeSeconds?: number;
  endTimeSeconds?: number;
  pauseAfterMs?: number;
  segments?: PostAudioNarrationTranscriptChunkSegment[];
}

interface PostAudioNarrationTranscriptChunkSegment {
  blockId?: number;
  startChar?: number;
  endChar?: number;
  text?: string;
}

interface PostAudioNarrationTranscript {
  text?: string;
  chunkSeparator?: string;
  chunks?: PostAudioNarrationTranscriptChunk[];
  blockCount?: number;
}

interface PostAudioNarration {
  language?: string;
  model?: string;
  chunkCount?: number;
  pauseMs?: number;
  durationSeconds?: number;
  transcript?: PostAudioNarrationTranscript;
  publicAssets?: PostAudioNarrationPublicAssets;
}

interface PostAudioMap {
  version: number;
  postId: string;
  narration?: PostAudioNarration | null;
}

interface PostAiImageEntry {
  src: string;
  prompt: string | null;
  model: string | null;
}

interface PostAiImageMap {
  version: number;
  postId: string;
  images: PostAiImageEntry[];
}

interface NarrationBlock {
  kind: "heading" | "paragraph";
  text: string;
}

const FRONTMATTER_RE = /^---\s*\n[\s\S]*?\n---\s*(?:\n|$)/;
const HEADING_RE = /^(#{1,6})\s+(.*)$/;
const LIST_ITEM_RE = /^\s{0,3}(?:[-+*]|\d+\.)\s+(.*)$/;
const HR_RE = /^\s*(?:[-*_]\s*){3,}\s*$/;
const IMAGE_ONLY_RE = /^\s*!\[[^\]]*]\([^)]*\)\s*$/;
const INLINE_IMAGE_RE = /!\[[^\]]*]\([^)]*\)/g;
const INLINE_LINK_RE = /\[([^\]]+)]\([^)]*\)/g;
const INLINE_CODE_RE = /`([^`]+)`/g;
const INLINE_MATH_DOLLAR_RE = /\$[^$]*\$/g;
const INLINE_MATH_PAREN_RE = /\\\((.*?)\\\)/g;
const HTML_TAG_RE = /<[^>]+>/g;
const ESCAPED_MARKDOWN_RE = /\\([\\`*_{}\[\]()#+\-.!])/g;
const PURE_EMPHASIS_RE = /^\s*(\*{1,3}|_{1,3})(.+?)\1\s*$/;
const BLOCK_MATH_CLOSERS = new Map<string, string>([
  ["$$", "$$"],
  [String.raw`\[`, String.raw`\]`],
]);

function appendClassNames(node: any, classNames: string[]) {
  node.properties = node.properties || {};
  const existing = Array.isArray(node.properties.className)
    ? node.properties.className
    : node.properties.className
      ? [node.properties.className]
      : [];

  for (const className of classNames) {
    if (!existing.includes(className)) {
      existing.push(className);
    }
  }

  node.properties.className = existing;
}

function hasClassName(node: any, className: string) {
  const classNames = node?.properties?.className;
  if (!Array.isArray(classNames)) {
    return false;
  }
  return classNames.includes(className);
}

function stripFrontmatter(markdown: string) {
  return markdown.replace(FRONTMATTER_RE, "");
}

function normalizeInlineMarkdown(text: string) {
  return text
    .trim()
    .replace(HTML_TAG_RE, " ")
    .replace(INLINE_IMAGE_RE, " ")
    .replace(INLINE_LINK_RE, "$1")
    .replace(INLINE_MATH_DOLLAR_RE, " ")
    .replace(INLINE_MATH_PAREN_RE, " ")
    .replace(INLINE_CODE_RE, "$1")
    .replace(ESCAPED_MARKDOWN_RE, "$1")
    .replace(/\*\*/g, "")
    .replace(/__/g, "")
    .replace(/\*/g, "")
    .replace(/_/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isCaptionLike(text: string) {
  return PURE_EMPHASIS_RE.test(text.trim());
}

function isHtmlBlockStart(line: string) {
  const stripped = line.trimStart();
  return stripped.startsWith("<") && !stripped.startsWith("<!--");
}

function extractNarrationBlocks(markdown: string): NarrationBlock[] {
  const lines = stripFrontmatter(markdown).split(/\r?\n/);
  const blocks: NarrationBlock[] = [];
  let index = 0;
  let inFence = false;
  let fenceMarker = "";
  let inBlockMath = false;
  let blockMathCloser = "";
  let pendingMediaCaption = false;

  while (index < lines.length) {
    const rawLine = lines[index];
    const stripped = rawLine.trim();

    if (inFence) {
      if (stripped.startsWith(fenceMarker)) {
        inFence = false;
        fenceMarker = "";
      }
      index += 1;
      continue;
    }

    if (inBlockMath) {
      if (stripped === blockMathCloser) {
        inBlockMath = false;
        blockMathCloser = "";
      }
      index += 1;
      continue;
    }

    if (!stripped) {
      pendingMediaCaption = false;
      index += 1;
      continue;
    }

    if (stripped.startsWith("```") || stripped.startsWith("~~~")) {
      inFence = true;
      fenceMarker = stripped.slice(0, 3);
      index += 1;
      continue;
    }

    if (BLOCK_MATH_CLOSERS.has(stripped)) {
      inBlockMath = true;
      blockMathCloser = BLOCK_MATH_CLOSERS.get(stripped) || "";
      index += 1;
      continue;
    }

    if (stripped.startsWith("$$") && stripped.endsWith("$$") && stripped.length > 4) {
      index += 1;
      continue;
    }

    if (HR_RE.test(stripped)) {
      pendingMediaCaption = false;
      index += 1;
      continue;
    }

    if (IMAGE_ONLY_RE.test(stripped)) {
      pendingMediaCaption = true;
      index += 1;
      continue;
    }

    if (isHtmlBlockStart(rawLine)) {
      pendingMediaCaption = /<(img|video|source|figure|div)\b/i.test(stripped);
      index += 1;
      while (index < lines.length && lines[index].trim()) {
        index += 1;
      }
      continue;
    }

    const headingMatch = stripped.match(HEADING_RE);
    if (headingMatch) {
      const normalizedHeading = normalizeInlineMarkdown(headingMatch[2]);
      if (normalizedHeading) {
        blocks.push({ kind: "heading", text: normalizedHeading });
      }
      pendingMediaCaption = false;
      index += 1;
      continue;
    }

    const listMatch = rawLine.match(LIST_ITEM_RE);
    if (listMatch) {
      const itemLines = [listMatch[1].trim()];
      index += 1;

      while (index < lines.length) {
        const continuationRaw = lines[index];
        const continuation = continuationRaw.trim();
        if (!continuation) {
          break;
        }
        if (
          LIST_ITEM_RE.test(continuationRaw) ||
          HEADING_RE.test(continuation) ||
          continuation.startsWith("```") ||
          continuation.startsWith("~~~") ||
          isHtmlBlockStart(continuationRaw) ||
          IMAGE_ONLY_RE.test(continuation)
        ) {
          break;
        }
        itemLines.push(continuation);
        index += 1;
      }

      const normalizedItem = normalizeInlineMarkdown(itemLines.join(" "));
      if (normalizedItem) {
        blocks.push({ kind: "paragraph", text: normalizedItem });
      }
      pendingMediaCaption = false;
      continue;
    }

    if (stripped.startsWith(">")) {
      const quoteLines: string[] = [];
      while (index < lines.length) {
        const quoteRaw = lines[index].trim();
        if (!quoteRaw.startsWith(">")) {
          break;
        }
        quoteLines.push(quoteRaw.replace(/^>\s?/, ""));
        index += 1;
      }

      const normalizedQuote = normalizeInlineMarkdown(quoteLines.join(" "));
      if (normalizedQuote) {
        blocks.push({ kind: "paragraph", text: normalizedQuote });
      }
      pendingMediaCaption = false;
      continue;
    }

    const paragraphLines = [stripped];
    index += 1;
    while (index < lines.length) {
      const candidateRaw = lines[index];
      const candidate = candidateRaw.trim();
      if (!candidate) {
        break;
      }
      if (
        HEADING_RE.test(candidate) ||
        LIST_ITEM_RE.test(candidateRaw) ||
        candidate.startsWith("```") ||
        candidate.startsWith("~~~") ||
        BLOCK_MATH_CLOSERS.has(candidate) ||
        IMAGE_ONLY_RE.test(candidate) ||
        HR_RE.test(candidate) ||
        isHtmlBlockStart(candidateRaw)
      ) {
        break;
      }
      paragraphLines.push(candidate);
      index += 1;
    }

    const rawParagraph = paragraphLines.join(" ");
    if (pendingMediaCaption && isCaptionLike(rawParagraph)) {
      pendingMediaCaption = false;
      continue;
    }

    const normalizedParagraph = normalizeInlineMarkdown(rawParagraph);
    if (normalizedParagraph) {
      blocks.push({ kind: "paragraph", text: normalizedParagraph });
    }
    pendingMediaCaption = false;
  }

  return blocks;
}

function extractNarrationTextFromNode(node: any): string {
  if (!node) {
    return "";
  }
  if (node.type === "text") {
    return String(node.value || "");
  }
  if (node.type !== "element") {
    return "";
  }

  const tagName = node.tagName;
  if (
    tagName === "img" ||
    tagName === "video" ||
    tagName === "audio" ||
    tagName === "source" ||
    tagName === "figure" ||
    tagName === "figcaption" ||
    tagName === "pre" ||
    tagName === "script" ||
    tagName === "style" ||
    tagName === "svg"
  ) {
    return "";
  }

  if (
    node.properties?.["aria-hidden"] === "true" ||
    hasClassName(node, "katex") ||
    hasClassName(node, "katex-html") ||
    hasClassName(node, "katex-mathml")
  ) {
    return "";
  }

  return Array.isArray(node.children)
    ? node.children.map((child: any) => extractNarrationTextFromNode(child)).join(" ")
    : "";
}

function normalizeNarrationNodeText(node: any) {
  return extractNarrationTextFromNode(node).replace(/\s+/g, " ").trim();
}

function collectNarrationElementCandidates(node: any, candidates: Array<{ kind: "heading" | "paragraph"; node: any; text: string }>) {
  if (!node || (node.type !== "root" && node.type !== "element")) {
    return;
  }

  if (node.type === "element") {
    if (/^h[1-6]$/.test(node.tagName)) {
      const text = normalizeNarrationNodeText(node);
      if (text) {
        candidates.push({ kind: "heading", node, text });
      }
      return;
    }

    if (node.tagName === "p" || node.tagName === "li" || node.tagName === "blockquote") {
      const text = normalizeNarrationNodeText(node);
      if (text) {
        candidates.push({ kind: "paragraph", node, text });
      }
      return;
    }
  }

  if (!Array.isArray(node.children)) {
    return;
  }

  for (const child of node.children) {
    collectNarrationElementCandidates(child, candidates);
  }
}

function annotateNarrationBlocks(tree: any, narrationBlockCount: number) {
  if (!Number.isFinite(narrationBlockCount) || narrationBlockCount <= 0) {
    return;
  }

  const candidates: Array<{ kind: "heading" | "paragraph"; node: any; text: string }> = [];
  collectNarrationElementCandidates(tree, candidates);
  const annotatedCount = Math.min(narrationBlockCount, candidates.length);

  for (let index = 0; index < annotatedCount; index += 1) {
    const candidate = candidates[index];
    candidate.node.properties = candidate.node.properties || {};
    candidate.node.properties["data-narration-block"] = String(index);
    appendClassNames(candidate.node, ["post-narration-block"]);
  }

  if (annotatedCount !== narrationBlockCount && process.env.NODE_ENV !== "production") {
    console.warn(
      `[post-audio] Narration block count mismatch: extracted=${narrationBlockCount} rendered=${candidates.length}`
    );
  }
}

function addClasses() {
  return (tree: any, file: any) => {
    const svgMapBySrc: Map<string, PostSvgMapImageEntry> =
      file?.data?.svgMapBySrc instanceof Map ? file.data.svgMapBySrc : new Map();
    const narrationBlockCount =
      typeof file?.data?.narrationBlockCount === "number" ? file.data.narrationBlockCount : 0;

    visit(tree, "element", (node: any, index: number | undefined, parent: any) => {
      if (node.tagName === "img") {
        const src = typeof node.properties?.src === "string" ? node.properties.src : "";
        const mapped = svgMapBySrc.get(src);
        if (!mapped || !parent || typeof index !== "number") {
          return;
        }

        const originalAlt = typeof node.properties?.alt === "string" ? node.properties.alt : "";
        const layers = Array.isArray(mapped.layers) ? mapped.layers : [];
        const hasLayers = layers.length > 0;

        const layerSpecs: Array<{ kind: string; src: string }> = (
          hasLayers
            ? layers.map((layer, i) => ({ kind: layer.kind || `layer-${i}`, src: layer.src }))
            : mapped.svgSrc
              ? [
                  { kind: "tone", src: mapped.svgSrc },
                  { kind: "line", src: mapped.svgSrc },
                ]
              : []
        ).filter((layer) => !isBackgroundSvgLayer(layer.kind));

        if (!layerSpecs.length) {
          return;
        }

        const maskUrl = (layerSrc: string) => {
          const escaped = layerSrc.replace(/"/g, '\\"');
          return `url("${escaped}")`;
        };

        const layerChildren = layerSpecs.map((layer, layerIndex) => {
          const isTop = layerIndex === layerSpecs.length - 1;
          const classes = ["svg-layer", `svg-layer-${layer.kind}`];
          if (isTop) {
            classes.push("svg-layer-fg");
          }

          const maskValue = maskUrl(layer.src);
          const style = `mask-image: ${maskValue}; -webkit-mask-image: ${maskValue};`;

          const properties: Record<string, any> = {
            className: classes,
            style,
          };
          if (isTop) {
            properties["role"] = "img";
            properties["aria-label"] = originalAlt;
            properties["data-svg-src"] = layer.src;
          } else {
            properties["aria-hidden"] = "true";
          }

          return {
            type: "element",
            tagName: "span",
            properties,
            children: [],
          };
        });

        const cardProps: Record<string, any> = {
          className: ["svg-depth-card", "svg-depth-card--generated"],
        };
        if (mapped.aspectRatio) {
          cardProps.style = `aspect-ratio: ${mapped.aspectRatio};`;
        }

        parent.children[index] = {
          type: "element",
          tagName: "span",
          properties: cardProps,
          children: layerChildren,
        };
        return;
      }

      // We only want to modify figures
      if (node.tagName === "figure") {
        // Handle code blocks generated by rehype-pretty-code
        if (node.properties?.["data-rehype-pretty-code-figure"]) {
          appendClassNames(node, ["not-prose"]);
        }
        // Handle image figures
        else {
          const imageChildren = node.children.filter(
            (child: any) => child.type === "element" && child.tagName === "img"
          );
          const hasImg = imageChildren.length > 0;

          if (hasImg) {
            appendClassNames(node, [
              "mx-auto", // Center the figure block itself
              "flex",
              "flex-col",
              "items-center", // Center the figure's children (img, figcaption)
            ]);

            const figcaption = node.children.find(
              (child: any) =>
                child.type === "element" && child.tagName === "figcaption"
            );

            if (figcaption) {
              figcaption.properties = figcaption.properties || {};
              const classes = Array.isArray(figcaption.properties.className)
                ? figcaption.properties.className
                : [];
              if (!classes.includes("text-center")) {
                classes.push("text-center"); // Center the caption text
              }
              figcaption.properties.className = classes;
            }
          }
        }
      }
    });

    annotateNarrationBlocks(tree, narrationBlockCount);
  };
}

async function getParserPre() {
  return unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkMath)
    .use(remarkFigureCaption)
    .use(remarkRehype, {
      allowDangerousHtml: true,
      handlers: {
        figure: (state: any, node: any) => {
          const figureElement = state.h('figure', state.all(node));
          if (node.caption) {
            figureElement.children.push(
              state.h('figcaption', state.all(node.caption)),
            );
          }
          return figureElement;
        },
      },
    })
    .use(rehypeRaw)
    .use(rehypeKatex)
    // @ts-ignore
    .use(rehypePrettyCode, {
      theme: "one-dark-pro",
      keepBackground: false,
    })
    .use(rehypeSlug)
    .use(rehypeAutolinkHeadings, {
      content: (arg) => ({
        type: "element",
        tagName: "a",
        properties: {
          href: "#" + arg.properties?.id,
          style: "margin-right: 10px",
        },
        children: [],
      }),
    })
    .use(addClasses)
    // @ts-ignore
    .use(rehypeStringify);
}

async function loadPostSvgMap(postId: string): Promise<PostSvgMap | null> {
  const mapPath = join("src/_posts", `${postId}.svg-map.json`);

  let raw: string;
  try {
    raw = await fs.promises.readFile(mapPath, "utf8");
  } catch (err: any) {
    if (err?.code === "ENOENT") {
      return null;
    }
    throw err;
  }

  const parsed = JSON.parse(raw) as Partial<PostSvgMap>;
  if (!Array.isArray(parsed.images)) {
    return null;
  }

  return {
    version: Number(parsed.version || 1),
    postId: String(parsed.postId || postId),
    images: parsed.images,
  };
}

async function loadPostAudioMap(postId: string): Promise<PostAudioMap | null> {
  const mapPath = join("src/_posts", `${postId}.audio-map.json`);

  let raw: string;
  try {
    raw = await fs.promises.readFile(mapPath, "utf8");
  } catch (err: any) {
    if (err?.code === "ENOENT") {
      return null;
    }
    throw err;
  }

  const parsed = JSON.parse(raw) as Partial<PostAudioMap>;
  return {
    version: Number(parsed.version || 1),
    postId: String(parsed.postId || postId),
    narration: parsed.narration || null,
  };
}

async function loadPostAiImageMap(postId: string): Promise<PostAiImageMap | null> {
  const mapPath = join("src/_posts", `${postId}.ai-image-map.json`);

  let raw: string;
  try {
    raw = await fs.promises.readFile(mapPath, "utf8");
  } catch (err: any) {
    if (err?.code === "ENOENT") {
      return null;
    }
    throw err;
  }

  const parsed = JSON.parse(raw) as Partial<PostAiImageMap>;
  if (!Array.isArray(parsed.images)) {
    return null;
  }

  const images = (parsed.images as unknown[]).reduce<PostAiImageEntry[]>((acc, entry) => {
    if (!entry || typeof entry !== "object") {
      return acc;
    }

    const { src, prompt, model } = entry as {
      src?: unknown;
      prompt?: unknown;
      model?: unknown;
    };

    if (typeof src !== "string" || src.length === 0) {
      return acc;
    }

    acc.push({
      src,
      prompt: typeof prompt === "string" && prompt.length > 0 ? prompt : null,
      model: typeof model === "string" && model.length > 0 ? model : null,
    });
    return acc;
  }, []);

  return {
    version: Number(parsed.version || 1),
    postId: String(parsed.postId || postId),
    images,
  };
}

function getPostSvgMap(postId: string) {
  const cached = postSvgMapCache.get(postId);
  if (cached) {
    return cached;
  }

  const pending = loadPostSvgMap(postId).catch((err) => {
    postSvgMapCache.delete(postId);
    console.warn(`[blog-svg-map] Failed to load ${postId}.svg-map.json: ${String(err?.message || err)}`);
    return null;
  });

  postSvgMapCache.set(postId, pending);
  return pending;
}

function getPostAudioMap(postId: string) {
  const cached = postAudioMapCache.get(postId);
  if (cached) {
    return cached;
  }

  const pending = loadPostAudioMap(postId).catch((err) => {
    postAudioMapCache.delete(postId);
    console.warn(`[blog-audio-map] Failed to load ${postId}.audio-map.json: ${String(err?.message || err)}`);
    return null;
  });

  postAudioMapCache.set(postId, pending);
  return pending;
}

function getPostAiImageMap(postId: string) {
  const cached = postAiImageMapCache.get(postId);
  if (cached) {
    return cached;
  }

  const pending = loadPostAiImageMap(postId).catch((err) => {
    postAiImageMapCache.delete(postId);
    console.warn(`[blog-ai-image-map] Failed to load ${postId}.ai-image-map.json: ${String(err?.message || err)}`);
    return null;
  });

  postAiImageMapCache.set(postId, pending);
  return pending;
}

function getValidatedNarration(narration: PostAudioNarration | null | undefined) {
  const audioSrc = narration?.publicAssets?.audioSrc;
  if (typeof audioSrc !== "string" || audioSrc.length === 0) {
    return null;
  }

  if (!fs.existsSync(join("public", audioSrc.replace(/^\//, "")))) {
    return null;
  }

  const transcriptChunks = Array.isArray(narration?.transcript?.chunks)
    ? narration.transcript.chunks
        .filter(
          (chunk): chunk is PostAudioNarrationTranscriptChunk =>
            !!chunk &&
            typeof chunk.text === "string" &&
            chunk.text.length > 0
        )
        .map((chunk) => ({
          text: chunk.text,
          index: typeof chunk.index === "number" ? chunk.index : null,
          startChar: typeof chunk.startChar === "number" ? chunk.startChar : null,
          endChar: typeof chunk.endChar === "number" ? chunk.endChar : null,
          blockStart: typeof chunk.blockStart === "number" ? chunk.blockStart : null,
          blockEnd: typeof chunk.blockEnd === "number" ? chunk.blockEnd : null,
          durationSeconds:
            typeof chunk.durationSeconds === "number" ? chunk.durationSeconds : null,
          startTimeSeconds:
            typeof chunk.startTimeSeconds === "number" ? chunk.startTimeSeconds : null,
          endTimeSeconds:
            typeof chunk.endTimeSeconds === "number" ? chunk.endTimeSeconds : null,
          pauseAfterMs: typeof chunk.pauseAfterMs === "number" ? chunk.pauseAfterMs : null,
          spokenText: typeof chunk.spokenText === "string" ? chunk.spokenText : null,
          segments: Array.isArray(chunk.segments)
            ? chunk.segments
                .filter(
                  (segment): segment is PostAudioNarrationTranscriptChunkSegment =>
                    !!segment &&
                    typeof segment.blockId === "number" &&
                    typeof segment.startChar === "number" &&
                    typeof segment.endChar === "number"
                )
                .map((segment) => ({
                  blockId: segment.blockId ?? null,
                  startChar: segment.startChar ?? null,
                  endChar: segment.endChar ?? null,
                  text: typeof segment.text === "string" ? segment.text : null,
                }))
            : [],
        }))
    : [];

  return {
    audioSrc,
    mimeType: narration?.publicAssets?.mimeType || "audio/mpeg",
    durationSeconds:
      typeof narration?.durationSeconds === "number" ? narration.durationSeconds : null,
    chunkCount: typeof narration?.chunkCount === "number" ? narration.chunkCount : null,
    pauseMs: typeof narration?.pauseMs === "number" ? narration.pauseMs : null,
    language: narration?.language || null,
    model: narration?.model || null,
    transcript:
      typeof narration?.transcript?.text === "string" || transcriptChunks.length > 0
        ? {
            text:
              typeof narration?.transcript?.text === "string"
                ? narration.transcript.text
                : null,
            chunkSeparator:
              typeof narration?.transcript?.chunkSeparator === "string"
                ? narration.transcript.chunkSeparator
                : null,
            chunks: transcriptChunks,
            blockCount:
              typeof narration?.transcript?.blockCount === "number"
                ? narration.transcript.blockCount
                : null,
          }
        : null,
  };
}

function getParser() {
  if (!p) {
    p = getParserPre().catch((e) => {
      p = undefined;
      throw e;
    });
  }
  return p;
}

export async function getPostById(id: string) {
  const realId = id.replace(/\.md$/, "");
  const fullPath = join("src/_posts", `${realId}.md`);
  const { data, content } = matter(
    await fs.promises.readFile(fullPath, "utf8")
  );

  const parser = await getParser();
  const svgMap = await getPostSvgMap(realId);
  const audioMap = await getPostAudioMap(realId);
  const aiImageMap = await getPostAiImageMap(realId);
  const audioNarration = getValidatedNarration(audioMap?.narration);
  const svgMapBySrc = new Map<string, PostSvgMapImageEntry>(
    (svgMap?.images || [])
      .filter((entry) => {
        if (!entry || typeof entry.src !== "string") {
          return false;
        }
        if (entry.status && entry.status !== "ok") {
          return false;
        }
        const hasValidSvg =
          typeof entry.svgSrc === "string" &&
          entry.svgSrc.length > 0 &&
          fs.existsSync(join("public", entry.svgSrc.replace(/^\//, "")));

        const validLayers = Array.isArray(entry.layers)
          ? entry.layers.filter(
              (layer) =>
                layer &&
                typeof layer.src === "string" &&
                layer.src.length > 0 &&
                fs.existsSync(join("public", layer.src.replace(/^\//, "")))
            )
          : [];

        if (!hasValidSvg && !validLayers.length) {
          return false;
        }

        entry.layers = validLayers;

        const aspectSource =
          (validLayers.find((l) => l.kind === "line") || validLayers[0])?.src ||
          entry.svgSrc;
        if (aspectSource) {
          const aspect = readSvgAspectRatio(aspectSource);
          if (aspect) {
            entry.aspectRatio = aspect;
          }
        }
        return true;
      })
      .map((entry) => [entry.src, entry])
  );

  const html = await parser.process({
    value: content,
    data: {
      svgMapBySrc,
      narrationBlockCount:
        audioNarration?.transcript?.chunks?.length
          ? extractNarrationBlocks(content).length
          : 0,
    },
  });

  return {
    ...data,
    title: data.title,
    id: realId,
    date: `${data.date?.toISOString().slice(0, 10)}`,
    coverImage: data.coverImage || null,
    html: html.value.toString(),
    audioNarration,
    aiImagePrompts: aiImageMap?.images || [],
  };
}

export async function getAllPosts() {
  const posts = await Promise.all(
    fs
      .readdirSync("src/_posts")
      .filter((id) => id.endsWith(".md"))
      .map((id) => getPostById(id))
  );
  return posts.sort((post1, post2) => (post1.date > post2.date ? -1 : 1));
}
