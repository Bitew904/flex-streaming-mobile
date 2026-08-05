import { create } from 'zustand';
import { ThemeMode } from '@/constants/theme';
import { BufferPreset } from '@/services/exoPlayerConfig';

interface SettingsStore {
  themeMode: ThemeMode;
  accentColor: string;
  resumePlayback: boolean;
  autoPlay: boolean;
  autoNext: boolean;
  rememberPosition: boolean;
  autoSubtitle: boolean;
  /** Prefer hardware decoders (ExoPlayer MediaCodec / iOS VT) */
  hardwareDecoder: boolean;
  /** Use smaller ExoPlayer buffers – better on low-RAM devices */
  lowMemoryMode: boolean;
  /** Cap adaptive quality by height (0 = auto / unlimited) */
  maxResolution: number;
  /** Explicit buffer preset override; null = auto from URI */
  bufferPreset: BufferPreset | null;
  downloadWifiOnly: boolean;
  downloadQuality: 'low' | 'medium' | 'high' | 'original';
  pinEnabled: boolean;
  biometricsEnabled: boolean;

  setThemeMode: (mode: ThemeMode) => void;
  setAccentColor: (color: string) => void;
  setResumePlayback: (value: boolean) => void;
  setAutoPlay: (value: boolean) => void;
  setAutoNext: (value: boolean) => void;
  setRememberPosition: (value: boolean) => void;
  setAutoSubtitle: (value: boolean) => void;
  setHardwareDecoder: (value: boolean) => void;
  setLowMemoryMode: (value: boolean) => void;
  setMaxResolution: (height: number) => void;
  setBufferPreset: (preset: BufferPreset | null) => void;
  setDownloadWifiOnly: (value: boolean) => void;
  setDownloadQuality: (quality: 'low' | 'medium' | 'high' | 'original') => void;
  setPinEnabled: (value: boolean) => void;
  setBiometricsEnabled: (value: boolean) => void;
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  themeMode: 'system',
  accentColor: '#6366F1',
  resumePlayback: true,
  autoPlay: true,
  autoNext: true,
  rememberPosition: true,
  autoSubtitle: false,
  hardwareDecoder: true,
  lowMemoryMode: false,
  maxResolution: 0,
  bufferPreset: null,
  downloadWifiOnly: true,
  downloadQuality: 'high',
  pinEnabled: false,
  biometricsEnabled: false,

  setThemeMode: (themeMode) => set({ themeMode }),
  setAccentColor: (accentColor) => set({ accentColor }),
  setResumePlayback: (resumePlayback) => set({ resumePlayback }),
  setAutoPlay: (autoPlay) => set({ autoPlay }),
  setAutoNext: (autoNext) => set({ autoNext }),
  setRememberPosition: (rememberPosition) => set({ rememberPosition }),
  setAutoSubtitle: (autoSubtitle) => set({ autoSubtitle }),
  setHardwareDecoder: (hardwareDecoder) => set({ hardwareDecoder }),
  setLowMemoryMode: (lowMemoryMode) => set({ lowMemoryMode }),
  setMaxResolution: (maxResolution) => set({ maxResolution }),
  setBufferPreset: (bufferPreset) => set({ bufferPreset }),
  setDownloadWifiOnly: (downloadWifiOnly) => set({ downloadWifiOnly }),
  setDownloadQuality: (downloadQuality) => set({ downloadQuality }),
  setPinEnabled: (pinEnabled) => set({ pinEnabled }),
  setBiometricsEnabled: (biometricsEnabled) => set({ biometricsEnabled }),
}));
