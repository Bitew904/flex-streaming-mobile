/**
 * Background media indexer
 * ------------------------
 * File-manager style: automatically indexes device media on launch and when
 * the app returns to the foreground. No scan button required.
 */

import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useMediaScan } from '@/hooks/useMediaScan';
import { useLibraryStore } from '@/store/libraryStore';

export function BackgroundMediaIndexer() {
  const { runBackgroundScan } = useMediaScan();
  const appState = useRef(AppState.currentState);
  const bootstrapped = useRef(false);

  // Initial index on first mount (app open)
  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;

    // Small delay so UI can paint first
    const t = setTimeout(() => {
      const { videos, songs } = useLibraryStore.getState();
      // First launch / empty library → full scan; otherwise quick library refresh
      if (videos.length === 0 && songs.length === 0) {
        runBackgroundScan({ force: true, quick: false });
      } else {
        runBackgroundScan({ force: false, quick: true });
      }
    }, 400);

    return () => clearTimeout(t);
  }, [runBackgroundScan]);

  // Re-index when returning from background (like file managers)
  useEffect(() => {
    const onChange = (next: AppStateStatus) => {
      const prev = appState.current;
      appState.current = next;

      if (
        (prev === 'background' || prev === 'inactive') &&
        next === 'active'
      ) {
        // Quiet refresh – respects cooldown unless library is empty
        runBackgroundScan({ force: false, quick: true });
      }
    };

    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, [runBackgroundScan]);

  return null;
}
