import { useState, useCallback, useRef } from 'react';
import {
  scanAllMedia,
  scanLibraryOnly,
  ScanProgress,
  ScanResult,
} from '@/services/mediaScanner';
import { useLibraryStore } from '@/store/libraryStore';

/** Minimum time between automatic background scans (ms) */
export const AUTO_SCAN_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

export function useMediaScan() {
  const [progress, setProgress] = useState<ScanProgress | null>(null);
  const [lastResult, setLastResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const runningRef = useRef(false);

  const {
    setVideos,
    setSongs,
    setFolders,
    setScanning,
    setLastScan,
    isScanning,
    lastScanAt,
  } = useLibraryStore();

  const applyResult = useCallback(
    (result: ScanResult) => {
      setVideos(result.videos);
      setSongs(result.songs);
      setFolders(result.folders);
      setLastScan(result.scannedAt);
      setLastResult(result);

      if (result.errors.length > 0) {
        console.warn('[Scan] completed with errors:', result.errors);
      }
    },
    [setVideos, setSongs, setFolders, setLastScan]
  );

  /**
   * Silent background scan – no Alert dialogs.
   * Used on app launch / resume like a file manager indexer.
   */
  const runBackgroundScan = useCallback(
    async (options?: { force?: boolean; quick?: boolean }) => {
      if (runningRef.current || isScanning) return null;

      const force = options?.force ?? false;
      const quick = options?.quick ?? false;

      // Cooldown unless forced or library is empty
      const { videos, songs } = useLibraryStore.getState();
      const empty = videos.length === 0 && songs.length === 0;
      if (
        !force &&
        !empty &&
        lastScanAt != null &&
        Date.now() - lastScanAt < AUTO_SCAN_COOLDOWN_MS
      ) {
        return null;
      }

      runningRef.current = true;
      setError(null);
      setScanning(true);
      setProgress({
        phase: 'permission',
        message: 'Indexing media…',
        current: 0,
        total: 1,
        videosFound: 0,
        songsFound: 0,
      });

      try {
        const result = quick
          ? await scanLibraryOnly((p) => setProgress(p))
          : await scanAllMedia((p) => setProgress(p));

        applyResult(result);

        if (result.errors.includes('Media library permission not granted')) {
          setError('Permission denied');
        }

        return result;
      } catch (e: any) {
        const msg = e?.message ?? 'Scan failed';
        setError(msg);
        console.warn('[BackgroundScan]', msg);
        return null;
      } finally {
        runningRef.current = false;
        setScanning(false);
        setProgress(null);
      }
    },
    [isScanning, lastScanAt, setScanning, applyResult]
  );

  /** Manual full scan (still silent – no popups; file-manager style) */
  const runFullScan = useCallback(async () => {
    return runBackgroundScan({ force: true, quick: false });
  }, [runBackgroundScan]);

  const runQuickScan = useCallback(async () => {
    return runBackgroundScan({ force: true, quick: true });
  }, [runBackgroundScan]);

  return {
    isScanning,
    progress,
    lastResult,
    error,
    runBackgroundScan,
    runFullScan,
    runQuickScan,
  };
}
