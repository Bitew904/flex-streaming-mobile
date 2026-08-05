import { create } from 'zustand';
import { MediaItem, PlaybackState, PlaybackStatus } from '@/types/media';

interface PlayerStore extends PlaybackState {
  // Actions
  setCurrentItem: (item: MediaItem | null) => void;
  setQueue: (queue: MediaItem[], startIndex?: number) => void;
  addToQueue: (item: MediaItem) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
  setStatus: (status: PlaybackStatus) => void;
  setPosition: (position: number) => void;
  setDuration: (duration: number) => void;
  setRate: (rate: number) => void;
  toggleShuffle: () => void;
  setRepeatMode: (mode: 'off' | 'one' | 'all') => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  playNext: () => void;
  playPrevious: () => void;
  seekTo: (position: number) => void;
}

export const usePlayerStore = create<PlayerStore>((set, get) => ({
  currentItem: null,
  queue: [],
  queueIndex: 0,
  status: 'idle',
  position: 0,
  duration: 0,
  rate: 1,
  isShuffle: false,
  repeatMode: 'off',
  volume: 1,
  isMuted: false,

  setCurrentItem: (item) => set({ currentItem: item }),

  setQueue: (queue, startIndex = 0) =>
    set({
      queue,
      queueIndex: startIndex,
      currentItem: queue[startIndex] ?? null,
    }),

  addToQueue: (item) =>
    set((state) => ({
      queue: [...state.queue, item],
    })),

  removeFromQueue: (index) =>
    set((state) => {
      const newQueue = [...state.queue];
      newQueue.splice(index, 1);
      let newIndex = state.queueIndex;
      if (index < state.queueIndex) newIndex -= 1;
      if (newIndex >= newQueue.length) newIndex = Math.max(0, newQueue.length - 1);
      return {
        queue: newQueue,
        queueIndex: newIndex,
        currentItem: newQueue[newIndex] ?? null,
      };
    }),

  clearQueue: () =>
    set({
      queue: [],
      queueIndex: 0,
      currentItem: null,
      status: 'idle',
      position: 0,
      duration: 0,
    }),

  setStatus: (status) => set({ status }),
  setPosition: (position) => set({ position }),
  setDuration: (duration) => set({ duration }),
  setRate: (rate) => set({ rate }),
  toggleShuffle: () => set((s) => ({ isShuffle: !s.isShuffle })),
  setRepeatMode: (mode) => set({ repeatMode: mode }),
  setVolume: (volume) => set({ volume }),
  toggleMute: () => set((s) => ({ isMuted: !s.isMuted })),

  playNext: () => {
    const { queue, queueIndex, repeatMode, isShuffle } = get();
    if (queue.length === 0) return;

    let nextIndex = queueIndex + 1;

    if (isShuffle) {
      nextIndex = Math.floor(Math.random() * queue.length);
    } else if (nextIndex >= queue.length) {
      if (repeatMode === 'all') nextIndex = 0;
      else return; // end of queue
    }

    set({
      queueIndex: nextIndex,
      currentItem: queue[nextIndex],
      position: 0,
      status: 'playing',
    });
  },

  playPrevious: () => {
    const { queue, queueIndex, position } = get();
    if (queue.length === 0) return;

    // If more than 3 seconds in, restart current
    if (position > 3) {
      set({ position: 0 });
      return;
    }

    const prevIndex = queueIndex <= 0 ? queue.length - 1 : queueIndex - 1;
    set({
      queueIndex: prevIndex,
      currentItem: queue[prevIndex],
      position: 0,
      status: 'playing',
    });
  },

  seekTo: (position) => set({ position }),
}));
