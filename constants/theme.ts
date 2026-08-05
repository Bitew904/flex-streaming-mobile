export const Colors = {
  light: {
    primary: '#6366F1',
    primaryDark: '#4F46E5',
    background: '#FFFFFF',
    surface: '#F8FAFC',
    surfaceElevated: '#FFFFFF',
    text: '#0F172A',
    textSecondary: '#64748B',
    textMuted: '#94A3B8',
    border: '#E2E8F0',
    error: '#EF4444',
    success: '#22C55E',
    warning: '#F59E0B',
    overlay: 'rgba(0,0,0,0.5)',
    playerBackground: '#0F172A',
  },
  dark: {
    primary: '#818CF8',
    primaryDark: '#6366F1',
    background: '#0A0A0A',
    surface: '#121212',
    surfaceElevated: '#1E1E1E',
    text: '#F8FAFC',
    textSecondary: '#94A3B8',
    textMuted: '#64748B',
    border: '#27272A',
    error: '#F87171',
    success: '#4ADE80',
    warning: '#FBBF24',
    overlay: 'rgba(0,0,0,0.7)',
    playerBackground: '#000000',
  },
  amoled: {
    primary: '#818CF8',
    primaryDark: '#6366F1',
    background: '#000000',
    surface: '#000000',
    surfaceElevated: '#0A0A0A',
    text: '#F8FAFC',
    textSecondary: '#94A3B8',
    textMuted: '#64748B',
    border: '#1A1A1A',
    error: '#F87171',
    success: '#4ADE80',
    warning: '#FBBF24',
    overlay: 'rgba(0,0,0,0.8)',
    playerBackground: '#000000',
  },
};

export type ThemeMode = 'light' | 'dark' | 'amoled' | 'system';

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const FontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  hero: 32,
};

export const BorderRadius = {
  sm: 6,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const PlaybackSpeeds = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3] as const;

export const EqualizerFrequencies = [31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
