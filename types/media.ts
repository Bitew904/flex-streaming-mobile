export type MediaType = 'video' | 'audio';

export type PlaybackStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'ended' | 'error';

export interface MediaItem {
  id: string;
  title: string;
  artist?: string;
  album?: string;
  duration: number; // seconds
  uri: string;
  type: MediaType;
  thumbnail?: string;
  artwork?: string;
  path?: string;
  size?: number;
  resolution?: string;
  codec?: string;
  bitrate?: number;
  fps?: number;
  genre?: string;
  year?: number;
  dateAdded: number;
  lastPlayed?: number;
  playCount: number;
  isFavorite: boolean;
  subtitleTracks?: SubtitleTrack[];
  audioTracks?: AudioTrack[];
}

export interface SubtitleTrack {
  id: string;
  language: string;
  title: string;
  uri?: string;
  encoding?: string;
}

export interface AudioTrack {
  id: string;
  language: string;
  title: string;
  codec?: string;
}

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  cover?: string;
  items: string[]; // MediaItem ids
  isSmart: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface Folder {
  id: string;
  name: string;
  path: string;
  itemCount: number;
  isHidden: boolean;
}

export interface PlaybackState {
  currentItem: MediaItem | null;
  queue: MediaItem[];
  queueIndex: number;
  status: PlaybackStatus;
  position: number;
  duration: number;
  rate: number;
  isShuffle: boolean;
  repeatMode: 'off' | 'one' | 'all';
  volume: number;
  isMuted: boolean;
}

export interface EqualizerBand {
  frequency: number;
  gain: number;
}

export interface EqualizerPreset {
  id: string;
  name: string;
  bands: EqualizerBand[];
}
