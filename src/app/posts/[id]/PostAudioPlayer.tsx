'use client';

import { type CSSProperties, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";

type PostAudioPlayerChunk = {
  index: number | null;
  text: string;
  spokenText?: string | null;
  startChar: number | null;
  endChar: number | null;
  blockStart: number | null;
  blockEnd: number | null;
  durationSeconds: number | null;
  startTimeSeconds: number | null;
  endTimeSeconds: number | null;
  pauseAfterMs: number | null;
  segments?: PostAudioPlayerChunkSegment[] | null;
};

type PostAudioPlayerChunkSegment = {
  blockId: number | null;
  startChar: number | null;
  endChar: number | null;
  text?: string | null;
};

type PostAudioPlayerProps = {
  audioSrc: string;
  title: string;
  chunks?: PostAudioPlayerChunk[] | null;
};

const ARTICLE_SELECTOR = "[data-post-article]";
const IGNORED_NARRATION_SELECTOR = [
  "pre",
  "script",
  "style",
  "img",
  "video",
  "audio",
  "source",
  "svg",
  "figure",
  "figcaption",
  "[aria-hidden=\"true\"]",
  ".katex",
  ".katex-html",
  ".katex-mathml",
].join(", ");
const PLAYBACK_STORAGE_PREFIX = "post-audio-progress:";
const POST_AUDIO_HIGHLIGHT_NAME = "post-audio-active";
const MOBILE_PLAYER_MEDIA_QUERY = "(max-width: 767px)";

type TextBoundary = {
  node: Text;
  offset: number;
};

type MappedNarrationTextRange = {
  start: TextBoundary;
  end: TextBoundary;
};

type MappedNarrationHighlight = {
  ranges: MappedNarrationTextRange[];
};

type NarrationTextIndex = {
  text: string;
  startBoundaries: TextBoundary[];
  endBoundaries: TextBoundary[];
};

type CSSHighlightRegistryLike = {
  set(name: string, value: unknown): void;
  delete(name: string): void;
};

type CSSWithHighlights = typeof CSS & {
  highlights?: CSSHighlightRegistryLike;
};

type WindowWithHighlights = Window & {
  Highlight?: new (...ranges: Range[]) => unknown;
};

function getPostAudioHighlightRegistry() {
  return (globalThis.CSS as CSSWithHighlights | undefined)?.highlights ?? null;
}

function clearPostAudioHighlight() {
  getPostAudioHighlightRegistry()?.delete(POST_AUDIO_HIGHLIGHT_NAME);
}

function clearNativeSelection() {
  const selection = window.getSelection();
  if (!selection) {
    return;
  }

  if (typeof selection.removeAllRanges === "function") {
    selection.removeAllRanges();
    return;
  }

  const legacySelection = selection as Selection & { empty?: () => void };
  legacySelection.empty?.();
}

function formatTime(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return "0:00";
  }

  const totalSeconds = Math.floor(value);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function clampTime(value: number, duration: number) {
  if (!Number.isFinite(value) || value < 0) {
    return 0;
  }

  if (!Number.isFinite(duration) || duration <= 0) {
    return value;
  }

  return Math.min(value, duration);
}

function getCollapsedNarrationReplacement(value: string) {
  return /\s/.test(value) ? " " : value;
}

function normalizeNarrationText(value: string) {
  return value
    .replace(/[“”]/g, "\"")
    .replace(/[‘’]/g, "'")
    .replace(/\u2026/g, "...")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function getNormalizedNarrationReplacement(value: string) {
  if (/\s/.test(value)) {
    return " ";
  }

  if (value === "\u2026") {
    return "...";
  }

  if (value === "“" || value === "”") {
    return "\"";
  }

  if (value === "‘" || value === "’") {
    return "'";
  }

  return value.toLowerCase();
}

function shouldIgnoreNarrationTextNode(root: HTMLElement, node: Text) {
  const parent = node.parentElement;
  if (!parent) {
    return true;
  }

  const ignoredAncestor = parent.closest(IGNORED_NARRATION_SELECTOR);
  return !!ignoredAncestor && root.contains(ignoredAncestor);
}

function trimNarrationTextIndex(index: NarrationTextIndex): NarrationTextIndex {
  let startIndex = 0;
  while (startIndex < index.text.length && index.text[startIndex] === " ") {
    startIndex += 1;
  }

  let endIndex = index.text.length;
  while (endIndex > startIndex && index.text[endIndex - 1] === " ") {
    endIndex -= 1;
  }

  return {
    text: index.text.slice(startIndex, endIndex),
    startBoundaries: index.startBoundaries.slice(startIndex, endIndex),
    endBoundaries: index.endBoundaries.slice(startIndex, endIndex),
  };
}

function buildNarrationTextIndex(root: HTMLElement): NarrationTextIndex {
  const characters: string[] = [];
  const startBoundaries: TextBoundary[] = [];
  const endBoundaries: TextBoundary[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);

  let current = walker.nextNode();
  while (current) {
    const textNode = current as Text;
    const rawText = textNode.textContent || "";

    if (!shouldIgnoreNarrationTextNode(root, textNode) && rawText.length > 0) {
      for (let offset = 0; offset < rawText.length; offset += 1) {
        const replacement = getCollapsedNarrationReplacement(rawText[offset]);
        const start = { node: textNode, offset };
        const end = { node: textNode, offset: offset + 1 };

        if (replacement === " ") {
          if (characters.length === 0) {
            continue;
          }

          const lastIndex = characters.length - 1;
          if (characters[lastIndex] !== " ") {
            characters.push(" ");
            startBoundaries.push(start);
            endBoundaries.push(end);
          }
          continue;
        }

        characters.push(replacement);
        startBoundaries.push(start);
        endBoundaries.push(end);
      }
    }

    current = walker.nextNode();
  }

  return trimNarrationTextIndex({
    text: characters.join(""),
    startBoundaries,
    endBoundaries,
  });
}

function buildLegacyNarrationTextIndex(root: HTMLElement): NarrationTextIndex {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const characters: string[] = [];
  const startBoundaries: TextBoundary[] = [];
  const endBoundaries: TextBoundary[] = [];

  let current = walker.nextNode();
  while (current) {
    const textNode = current as Text;
    const rawText = textNode.textContent || "";

    if (!shouldIgnoreNarrationTextNode(root, textNode) && rawText.length > 0) {
      for (let offset = 0; offset < rawText.length; offset += 1) {
        const replacement = getNormalizedNarrationReplacement(rawText[offset]);
        const start = { node: textNode, offset };
        const end = { node: textNode, offset: offset + 1 };

        if (replacement === " ") {
          if (characters.length === 0) {
            continue;
          }

          const lastIndex = characters.length - 1;
          if (characters[lastIndex] !== " ") {
            characters.push(" ");
            startBoundaries.push(start);
            endBoundaries.push(end);
          }
          continue;
        }

        for (const normalizedCharacter of replacement) {
          characters.push(normalizedCharacter);
          startBoundaries.push(start);
          endBoundaries.push(end);
        }
      }
    }

    current = walker.nextNode();
  }

  return trimNarrationTextIndex({
    text: characters.join(""),
    startBoundaries,
    endBoundaries,
  });
}

function buildNarrationBlockIndices(root: HTMLElement) {
  const groupedElements = new Map<number, HTMLElement[]>();
  const elements = root.querySelectorAll<HTMLElement>("[data-narration-block]");

  elements.forEach((element) => {
    const rawBlockId = element.dataset.narrationBlock;
    const blockId = rawBlockId ? Number(rawBlockId) : Number.NaN;
    if (!Number.isFinite(blockId)) {
      return;
    }

    const existing = groupedElements.get(blockId);
    if (existing) {
      existing.push(element);
    } else {
      groupedElements.set(blockId, [element]);
    }
  });

  const blockIndices = new Map<number, NarrationTextIndex>();
  for (const [blockId, blockElements] of groupedElements.entries()) {
    const characters: string[] = [];
    const startBoundaries: TextBoundary[] = [];
    const endBoundaries: TextBoundary[] = [];

    blockElements.forEach((element) => {
      const blockIndex = buildNarrationTextIndex(element);
      if (characters.length > 0 && blockIndex.text.length > 0 && characters[characters.length - 1] !== " ") {
        const boundary = blockIndex.startBoundaries[0];
        if (boundary) {
          characters.push(" ");
          startBoundaries.push(boundary);
          endBoundaries.push(boundary);
        }
      }

      characters.push(...blockIndex.text.split(""));
      startBoundaries.push(...blockIndex.startBoundaries);
      endBoundaries.push(...blockIndex.endBoundaries);
    });

    blockIndices.set(
      blockId,
      trimNarrationTextIndex({
        text: characters.join(""),
        startBoundaries,
        endBoundaries,
      })
    );
  }

  return blockIndices;
}

function buildMappedNarrationHighlight(
  index: NarrationTextIndex,
  startChar: number,
  endChar: number
): MappedNarrationHighlight | null {
  if (startChar < 0 || endChar > index.text.length || endChar <= startChar) {
    return null;
  }

  const ranges: MappedNarrationTextRange[] = [];
  let currentRange: MappedNarrationTextRange | null = null;

  for (let charIndex = startChar; charIndex < endChar; charIndex += 1) {
    const startBoundary = index.startBoundaries[charIndex];
    const endBoundary = index.endBoundaries[charIndex];
    if (!startBoundary || !endBoundary) {
      continue;
    }

    // Split at text-node boundaries so the highlight never spans over ignored DOM like
    // images, diagrams, or KaTeX nodes sitting between narratable text fragments.
    if (startBoundary.node !== endBoundary.node) {
      if (currentRange) {
        ranges.push(currentRange);
        currentRange = null;
      }
      continue;
    }

    if (
      currentRange &&
      currentRange.end.node === startBoundary.node &&
      currentRange.end.offset === startBoundary.offset
    ) {
      currentRange.end = endBoundary;
      continue;
    }

    if (currentRange) {
      ranges.push(currentRange);
    }
    currentRange = {
      start: startBoundary,
      end: endBoundary,
    };
  }

  if (currentRange) {
    ranges.push(currentRange);
  }

  return ranges.length > 0 ? { ranges } : null;
}

function mapChunkSegmentsToNarrationHighlight(
  blockIndices: Map<number, NarrationTextIndex>,
  chunk: PostAudioPlayerChunk,
  audioSrc: string
) {
  if (!Array.isArray(chunk.segments) || chunk.segments.length === 0) {
    return null;
  }

  const ranges: MappedNarrationTextRange[] = [];

  for (const segment of chunk.segments) {
    const blockId = segment.blockId;
    const startChar = segment.startChar;
    const endChar = segment.endChar;
    if (
      typeof blockId !== "number" ||
      typeof startChar !== "number" ||
      typeof endChar !== "number" ||
      endChar <= startChar
    ) {
      return null;
    }

    const blockIndex = blockIndices.get(blockId);
    if (!blockIndex || startChar < 0 || endChar > blockIndex.text.length) {
      return null;
    }

    if (
      process.env.NODE_ENV !== "production" &&
      typeof segment.text === "string" &&
      blockIndex.text.slice(startChar, endChar) !== segment.text
    ) {
      console.warn(
        `[post-audio] Segment text mismatch for block ${blockId} in ${audioSrc}`
      );
    }

    const segmentHighlight = buildMappedNarrationHighlight(blockIndex, startChar, endChar);
    if (!segmentHighlight) {
      return null;
    }

    ranges.push(...segmentHighlight.ranges);
  }

  return ranges.length > 0 ? { ranges } : null;
}

function mapLegacyChunksToNarrationRanges(root: HTMLElement, chunks: PostAudioPlayerChunk[]) {
  if (chunks.length === 0) {
    return [];
  }

  const narrationIndex = buildLegacyNarrationTextIndex(root);
  const mappedRanges: Array<MappedNarrationHighlight | null> = [];
  let searchCursor = 0;

  for (const chunk of chunks) {
    const normalizedChunkText = normalizeNarrationText(chunk.text || "");
    if (!normalizedChunkText) {
      mappedRanges.push(null);
      continue;
    }

    const startIndex = narrationIndex.text.indexOf(normalizedChunkText, searchCursor);
    if (startIndex === -1) {
      mappedRanges.push(null);
      continue;
    }

    const endIndex = startIndex + normalizedChunkText.length;
    mappedRanges.push(buildMappedNarrationHighlight(narrationIndex, startIndex, endIndex));
    searchCursor = endIndex;
  }

  return mappedRanges;
}

function getActiveChunkIndex(chunks: PostAudioPlayerChunk[], currentTime: number) {
  if (!Number.isFinite(currentTime) || currentTime < 0 || chunks.length === 0) {
    return null;
  }

  for (let index = 0; index < chunks.length; index += 1) {
    const chunk = chunks[index];
    const startTime = chunk.startTimeSeconds;
    if (typeof startTime !== "number") {
      continue;
    }

    const nextStartTime = chunks[index + 1]?.startTimeSeconds;
    const fallbackEnd =
      chunk.endTimeSeconds ??
      (typeof chunk.durationSeconds === "number" ? startTime + chunk.durationSeconds : null);
    const endTime =
      typeof nextStartTime === "number"
        ? nextStartTime
        : typeof fallbackEnd === "number"
          ? fallbackEnd
          : Number.POSITIVE_INFINITY;

    if (currentTime >= startTime && currentTime < endTime) {
      return index;
    }
  }

  return null;
}
export default function PostAudioPlayer({ audioSrc, title, chunks }: PostAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const restoredPlaybackRef = useRef(false);
  const persistedTimeRef = useRef(0);
  const controlsId = useId();
  const safeChunks = useMemo(() => (Array.isArray(chunks) ? chunks : []), [chunks]);
  const playbackStorageKey = useMemo(
    () => `${PLAYBACK_STORAGE_PREFIX}${audioSrc}`,
    [audioSrc]
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [activeChunkIndex, setActiveChunkIndex] = useState<number | null>(null);
  const [mappedChunkRanges, setMappedChunkRanges] = useState<Array<MappedNarrationHighlight | null>>([]);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const hasPlaybackPosition = currentTime > 0;
  const isCollapsed = isMobileViewport && isMinimized;
  const progressPercent = duration > 0 ? Math.min((currentTime / duration) * 100, 100) : 0;
  const scrubberStyle = {
    "--post-audio-progress": `${progressPercent}%`,
  } as CSSProperties;

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }

    const mediaQuery = window.matchMedia(MOBILE_PLAYER_MEDIA_QUERY);
    const syncViewportState = () => {
      setIsMobileViewport(mediaQuery.matches);
      if (!mediaQuery.matches) {
        setIsMinimized(false);
      }
    };

    syncViewportState();
    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", syncViewportState);
    } else {
      mediaQuery.addListener(syncViewportState);
    }

    return () => {
      if (typeof mediaQuery.removeEventListener === "function") {
        mediaQuery.removeEventListener("change", syncViewportState);
      } else {
        mediaQuery.removeListener(syncViewportState);
      }
    };
  }, []);

  const readStoredPlaybackTime = useCallback(() => {
    try {
      const storedValue = window.localStorage.getItem(playbackStorageKey);
      if (storedValue === null) {
        return null;
      }

      const parsedValue = Number(storedValue);
      return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : null;
    } catch {
      return null;
    }
  }, [playbackStorageKey]);

  const persistStoredPlaybackTime = useCallback((
    value: number,
    maxDuration = Number.POSITIVE_INFINITY
  ) => {
    const nextTime = clampTime(value, maxDuration);
    persistedTimeRef.current = nextTime;

    try {
      if (nextTime > 0) {
        window.localStorage.setItem(playbackStorageKey, String(nextTime));
      } else {
        window.localStorage.removeItem(playbackStorageKey);
      }
    } catch {
      // Ignore storage failures and continue using in-memory state.
    }
  }, [playbackStorageKey]);

  const clearStoredPlaybackTime = useCallback(() => {
    persistedTimeRef.current = 0;

    try {
      window.localStorage.removeItem(playbackStorageKey);
    } catch {
      // Ignore storage failures and continue using in-memory state.
    }
  }, [playbackStorageKey]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    restoredPlaybackRef.current = false;
    persistedTimeRef.current = 0;

    const restorePlaybackTime = () => {
      if (restoredPlaybackRef.current) {
        return;
      }

      const storedTime = readStoredPlaybackTime();
      restoredPlaybackRef.current = true;

      if (storedTime === null) {
        return;
      }

      const maxSeekTime =
        Number.isFinite(audio.duration) && audio.duration > 0
          ? Math.max(audio.duration - 0.25, 0)
          : storedTime;
      const nextTime = clampTime(storedTime, maxSeekTime);
      if (nextTime <= 0) {
        return;
      }

      audio.currentTime = nextTime;
      persistStoredPlaybackTime(nextTime, audio.duration);
    };

    const syncState = () => {
      const nextTime = Number.isFinite(audio.currentTime) ? audio.currentTime : 0;
      const nextDuration = Number.isFinite(audio.duration) ? audio.duration : 0;
      setCurrentTime(nextTime);
      setDuration(nextDuration);
      setActiveChunkIndex(getActiveChunkIndex(safeChunks, nextTime));
    };

    const handleLoadedMetadata = () => {
      restorePlaybackTime();
      syncState();
    };
    const handleTimeUpdate = () => {
      syncState();
      if (Math.abs(audio.currentTime - persistedTimeRef.current) >= 0.5) {
        persistStoredPlaybackTime(audio.currentTime, audio.duration);
      }
    };
    const handlePlay = () => {
      setIsPlaying(true);
      syncState();
    };
    const handlePause = () => {
      setIsPlaying(false);
      syncState();
      persistStoredPlaybackTime(audio.currentTime, audio.duration);
    };
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      setActiveChunkIndex(null);
      audio.currentTime = 0;
      clearStoredPlaybackTime();
    };

    restorePlaybackTime();
    syncState();
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("durationchange", handleLoadedMetadata);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("seeking", handleTimeUpdate);
    audio.addEventListener("seeked", handleTimeUpdate);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("durationchange", handleLoadedMetadata);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("seeking", handleTimeUpdate);
      audio.removeEventListener("seeked", handleTimeUpdate);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [
    clearStoredPlaybackTime,
    persistStoredPlaybackTime,
    playbackStorageKey,
    readStoredPlaybackTime,
    safeChunks,
  ]);

  useEffect(() => {
    const article = document.querySelector(ARTICLE_SELECTOR);
    if (!(article instanceof HTMLElement)) {
      setMappedChunkRanges([]);
      return;
    }

    const blockIndices = buildNarrationBlockIndices(article);
    const nextMappedRanges = safeChunks.map((chunk) => {
      const mappedFromSegments = mapChunkSegmentsToNarrationHighlight(blockIndices, chunk, audioSrc);
      if (mappedFromSegments) {
        return mappedFromSegments;
      }

      return mapLegacyChunksToNarrationRanges(article, [chunk])[0] ?? null;
    });
    setMappedChunkRanges(nextMappedRanges);

    if (process.env.NODE_ENV !== "production") {
      nextMappedRanges.forEach((range, index) => {
        if (!range) {
          console.warn(
            `[post-audio] Failed to map chunk ${index + 1} for ${audioSrc}`
          );
        }
      });
    }
  }, [audioSrc, safeChunks]);

  useEffect(() => {
    const highlightRegistry = getPostAudioHighlightRegistry();
    const HighlightConstructor = (window as WindowWithHighlights).Highlight;
    if (!highlightRegistry || typeof HighlightConstructor !== "function") {
      return;
    }

    if (activeChunkIndex === null || !hasPlaybackPosition) {
      clearPostAudioHighlight();
      clearNativeSelection();
      return;
    }

    const mappedHighlight = mappedChunkRanges[activeChunkIndex];
    if (!mappedHighlight || mappedHighlight.ranges.length === 0) {
      clearPostAudioHighlight();
      clearNativeSelection();
      return;
    }

    clearNativeSelection();

    const ranges = mappedHighlight.ranges.map((mappedRange) => {
      const range = document.createRange();
      range.setStart(mappedRange.start.node, mappedRange.start.offset);
      range.setEnd(mappedRange.end.node, mappedRange.end.offset);
      return range;
    });
    highlightRegistry.set(POST_AUDIO_HIGHLIGHT_NAME, new HighlightConstructor(...ranges));

    return () => {
      clearPostAudioHighlight();
      clearNativeSelection();
    };
  }, [activeChunkIndex, hasPlaybackPosition, mappedChunkRanges]);

  const handleTogglePlayback = async () => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    if (!audio.paused) {
      audio.pause();
      return;
    }

    if (audio.ended) {
      audio.currentTime = 0;
    }

    if (audio.currentTime <= 0.01 && !audio.ended) {
      const resumeTime =
        persistedTimeRef.current > 0 ? persistedTimeRef.current : readStoredPlaybackTime();
      if (resumeTime && resumeTime > 0) {
        const nextTime = clampTime(resumeTime, audio.duration);
        audio.currentTime = nextTime;
        setCurrentTime(nextTime);
        setActiveChunkIndex(getActiveChunkIndex(safeChunks, nextTime));
      }
    }

    try {
      await audio.play();
    } catch {
      setIsPlaying(false);
    }
  };

  const handleStop = () => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    const nextTime = Number.isFinite(audio.currentTime) ? audio.currentTime : currentTime;
    audio.pause();
    setIsPlaying(false);
    setCurrentTime(nextTime);
    setActiveChunkIndex(getActiveChunkIndex(safeChunks, nextTime));
    persistStoredPlaybackTime(nextTime, audio.duration);
  };

  const handleSeek = (value: string) => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    const parsedValue = Number(value);
    if (!Number.isFinite(parsedValue)) {
      return;
    }

    const nextTime = clampTime(parsedValue, duration);
    audio.currentTime = nextTime;
    setCurrentTime(nextTime);
    setActiveChunkIndex(getActiveChunkIndex(safeChunks, nextTime));
    persistStoredPlaybackTime(nextTime, audio.duration);
  };

  const handleToggleMinimized = () => {
    if (!isMobileViewport) {
      return;
    }

    setIsMinimized((current) => !current);
  };

  return (
    <div
      className={`post-audio-player${isCollapsed ? " is-minimized" : ""}`}
      aria-label={`Audio narration for ${title}`}
    >
      <div className="post-audio-player-panel">
        {isCollapsed ? (
          <button
            type="button"
            className="post-audio-player-minimize post-audio-player-minimize-collapsed"
            onClick={handleToggleMinimized}
            aria-expanded={false}
            aria-label="Expand blog audio controls"
          >
            {"<"}
          </button>
        ) : (
          <>
            <div className="terminal-header post-audio-player-header">
              <div className="post-audio-player-header-main">
                <span className="terminal-header-text post-audio-player-title">BLOG AUDIO</span>
                <span className="post-audio-player-time">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>
              {isMobileViewport ? (
                <button
                  type="button"
                  className="post-audio-player-minimize"
                  onClick={handleToggleMinimized}
                  aria-expanded
                  aria-controls={controlsId}
                  aria-label="Minimize blog audio controls"
                >
                  {">"}
                </button>
              ) : null}
            </div>
            <div className="post-audio-player-body" id={controlsId}>
              <div className="post-audio-player-scrubber-shell" style={scrubberStyle}>
                <div className="post-audio-player-scrubber-track">
                  <input
                    type="range"
                    min={0}
                    max={duration || 0}
                    step="0.1"
                    value={clampTime(currentTime, duration)}
                    onChange={(event) => handleSeek(event.target.value)}
                    className="post-audio-player-scrubber-input"
                    aria-label="Seek blog narration"
                    aria-valuemin={0}
                    aria-valuemax={duration || 0}
                    aria-valuenow={clampTime(currentTime, duration)}
                    aria-valuetext={`${formatTime(currentTime)} of ${formatTime(duration)}`}
                    disabled={duration <= 0}
                  />
                </div>
              </div>
            </div>
            <div className="post-audio-player-controls boombox-controls play-pause play-pause-wide">
              <button
                type="button"
                aria-label={isPlaying ? "Pause blog narration" : "Play blog narration"}
                className={`boombox-button ${isPlaying ? "active" : "inactive"}`}
                onClick={handleTogglePlayback}
              >
                {isPlaying ? "❚❚" : "▶"}
              </button>
              <button
                type="button"
                aria-label="Stop blog narration"
                className={`boombox-button ${!isPlaying && currentTime === 0 ? "active" : "inactive"}`}
                onClick={handleStop}
              >
                ■
              </button>
            </div>
          </>
        )}
      </div>
      <audio ref={audioRef} preload="metadata" src={audioSrc} />
    </div>
  );
}
