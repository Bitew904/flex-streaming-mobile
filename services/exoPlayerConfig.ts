/**
 * ExoPlayer configuration for Android playback
 * ---------------------------------------------
 * react-native-video uses ExoPlayer on Android. This module centralizes
 * buffer strategies, track selection helpers, and format hints so the
 * player can take full advantage of ExoPlayer capabilities:
 *  - Adaptive bitrate (ABR)
 *  - DASH / HLS / SmoothStreaming
 *  - Hardware decoding preference
 *  - Custom buffer windows
 */

import { Platform } from 'react-native';

/** ExoPlayer buffer window presets */
export type BufferPreset = 'lowMemory' | 'balanced' | 'highQuality' | 'live';

export interface ExoBufferConfig {
  minBufferMs: number;
  maxBufferMs: number;
  bufferForPlaybackMs: number;
  bufferForPlaybackAfterRebufferMs: number;
  backBufferDurationMs?: number;
  maxHeapAllocationPercent?: number;
  minBufferMemoryReservePercent?: number;
  cacheSizeMB?: number;
}

export const BUFFER_PRESETS: Record<BufferPreset, ExoBufferConfig> = {
  /** Faster start, less RAM – good for low-end devices */
  lowMemory: {
    minBufferMs: 5000,
    maxBufferMs: 20000,
    bufferForPlaybackMs: 1500,
    bufferForPlaybackAfterRebufferMs: 3000,
    backBufferDurationMs: 5000,
    maxHeapAllocationPercent: 0.25,
    cacheSizeMB: 40,
  },
  /** Default – solid for most local & network playback */
  balanced: {
    minBufferMs: 15000,
    maxBufferMs: 50000,
    bufferForPlaybackMs: 2500,
    bufferForPlaybackAfterRebufferMs: 5000,
    backBufferDurationMs: 15000,
    maxHeapAllocationPercent: 0.4,
    cacheSizeMB: 80,
  },
  /** Larger buffer – fewer stalls on weak networks / high bitrate files */
  highQuality: {
    minBufferMs: 30000,
    maxBufferMs: 120000,
    bufferForPlaybackMs: 4000,
    bufferForPlaybackAfterRebufferMs: 8000,
    backBufferDurationMs: 30000,
    maxHeapAllocationPercent: 0.5,
    cacheSizeMB: 160,
  },
  /** Tuned for live / low-latency streams */
  live: {
    minBufferMs: 3000,
    maxBufferMs: 15000,
    bufferForPlaybackMs: 1000,
    bufferForPlaybackAfterRebufferMs: 2000,
    backBufferDurationMs: 0,
    maxHeapAllocationPercent: 0.3,
    cacheSizeMB: 20,
  },
};

export type VideoTrackSelection =
  | { type: 'auto' }
  | { type: 'disabled' }
  | { type: 'resolution'; value: number }
  | { type: 'index'; value: number };

export type AudioTrackSelection =
  | { type: 'system' }
  | { type: 'disabled' }
  | { type: 'title'; value: string }
  | { type: 'language'; value: string }
  | { type: 'index'; value: number };

export type TextTrackSelection =
  | { type: 'system' }
  | { type: 'disabled' }
  | { type: 'title'; value: string }
  | { type: 'language'; value: string }
  | { type: 'index'; value: number };

/** Guess container / mime hint from file extension for ExoPlayer */
export function guessContentType(uri: string): string | undefined {
  const lower = uri.toLowerCase().split('?')[0];
  if (lower.endsWith('.m3u8')) return 'application/x-mpegURL';
  if (lower.endsWith('.mpd')) return 'application/dash+xml';
  if (lower.endsWith('.ism') || lower.endsWith('.isml')) {
    return 'application/vnd.ms-sstr+xml';
  }
  if (lower.endsWith('.mp4') || lower.endsWith('.m4v')) return 'video/mp4';
  if (lower.endsWith('.webm')) return 'video/webm';
  if (lower.endsWith('.mkv')) return 'video/x-matroska';
  if (lower.endsWith('.ts') || lower.endsWith('.m2ts')) return 'video/mp2t';
  if (lower.endsWith('.mp3')) return 'audio/mpeg';
  if (lower.endsWith('.aac') || lower.endsWith('.m4a')) return 'audio/mp4';
  if (lower.endsWith('.flac')) return 'audio/flac';
  if (lower.endsWith('.ogg') || lower.endsWith('.opus')) return 'audio/ogg';
  return undefined;
}

export function isStreamingUrl(uri: string): boolean {
  const lower = uri.toLowerCase();
  return (
    lower.includes('.m3u8') ||
    lower.includes('.mpd') ||
    lower.startsWith('rtsp://') ||
    lower.startsWith('rtmp://') ||
    lower.includes('dash') ||
    lower.includes('hls')
  );
}

export function pickBufferPreset(
  uri: string,
  lowMemoryMode?: boolean
): BufferPreset {
  if (lowMemoryMode) return 'lowMemory';
  if (isStreamingUrl(uri)) {
    // Live-ish endpoints get the live preset; VOD HLS/DASH use highQuality
    if (uri.toLowerCase().includes('live')) return 'live';
    return 'highQuality';
  }
  return 'balanced';
}

/** Max bitrate cap for ExoPlayer ABR (bits per second). 0 = unlimited */
export function resolutionToMaxBitRate(height?: number): number {
  if (!height) return 0;
  // Rough caps matching common ladders
  if (height <= 360) return 1_000_000;
  if (height <= 480) return 2_500_000;
  if (height <= 720) return 5_000_000;
  if (height <= 1080) return 8_000_000;
  if (height <= 1440) return 16_000_000;
  return 0; // 4K+ unlimited
}

export const IS_ANDROID = Platform.OS === 'android';
export const IS_IOS = Platform.OS === 'ios';
