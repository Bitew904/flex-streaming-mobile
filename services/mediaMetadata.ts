/**
 * Unified media metadata enrichment
 *
 * Pipeline for video:
 *   1. expo-video-metadata  (light, Mediabunny)
 *   2. FFprobe              (fallback when primary is weak / missing)
 *
 * Pipeline for audio:
 *   1. FFprobe when available
 *   2. otherwise leave MediaLibrary / filename fields unchanged
 */

import { MediaItem } from '@/types/media';
import {
  enrichMediaItemWithFFmpeg,
  isFFmpegAvailable,
  probeMedia,
  type FFmpegMediaInfo,
} from '@/services/ffmpegMetadata';

// =============================================================================
// Types
// =============================================================================

export type MetadataSource = 'expo-video-metadata' | 'ffprobe' | 'none';

export interface VideoMetadataResult {
  duration: number;
  width?: number;
  height?: number;
  fps?: number;
  bitRate?: number;
  codec?: string;
  audioCodec?: string;
  audioSampleRate?: number;
  audioChannels?: number;
  hasAudio?: boolean;
  isHDR?: boolean | null;
  orientation?: string;
  aspectRatio?: number;
  fileSize?: number;
  source: MetadataSource;
}

export interface MetadataBackends {
  expoVideoMetadata: boolean;
  ffmpeg: boolean;
  expoError: string | null;
}

export interface EnrichBatchOptions {
  /** Parallel probes (default 3) */
  concurrency?: number;
  /** Skip items that already look complete (default true) */
  onlyMissing?: boolean;
  onProgress?: (done: number, total: number) => void;
}

// =============================================================================
// Small helpers
// =============================================================================

function asNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = parseFloat(value);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

function asString(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim() !== '') return value.trim();
  return undefined;
}

function asBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

/** True when probe data is useful enough to skip the fallback */
function isUsefulVideoProbe(info: VideoMetadataResult | null): boolean {
  if (!info) return false;
  return info.duration > 0 || info.width != null || !!info.codec;
}

/** True when a library item still needs enrichment */
export function needsEnrichment(item: MediaItem): boolean {
  if (!item.duration || item.duration <= 0) return true;
  if (!item.codec) return true;
  if (item.type === 'video' && !item.resolution) return true;
  return false;
}

// =============================================================================
// Optional native module loaders (safe when package is not linked)
// =============================================================================

type ExpoGetVideoInfo = (
  source: string,
  options?: Record<string, unknown>
) => Promise<unknown>;

interface LazyModule<T> {
  value: T | null;
  attempted: boolean;
  error: string | null;
}

const expoModule: LazyModule<ExpoGetVideoInfo> = {
  value: null,
  attempted: false,
  error: null,
};

function loadExpoGetVideoInfo(): ExpoGetVideoInfo | null {
  if (expoModule.attempted) return expoModule.value;
  expoModule.attempted = true;

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('expo-video-metadata') as {
      getVideoInfoAsync?: ExpoGetVideoInfo;
    };
    expoModule.value = mod.getVideoInfoAsync ?? null;
    if (!expoModule.value) {
      expoModule.error = 'getVideoInfoAsync not exported';
    }
  } catch (e: unknown) {
    expoModule.error = e instanceof Error ? e.message : String(e);
    expoModule.value = null;
  }

  return expoModule.value;
}

export function isExpoVideoMetadataAvailable(): boolean {
  return loadExpoGetVideoInfo() != null;
}

export function getExpoVideoMetadataLoadError(): string | null {
  loadExpoGetVideoInfo();
  return expoModule.error;
}

// =============================================================================
// Mappers
// =============================================================================

function mapExpoResult(raw: unknown): VideoMetadataResult | null {
  if (!raw || typeof raw !== 'object') return null;

  const r = raw as Record<string, unknown>;
  const duration = asNumber(r.duration) ?? 0;
  const width = asNumber(r.width) ?? asNumber(r.displayWidth);
  const height = asNumber(r.height) ?? asNumber(r.displayHeight);

  return {
    duration: duration > 0 ? duration : 0,
    width,
    height,
    fps: asNumber(r.fps) ?? asNumber(r.frameRate),
    bitRate: asNumber(r.bitRate) ?? asNumber(r.bitrate),
    codec: asString(r.codec) ?? asString(r.videoCodec),
    audioCodec: asString(r.audioCodec),
    audioSampleRate: asNumber(r.audioSampleRate),
    audioChannels: asNumber(r.audioChannels),
    hasAudio: asBoolean(r.hasAudio),
    isHDR: (r.isHDR as boolean | null | undefined) ?? null,
    orientation: asString(r.orientation),
    aspectRatio: asNumber(r.aspectRatio),
    fileSize: asNumber(r.fileSize) ?? asNumber(r.size),
    source: 'expo-video-metadata',
  };
}

function mapFFprobeResult(info: FFmpegMediaInfo): VideoMetadataResult {
  return {
    duration: info.duration,
    width: info.width,
    height: info.height,
    fps: info.fps,
    bitRate: info.bitRate,
    codec: info.videoCodec,
    audioCodec: info.audioCodec,
    fileSize: info.size,
    source: 'ffprobe',
  };
}

// =============================================================================
// Probe APIs
// =============================================================================

/** Probe with expo-video-metadata only */
export async function probeVideoWithExpo(
  uri: string
): Promise<VideoMetadataResult | null> {
  const getInfo = loadExpoGetVideoInfo();
  if (!getInfo) return null;

  try {
    const raw = await getInfo(uri, {
      exactDuration: false,
      includeMetadataTags: true,
      includeVideoTracks: true,
      includeAudioTracks: true,
    });
    return mapExpoResult(raw);
  } catch (e) {
    console.warn('[mediaMetadata] expo-video-metadata failed', uri, e);
    return null;
  }
}

/**
 * Video probe with fallback chain:
 * expo-video-metadata → FFprobe → partial expo result (if any)
 */
export async function probeVideo(
  uri: string
): Promise<VideoMetadataResult | null> {
  const primary = await probeVideoWithExpo(uri);
  if (isUsefulVideoProbe(primary)) {
    return primary;
  }

  const secondary = await probeMedia(uri);
  if (secondary) {
    return mapFFprobeResult(secondary);
  }

  return primary;
}

// =============================================================================
// Apply probe → MediaItem
// =============================================================================

function applyVideoMetadata(
  item: MediaItem,
  info: VideoMetadataResult
): MediaItem {
  const next: MediaItem = { ...item };

  if (info.duration > 0 && (!next.duration || next.duration <= 0)) {
    next.duration = info.duration;
  }
  if (info.fileSize != null && next.size == null) {
    next.size = info.fileSize;
  }
  if (info.bitRate != null) {
    next.bitrate = info.bitRate;
  }
  if (info.width != null && info.height != null) {
    next.resolution = `${info.width}x${info.height}`;
  }
  if (info.fps != null) {
    next.fps = Math.round(info.fps * 100) / 100;
  }
  if (info.codec) {
    next.codec = info.codec;
  }

  return next;
}

// =============================================================================
// Public enrich APIs
// =============================================================================

/** Enrich one library item */
export async function enrichMediaItem(item: MediaItem): Promise<MediaItem> {
  if (item.type === 'video') {
    const info = await probeVideo(item.uri);
    return info ? applyVideoMetadata(item, info) : item;
  }

  if (await isFFmpegAvailable()) {
    return enrichMediaItemWithFFmpeg(item);
  }

  return item;
}

/**
 * Concurrent batch enrich.
 * Uses a simple worker pool so progress stays ordered by completion count.
 */
export async function enrichMediaBatch(
  items: MediaItem[],
  options: EnrichBatchOptions = {}
): Promise<MediaItem[]> {
  const { concurrency = 3, onlyMissing = true, onProgress } = options;
  const total = items.length;

  if (total === 0) return [];

  const results = new Array<MediaItem>(total);
  let nextIndex = 0;
  let completed = 0;

  const runOne = async () => {
    while (nextIndex < total) {
      const i = nextIndex++;
      const item = items[i];

      results[i] =
        !onlyMissing || needsEnrichment(item)
          ? await enrichMediaItem(item)
          : item;

      completed += 1;
      onProgress?.(completed, total);
    }
  };

  const poolSize = Math.min(Math.max(1, concurrency), total);
  await Promise.all(Array.from({ length: poolSize }, () => runOne()));

  return results;
}

/** Which backends are linked in this build */
export async function getMetadataBackends(): Promise<MetadataBackends> {
  const [expoVideoMetadata, ffmpeg] = await Promise.all([
    Promise.resolve(isExpoVideoMetadataAvailable()),
    isFFmpegAvailable(),
  ]);

  return {
    expoVideoMetadata,
    ffmpeg,
    expoError: expoModule.error,
  };
}
