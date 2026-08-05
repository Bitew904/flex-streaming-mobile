/**
 * FFmpeg / FFprobe metadata extraction
 * ------------------------------------
 * Uses FFprobeKit (from ffmpeg-kit-react-native) to read rich media info:
 * duration, codecs, bitrate, resolution, fps, audio channels, tags (artist/album/…).
 *
 * Requires a development build with the native module linked.
 * In Expo Go or if the module is missing, all calls return null / partial data.
 */

import { Platform } from 'react-native';
import { MediaItem } from '@/types/media';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FFmpegStreamInfo {
  index: number;
  codecType: 'video' | 'audio' | 'subtitle' | 'data' | 'unknown';
  codecName?: string;
  codecLongName?: string;
  width?: number;
  height?: number;
  fps?: number;
  bitRate?: number;
  sampleRate?: number;
  channels?: number;
  channelLayout?: string;
  language?: string;
  tags?: Record<string, string>;
}

export interface FFmpegMediaInfo {
  formatName?: string;
  formatLongName?: string;
  duration: number; // seconds
  size?: number;
  bitRate?: number;
  tags?: Record<string, string>;
  streams: FFmpegStreamInfo[];
  // Convenience
  videoCodec?: string;
  audioCodec?: string;
  resolution?: string;
  fps?: number;
  width?: number;
  height?: number;
}

// ---------------------------------------------------------------------------
// Dynamic import – safe when native module is not linked
// ---------------------------------------------------------------------------

type FFprobeKitType = {
  getMediaInformation: (path: string) => Promise<any>;
};

let FFprobeKit: FFprobeKitType | null = null;
let loadAttempted = false;
let loadError: string | null = null;

async function loadFFprobe(): Promise<FFprobeKitType | null> {
  if (loadAttempted) return FFprobeKit;
  loadAttempted = true;

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('ffmpeg-kit-react-native');
    FFprobeKit = mod.FFprobeKit ?? null;
    if (!FFprobeKit) {
      loadError = 'FFprobeKit export not found';
    }
  } catch (e: any) {
    loadError = e?.message ?? String(e);
    FFprobeKit = null;
  }

  return FFprobeKit;
}

/** Whether the native FFmpeg module is available in this build */
export async function isFFmpegAvailable(): Promise<boolean> {
  const kit = await loadFFprobe();
  return kit != null;
}

export function getFFmpegLoadError(): string | null {
  return loadError;
}

// ---------------------------------------------------------------------------
// Path helpers
// ---------------------------------------------------------------------------

/**
 * FFprobe generally wants a plain filesystem path or a content URI.
 * Strip file:// where needed; keep content:// as-is on Android.
 */
function normalizePathForFFprobe(uri: string): string {
  if (!uri) return uri;

  if (Platform.OS === 'android') {
    if (uri.startsWith('file://')) {
      return decodeURIComponent(uri.replace('file://', ''));
    }
    // content:// and other schemes – pass through
    return uri;
  }

  // iOS
  if (uri.startsWith('file://')) {
    return decodeURIComponent(uri.replace('file://', ''));
  }
  return uri;
}

// ---------------------------------------------------------------------------
// Parse FFprobe session → structured info
// ---------------------------------------------------------------------------

function parseMediaInformation(information: any): FFmpegMediaInfo | null {
  if (!information) return null;

  try {
    const durationStr =
      information.getDuration?.() ??
      information.getDurationProperties?.()?.getNumberProperty?.('duration') ??
      information.getStringProperty?.('duration');

    let duration = 0;
    if (typeof durationStr === 'number') {
      duration = durationStr;
    } else if (typeof durationStr === 'string') {
      duration = parseFloat(durationStr) || 0;
    }

    // Some builds return duration in milliseconds via getDuration()
    // FFprobeKit getDuration() is typically in milliseconds
    if (duration > 1000 && duration === Math.floor(duration)) {
      // Heuristic: integer > 1000 is likely ms
      const asSeconds = duration / 1000;
      // Prefer seconds if it looks like ms for a reasonable media length
      if (asSeconds < 86400) duration = asSeconds;
    }

    const format = information.getFormat?.() ?? information.getStringProperty?.('format_name');
    const formatLong =
      information.getFormatLongName?.() ??
      information.getStringProperty?.('format_long_name');

    const sizeStr =
      information.getSize?.() ?? information.getStringProperty?.('size');
    const size = sizeStr != null ? parseInt(String(sizeStr), 10) : undefined;

    const bitRateStr =
      information.getBitrate?.() ?? information.getStringProperty?.('bit_rate');
    const bitRate = bitRateStr != null ? parseInt(String(bitRateStr), 10) : undefined;

    // Tags
    const tags: Record<string, string> = {};
    try {
      const allProps = information.getAllProperties?.() ?? information.getTags?.();
      if (allProps && typeof allProps === 'object') {
        // getAllProperties may nest under "format" / "streams"
        const formatTags =
          allProps.format?.tags ?? allProps.tags ?? allProps;
        if (formatTags && typeof formatTags === 'object') {
          for (const [k, v] of Object.entries(formatTags)) {
            if (typeof v === 'string' || typeof v === 'number') {
              tags[k.toLowerCase()] = String(v);
            }
          }
        }
      }
    } catch {
      // ignore tag parse errors
    }

    // Streams
    const streams: FFmpegStreamInfo[] = [];
    let streamsArray: any[] = [];

    try {
      streamsArray =
        information.getStreams?.() ??
        information.getAllProperties?.()?.streams ??
        [];
    } catch {
      streamsArray = [];
    }

    if (Array.isArray(streamsArray)) {
      streamsArray.forEach((s: any, index: number) => {
        const codecTypeRaw =
          s.getType?.() ?? s.getStringProperty?.('codec_type') ?? s.codec_type ?? 'unknown';
        const codecType = String(codecTypeRaw).toLowerCase() as FFmpegStreamInfo['codecType'];

        const codecName =
          s.getCodec?.() ?? s.getStringProperty?.('codec_name') ?? s.codec_name;
        const codecLongName =
          s.getCodecLongName?.() ??
          s.getStringProperty?.('codec_long_name') ??
          s.codec_long_name;

        const width =
          s.getWidth?.() ??
          numberProp(s, 'width') ??
          (s.width != null ? Number(s.width) : undefined);
        const height =
          s.getHeight?.() ??
          numberProp(s, 'height') ??
          (s.height != null ? Number(s.height) : undefined);

        // FPS from avg_frame_rate or r_frame_rate ("30/1")
        let fps: number | undefined;
        const fpsRaw =
          s.getAverageFrameRate?.() ??
          s.getStringProperty?.('avg_frame_rate') ??
          s.avg_frame_rate ??
          s.getStringProperty?.('r_frame_rate') ??
          s.r_frame_rate;
        if (fpsRaw) {
          fps = parseFrameRate(String(fpsRaw));
        }

        const bitRateStream =
          numberProp(s, 'bit_rate') ??
          (s.bit_rate != null ? Number(s.bit_rate) : undefined);

        const sampleRate =
          numberProp(s, 'sample_rate') ??
          (s.sample_rate != null ? Number(s.sample_rate) : undefined);

        const channels =
          s.getChannelCount?.() ??
          numberProp(s, 'channels') ??
          (s.channels != null ? Number(s.channels) : undefined);

        const channelLayout =
          s.getChannelLayout?.() ??
          s.getStringProperty?.('channel_layout') ??
          s.channel_layout;

        streams.push({
          index: s.getIndex?.() ?? s.index ?? index,
          codecType:
            codecType === 'video' ||
            codecType === 'audio' ||
            codecType === 'subtitle'
              ? codecType
              : 'unknown',
          codecName: codecName ? String(codecName) : undefined,
          codecLongName: codecLongName ? String(codecLongName) : undefined,
          width,
          height,
          fps,
          bitRate: bitRateStream,
          sampleRate,
          channels,
          channelLayout: channelLayout ? String(channelLayout) : undefined,
        });
      });
    }

    const videoStream = streams.find((s) => s.codecType === 'video');
    const audioStream = streams.find((s) => s.codecType === 'audio');

    const width = videoStream?.width;
    const height = videoStream?.height;

    return {
      formatName: format ? String(format) : undefined,
      formatLongName: formatLong ? String(formatLong) : undefined,
      duration: Number.isFinite(duration) ? duration : 0,
      size: Number.isFinite(size as number) ? size : undefined,
      bitRate: Number.isFinite(bitRate as number) ? bitRate : undefined,
      tags,
      streams,
      videoCodec: videoStream?.codecName,
      audioCodec: audioStream?.codecName,
      resolution:
        width && height ? `${width}x${height}` : undefined,
      fps: videoStream?.fps,
      width,
      height,
    };
  } catch (e) {
    console.warn('[FFmpeg] parseMediaInformation failed', e);
    return null;
  }
}

function numberProp(obj: any, key: string): number | undefined {
  try {
    const v =
      obj.getNumberProperty?.(key) ??
      obj.getStringProperty?.(key) ??
      obj[key];
    if (v == null) return undefined;
    const n = typeof v === 'number' ? v : parseFloat(String(v));
    return Number.isFinite(n) ? n : undefined;
  } catch {
    return undefined;
  }
}

function parseFrameRate(raw: string): number | undefined {
  if (!raw || raw === '0/0') return undefined;
  if (raw.includes('/')) {
    const [a, b] = raw.split('/').map(Number);
    if (b && Number.isFinite(a) && Number.isFinite(b)) return a / b;
  }
  const n = parseFloat(raw);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Probe a local media file / content URI with FFprobe.
 * Returns null if FFmpeg is unavailable or probing fails.
 */
export async function probeMedia(uri: string): Promise<FFmpegMediaInfo | null> {
  const kit = await loadFFprobe();
  if (!kit) return null;

  const path = normalizePathForFFprobe(uri);

  try {
    const session = await kit.getMediaInformation(path);
    const information = await session.getMediaInformation?.();
    if (!information) {
      // Fallback: some versions put data on the session differently
      const output = await session.getOutput?.();
      if (output) {
        try {
          const json = JSON.parse(output);
          return parseJsonProbe(json);
        } catch {
          // ignore
        }
      }
      return null;
    }
    return parseMediaInformation(information);
  } catch (e) {
    console.warn('[FFmpeg] probeMedia failed for', uri, e);
    return null;
  }
}

/** Parse raw ffprobe JSON (-print_format json) */
function parseJsonProbe(json: any): FFmpegMediaInfo | null {
  if (!json) return null;

  const format = json.format ?? {};
  const duration = parseFloat(format.duration ?? '0') || 0;
  const size = format.size != null ? parseInt(format.size, 10) : undefined;
  const bitRate = format.bit_rate != null ? parseInt(format.bit_rate, 10) : undefined;

  const tags: Record<string, string> = {};
  if (format.tags && typeof format.tags === 'object') {
    for (const [k, v] of Object.entries(format.tags)) {
      tags[k.toLowerCase()] = String(v);
    }
  }

  const streams: FFmpegStreamInfo[] = (json.streams ?? []).map(
    (s: any, index: number) => ({
      index: s.index ?? index,
      codecType: (s.codec_type as FFmpegStreamInfo['codecType']) ?? 'unknown',
      codecName: s.codec_name,
      codecLongName: s.codec_long_name,
      width: s.width,
      height: s.height,
      fps: parseFrameRate(s.avg_frame_rate || s.r_frame_rate || ''),
      bitRate: s.bit_rate != null ? parseInt(s.bit_rate, 10) : undefined,
      sampleRate: s.sample_rate != null ? parseInt(s.sample_rate, 10) : undefined,
      channels: s.channels,
      channelLayout: s.channel_layout,
      language: s.tags?.language,
    })
  );

  const videoStream = streams.find((s) => s.codecType === 'video');
  const audioStream = streams.find((s) => s.codecType === 'audio');

  return {
    formatName: format.format_name,
    formatLongName: format.format_long_name,
    duration,
    size,
    bitRate,
    tags,
    streams,
    videoCodec: videoStream?.codecName,
    audioCodec: audioStream?.codecName,
    resolution:
      videoStream?.width && videoStream?.height
        ? `${videoStream.width}x${videoStream.height}`
        : undefined,
    fps: videoStream?.fps,
    width: videoStream?.width,
    height: videoStream?.height,
  };
}

/**
 * Enrich a MediaItem with FFprobe metadata (mutates a copy).
 * Safe to call when FFmpeg is not available – returns the original item.
 */
export async function enrichMediaItemWithFFmpeg(
  item: MediaItem
): Promise<MediaItem> {
  const info = await probeMedia(item.uri);
  if (!info) return item;

  const next: MediaItem = { ...item };

  if (info.duration > 0 && (!next.duration || next.duration <= 0)) {
    next.duration = info.duration;
  }
  if (info.size && !next.size) next.size = info.size;
  if (info.bitRate) next.bitrate = info.bitRate;
  if (info.resolution) next.resolution = info.resolution;
  if (info.fps) next.fps = Math.round(info.fps * 100) / 100;
  if (info.videoCodec) next.codec = info.videoCodec;
  else if (info.audioCodec && item.type === 'audio') next.codec = info.audioCodec;

  // Tags → artist / album / title / genre / year
  const t = info.tags ?? {};
  if (t.title && t.title.trim()) next.title = t.title.trim();
  if (t.artist || t.album_artist) {
    next.artist = (t.artist || t.album_artist).trim();
  }
  if (t.album) next.album = t.album.trim();
  if (t.genre) next.genre = t.genre.trim();
  if (t.date || t.year) {
    const y = parseInt((t.date || t.year).slice(0, 4), 10);
    if (Number.isFinite(y)) next.year = y;
  }

  return next;
}

/**
 * Enrich many items with concurrency limit (default 3).
 * Reports progress via optional callback.
 */
export async function enrichMediaBatch(
  items: MediaItem[],
  options?: {
    concurrency?: number;
    onProgress?: (done: number, total: number) => void;
    /** Only probe items missing duration / codec */
    onlyMissing?: boolean;
  }
): Promise<MediaItem[]> {
  const concurrency = options?.concurrency ?? 3;
  const onlyMissing = options?.onlyMissing ?? true;
  const total = items.length;
  const results = new Array<MediaItem>(total);
  let done = 0;
  let index = 0;

  async function worker() {
    while (index < total) {
      const i = index++;
      const item = items[i];

      const needsProbe =
        !onlyMissing ||
        !item.duration ||
        item.duration <= 0 ||
        !item.codec ||
        (item.type === 'video' && !item.resolution);

      if (needsProbe) {
        results[i] = await enrichMediaItemWithFFmpeg(item);
      } else {
        results[i] = item;
      }

      done += 1;
      options?.onProgress?.(done, total);
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, total) },
    () => worker()
  );
  await Promise.all(workers);
  return results;
}
