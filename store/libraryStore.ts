import { create } from 'zustand';
import { MediaItem, Playlist, Folder } from '@/types/media';

interface LibraryStore {
  videos: MediaItem[];
  songs: MediaItem[];
  playlists: Playlist[];
  folders: Folder[];
  favorites: string[];
  recentlyPlayed: string[];
  isScanning: boolean;
  lastScanAt: number | null;

  setVideos: (items: MediaItem[]) => void;
  setSongs: (items: MediaItem[]) => void;
  addMedia: (item: MediaItem) => void;
  updateMedia: (id: string, updates: Partial<MediaItem>) => void;
  removeMedia: (id: string) => void;
  toggleFavorite: (id: string) => void;
  addToRecentlyPlayed: (id: string) => void;
  setPlaylists: (playlists: Playlist[]) => void;
  addPlaylist: (playlist: Playlist) => void;
  updatePlaylist: (id: string, updates: Partial<Playlist>) => void;
  deletePlaylist: (id: string) => void;
  setFolders: (folders: Folder[]) => void;
  setScanning: (scanning: boolean) => void;
  setLastScan: (timestamp: number) => void;
}

export const useLibraryStore = create<LibraryStore>((set, get) => ({
  videos: [],
  songs: [],
  playlists: [],
  folders: [],
  favorites: [],
  recentlyPlayed: [],
  isScanning: false,
  lastScanAt: null,

  setVideos: (videos) => set({ videos }),
  setSongs: (songs) => set({ songs }),

  addMedia: (item) =>
    set((state) => {
      if (item.type === 'video') {
        return { videos: [...state.videos, item] };
      }
      return { songs: [...state.songs, item] };
    }),

  updateMedia: (id, updates) =>
    set((state) => ({
      videos: state.videos.map((v) => (v.id === id ? { ...v, ...updates } : v)),
      songs: state.songs.map((s) => (s.id === id ? { ...s, ...updates } : s)),
    })),

  removeMedia: (id) =>
    set((state) => ({
      videos: state.videos.filter((v) => v.id !== id),
      songs: state.songs.filter((s) => s.id !== id),
      favorites: state.favorites.filter((f) => f !== id),
      recentlyPlayed: state.recentlyPlayed.filter((r) => r !== id),
    })),

  toggleFavorite: (id) =>
    set((state) => {
      const isFav = state.favorites.includes(id);
      const favorites = isFav
        ? state.favorites.filter((f) => f !== id)
        : [...state.favorites, id];

      // Also update the media item
      const update = (items: MediaItem[]) =>
        items.map((item) =>
          item.id === id ? { ...item, isFavorite: !isFav } : item
        );

      return {
        favorites,
        videos: update(state.videos),
        songs: update(state.songs),
      };
    }),

  addToRecentlyPlayed: (id) =>
    set((state) => {
      const filtered = state.recentlyPlayed.filter((r) => r !== id);
      return {
        recentlyPlayed: [id, ...filtered].slice(0, 100),
      };
    }),

  setPlaylists: (playlists) => set({ playlists }),
  addPlaylist: (playlist) =>
    set((state) => ({ playlists: [...state.playlists, playlist] })),
  updatePlaylist: (id, updates) =>
    set((state) => ({
      playlists: state.playlists.map((p) =>
        p.id === id ? { ...p, ...updates, updatedAt: Date.now() } : p
      ),
    })),
  deletePlaylist: (id) =>
    set((state) => ({
      playlists: state.playlists.filter((p) => p.id !== id),
    })),

  setFolders: (folders) => set({ folders }),
  setScanning: (isScanning) => set({ isScanning }),
  setLastScan: (lastScanAt) => set({ lastScanAt }),
}));
