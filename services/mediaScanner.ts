/**
 * Flex Streaming – Full Media Scanner
 * ------------------------------------
 * Scans device internal storage, external storage (SD / OTG where accessible),
 * and the system media library. Collects videos & audio with metadata.
 *
 * Uses:
 *  - expo-media-library  → indexed media + rich asset info
 *  - expo-file-system    → directory walk for external / non-indexed files
 */

import { Platform } from 'react-native';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import { MediaItem, Folder } from '@/types/media';
import {
  enrichMediaBatch,
  getMetadataBackends,
} from '@/services/mediaMetadata';

// ---------------------------------------------------------------------------
// Supported extensions (from the product plan)
// ---------------------------------------------------------------------------

export const VIDEO_EXTENSIONS = [
  'mp4', 'mkv', 'avi', 'mov', 'wmv', 'flv', 'webm', 'm4v', '3gp',
  'mpg', 'mpeg', 'ts', 'mts', 'vob', 'ogv', 'm2ts', 'divx', 'xvid',
];

export const AUDIO_EXTENSIONS = [
  'mp3', 'aac', 'm4a', 'wav', 'flac', 'ogg', 'opus', 'wma', 'aiff',
  'amr', 'alac', 'mid', 'midi', 'ape', 'wv',
];

const VIDEO_SET = new Set(VIDEO_EXTENSIONS);
const AUDIO_SET = new Set(AUDIO_EXTENSIONS);

// Common folders to probe on Android (internal + external)
const ANDROID_SCAN_ROOTS = [
  // Primary shared storage
  'file:///storage/emulated/0/DCIM',
  'file:///storage/emulated/0/Movies',
  'file:///storage/emulated/0/Download',
  'file:///storage/emulated/0/Downloads',
  'file:///storage/emulated/0/Music',
  'file:///storage/emulated/0/Podcasts',
  'file:///storage/emulated/0/Audiobooks',
  'file:///storage/emulated/0/Pictures',
  'file:///storage/emulated/0/WhatsApp/Media',
  'file:///storage/emulated/0/Telegram',
  'file:///storage/emulated/0/Android/media',
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ScanProgress {
  phase: 'permission' | 'library' | 'storage' | 'metadata' | 'ffmpeg' | 'done' | 'error';
  message: string;
  current: number;
  total: number;
  videosFound: number;
  songsFound: number;
}

export interface ScanResult {
  videos: MediaItem[];
  songs: MediaItem[];
  folders: Folder[];
  scannedAt: number;
  errors: string[];
}

export type ScanProgressCallback = (progress: ScanProgress) => void;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function isSupportedVideo(filename: string): boolean {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  return VIDEO_SET.has(ext);
}

export function isSupportedAudio(filename: string): boolean {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  return AUDIO_SET.has(ext);
}

function getExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() ?? '';
}

function stripExtension(filename: string): string {
  return filename.replace(/\.[^/.]+$/, '');
}

function makeId(uri: string, fallback?: string): string {
  // Stable id from uri
  let hash = 0;
  const str = uri || fallback || String(Date.now());
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return `media_${Math.abs(hash).toString(36)}`;
}

function folderNameFromPath(path: string): string {
  const clean = path.replace(/\/$/, '');
  const parts = clean.split('/').filter(Boolean);
  return parts[parts.length - 1] || 'Root';
}

function parentFolderPath(path: string): string {
  const clean = path.replace(/\/$/, '');
  const idx = clean.lastIndexOf('/');
  return idx > 0 ? clean.slice(0, idx) : clean;
}

// ---------------------------------------------------------------------------
// Permissions
// ---------------------------------------------------------------------------

export async function requestPermissions(): Promise<boolean> {
  const { status } = await MediaLibrary.requestPermissionsAsync();
  return status === 'granted';
}

export async function getPermissionStatus(): Promise<MediaLibrary.PermissionStatus> {
  const { status } = await MediaLibrary.getPermissionsAsync();
  return status;
}

// ---------------------------------------------------------------------------
// Media Library scan (system-indexed media – internal + known external)
// ---------------------------------------------------------------------------

async function fetchAllAssets(
  mediaType: MediaLibrary.MediaTypeValue,
  pageSize = 100
): Promise<MediaLibrary.Asset[]> {
  const all: MediaLibrary.Asset[] = [];
  let hasNext = true;
  let after: string | undefined;

  while (hasNext) {
    const page = await MediaLibrary.getAssetsAsync({
      mediaType,
      first: pageSize,
      after,
      sortBy: [[MediaLibrary.SortBy.creationTime, false]],
    });
    all.push(...page.assets);
    hasNext = page.hasNextPage;
    after = page.endCursor;
  }

  return all;
}

async function assetToMediaItem(
  asset: MediaLibrary.Asset,
  type: 'video' | 'audio'
): Promise<MediaItem> {
  // Base fields from the lightweight asset
  const item: MediaItem = {
    id: asset.id,
    title: stripExtension(asset.filename),
    duration: asset.duration ?? 0,
    uri: asset.uri,
    type,
    thumbnail: type === 'video' ? asset.uri : undefined,
    artwork: type === 'audio' ? undefined : undefined,
    path: asset.uri,
    dateAdded: asset.creationTime ?? Date.now(),
    playCount: 0,
    isFavorite: false,
  };

  // Enrich with getAssetInfoAsync (size, location, localUri, dimensions, EXIF-ish)
  try {
    const info = await MediaLibrary.getAssetInfoAsync(asset, {
      shouldDownloadFromNetwork: false,
    });

    if (info.localUri) {
      item.uri = info.localUri;
      item.path = info.localUri;
    }

    if (info.filename) {
      item.title = stripExtension(info.filename);
    }

    // File size
    if (info.localUri) {
      try {
        const fileInfo = await FileSystem.getInfoAsync(info.localUri);
        if (fileInfo.exists && typeof (fileInfo as any).size === 'number') {
          item.size = (fileInfo as any).size;
        }
      } catch {
        // ignore size errors
      }
    }

    // Video dimensions → resolution
    if (type === 'video' && asset.width && asset.height) {
      item.resolution = `${asset.width}x${asset.height}`;
    }

    // Modification time as fallback date
    if (info.modificationTime) {
      item.dateAdded = info.modificationTime;
    }

    // Location-based folder hint
    if (info.localUri) {
      item.path = info.localUri;
    }
  } catch (e) {
    // Keep base item if enrichment fails
    console.warn('[Scanner] getAssetInfoAsync failed for', asset.id, e);
  }

  return item;
}

async function scanMediaLibrary(
  onProgress?: ScanProgressCallback
): Promise<{ videos: MediaItem[]; songs: MediaItem[] }> {
  onProgress?.({
    phase: 'library',
    message: 'Scanning media library…',
    current: 0,
    total: 0,
    videosFound: 0,
    songsFound: 0,
  });

  const [videoAssets, audioAssets] = await Promise.all([
    fetchAllAssets(MediaLibrary.MediaType.video),
    fetchAllAssets(MediaLibrary.MediaType.audio),
  ]);

  const total = videoAssets.length + audioAssets.length;
  const videos: MediaItem[] = [];
  const songs: MediaItem[] = [];
  let current = 0;

  // Process videos
  for (const asset of videoAssets) {
    const item = await assetToMediaItem(asset, 'video');
    videos.push(item);
    current += 1;
    if (current % 20 === 0 || current === total) {
      onProgress?.({
        phase: 'metadata',
        message: `Reading metadata… (${current}/${total})`,
        current,
        total,
        videosFound: videos.length,
        songsFound: songs.length,
      });
    }
  }

  // Process audio
  for (const asset of audioAssets) {
    const item = await assetToMediaItem(asset, 'audio');
    // Try to parse artist from filename patterns "Artist - Title"
    const dash = item.title.indexOf(' - ');
    if (dash > 0) {
      item.artist = item.title.slice(0, dash).trim();
      item.title = item.title.slice(dash + 3).trim();
    }
    songs.push(item);
    current += 1;
    if (current % 20 === 0 || current === total) {
      onProgress?.({
        phase: 'metadata',
        message: `Reading metadata… (${current}/${total})`,
        current,
        total,
        videosFound: videos.length,
        songsFound: songs.length,
      });
    }
  }

  return { videos, songs };
}

// ---------------------------------------------------------------------------
// File-system scan (external storage / folders not always in MediaLibrary)
// ---------------------------------------------------------------------------

async function listDirectorySafe(uri: string): Promise<string[]> {
  try {
    const info = await FileSystem.getInfoAsync(uri);
    if (!info.exists) return [];
    const names = await FileSystem.readDirectoryAsync(uri);
    return names;
  } catch {
    return [];
  }
}

async function walkDirectory(
  rootUri: string,
  maxDepth = 4,
  depth = 0
): Promise<{ uri: string; name: string; size?: number }[]> {
  if (depth > maxDepth) return [];

  const results: { uri: string; name: string; size?: number }[] = [];
  const names = await listDirectorySafe(rootUri);

  for (const name of names) {
    // Skip hidden / system dirs
    if (name.startsWith('.') || name === 'Android' && depth === 0) continue;

    const childUri = rootUri.endsWith('/')
      ? `${rootUri}${name}`
      : `${rootUri}/${name}`;

    try {
      const info = await FileSystem.getInfoAsync(childUri);
      if (!info.exists) continue;

      if (info.isDirectory) {
        // Recurse
        const nested = await walkDirectory(childUri, maxDepth, depth + 1);
        results.push(...nested);
      } else {
        const ext = getExtension(name);
        if (VIDEO_SET.has(ext) || AUDIO_SET.has(ext)) {
          results.push({
            uri: childUri,
            name,
            size: 'size' in info ? (info as any).size : undefined,
          });
        }
      }
    } catch {
      // skip inaccessible entries
    }
  }

  return results;
}

async function scanFileSystem(
  existingUris: Set<string>,
  onProgress?: ScanProgressCallback
): Promise<{ videos: MediaItem[]; songs: MediaItem[] }> {
  if (Platform.OS !== 'android') {
    // iOS is heavily sandboxed; MediaLibrary is the primary source
    return { videos: [], songs: [] };
  }

  onProgress?.({
    phase: 'storage',
    message: 'Scanning device & external storage…',
    current: 0,
    total: ANDROID_SCAN_ROOTS.length,
    videosFound: 0,
    songsFound: 0,
  });

  const videos: MediaItem[] = [];
  const songs: MediaItem[] = [];
  let rootIndex = 0;

  for (const root of ANDROID_SCAN_ROOTS) {
    rootIndex += 1;
    onProgress?.({
      phase: 'storage',
      message: `Scanning ${folderNameFromPath(root)}…`,
      current: rootIndex,
      total: ANDROID_SCAN_ROOTS.length,
      videosFound: videos.length,
      songsFound: songs.length,
    });

    const files = await walkDirectory(root, 3);

    for (const file of files) {
      // Skip if already found via MediaLibrary
      if (existingUris.has(file.uri)) continue;

      const ext = getExtension(file.name);
      const isVideo = VIDEO_SET.has(ext);
      const isAudio = AUDIO_SET.has(ext);
      if (!isVideo && !isAudio) continue;

      const item: MediaItem = {
        id: makeId(file.uri),
        title: stripExtension(file.name),
        duration: 0, // unknown without decoder
        uri: file.uri,
        type: isVideo ? 'video' : 'audio',
        path: file.uri,
        size: file.size,
        dateAdded: Date.now(),
        playCount: 0,
        isFavorite: false,
      };

      if (isVideo) {
        videos.push(item);
      } else {
        const dash = item.title.indexOf(' - ');
        if (dash > 0) {
          item.artist = item.title.slice(0, dash).trim();
          item.title = item.title.slice(dash + 3).trim();
        }
        songs.push(item);
      }
    }
  }

  return { videos, songs };
}

// ---------------------------------------------------------------------------
// Folder aggregation
// ---------------------------------------------------------------------------

function buildFolders(items: MediaItem[]): Folder[] {
  const map = new Map<string, { name: string; path: string; count: number }>();

  for (const item of items) {
    const path = item.path || item.uri;
    if (!path) continue;
    const folderPath = parentFolderPath(path);
    const existing = map.get(folderPath);
    if (existing) {
      existing.count += 1;
    } else {
      map.set(folderPath, {
        name: folderNameFromPath(folderPath),
        path: folderPath,
        count: 1,
      });
    }
  }

  return Array.from(map.entries()).map(([path, data]) => ({
    id: makeId(path),
    name: data.name,
    path: data.path,
    itemCount: data.count,
    isHidden: data.name.startsWith('.'),
  }));
}

// ---------------------------------------------------------------------------
// Public API – full scan
// ---------------------------------------------------------------------------

/**
 * Full scan of device storage + external storage + media library.
 * Returns videos, songs, and folder list with metadata.
 */
export async function scanAllMedia(
  onProgress?: ScanProgressCallback
): Promise<ScanResult> {
  const errors: string[] = [];

  onProgress?.({
    phase: 'permission',
    message: 'Requesting permissions…',
    current: 0,
    total: 1,
    videosFound: 0,
    songsFound: 0,
  });

  const granted = await requestPermissions();
  if (!granted) {
    return {
      videos: [],
      songs: [],
      folders: [],
      scannedAt: Date.now(),
      errors: ['Media library permission not granted'],
    };
  }

  let libraryVideos: MediaItem[] = [];
  let librarySongs: MediaItem[] = [];

  try {
    const lib = await scanMediaLibrary(onProgress);
    libraryVideos = lib.videos;
    librarySongs = lib.songs;
  } catch (e: any) {
    errors.push(`Media library scan failed: ${e?.message ?? e}`);
  }

  // Track URIs already found so FS scan can skip duplicates
  const existingUris = new Set<string>([
    ...libraryVideos.map((v) => v.uri),
    ...libraryVideos.map((v) => v.path || ''),
    ...librarySongs.map((s) => s.uri),
    ...librarySongs.map((s) => s.path || ''),
  ]);

  let fsVideos: MediaItem[] = [];
  let fsSongs: MediaItem[] = [];

  try {
    const fs = await scanFileSystem(existingUris, onProgress);
    fsVideos = fs.videos;
    fsSongs = fs.songs;
  } catch (e: any) {
    errors.push(`Storage scan failed: ${e?.message ?? e}`);
  }

  // Merge (library first, then FS extras)
  let videos = [...libraryVideos, ...fsVideos];
  let songs = [...librarySongs, ...fsSongs];

  // Metadata enrichment: expo-video-metadata (videos) + FFprobe fallback
  try {
    const backends = await getMetadataBackends();
    const canEnrich = backends.expoVideoMetadata || backends.ffmpeg;

    if (canEnrich && (videos.length > 0 || songs.length > 0)) {
      const total = videos.length + songs.length;
      onProgress?.({
        phase: 'metadata',
        message: backends.expoVideoMetadata
          ? 'Reading video metadata…'
          : 'Extracting metadata…',
        current: 0,
        total,
        videosFound: videos.length,
        songsFound: songs.length,
      });

      const all = [...videos, ...songs];
      const enriched = await enrichMediaBatch(all, {
        concurrency: 3,
        onlyMissing: true,
        onProgress: (done, totalCount) => {
          onProgress?.({
            phase: 'metadata',
            message: `Metadata… (${done}/${totalCount})`,
            current: done,
            total: totalCount,
            videosFound: videos.length,
            songsFound: songs.length,
          });
        },
      });

      videos = enriched.filter((m) => m.type === 'video');
      songs = enriched.filter((m) => m.type === 'audio');
    }
  } catch (e: any) {
    errors.push(`Metadata enrichment failed: ${e?.message ?? e}`);
  }

  const folders = buildFolders([...videos, ...songs]);

  onProgress?.({
    phase: 'done',
    message: `Found ${videos.length} videos, ${songs.length} songs`,
    current: 1,
    total: 1,
    videosFound: videos.length,
    songsFound: songs.length,
  });

  return {
    videos,
    songs,
    folders,
    scannedAt: Date.now(),
    errors,
  };
}

/**
 * Quick re-scan of media library only (faster, no FS walk).
 */
export async function scanLibraryOnly(
  onProgress?: ScanProgressCallback
): Promise<ScanResult> {
  const granted = await requestPermissions();
  if (!granted) {
    return {
      videos: [],
      songs: [],
      folders: [],
      scannedAt: Date.now(),
      errors: ['Permission denied'],
    };
  }

  const { videos, songs } = await scanMediaLibrary(onProgress);
  const folders = buildFolders([...videos, ...songs]);

  onProgress?.({
    phase: 'done',
    message: `Found ${videos.length} videos, ${songs.length} songs`,
    current: 1,
    total: 1,
    videosFound: videos.length,
    songsFound: songs.length,
  });

  return {
    videos,
    songs,
    folders,
    scannedAt: Date.now(),
    errors: [],
  };
}
