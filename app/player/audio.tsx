import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Pressable,
  Dimensions,
  useColorScheme,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePlayerStore } from '@/store/playerStore';
import { IconButton } from '@/components/ui/IconButton';
import { Colors, FontSize, Spacing, BorderRadius, PlaybackSpeeds } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function AudioPlayerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme() ?? 'dark';
  const colors = Colors.dark; // Always dark for immersive player

  const {
    currentItem,
    status,
    position,
    duration,
    rate,
    isShuffle,
    repeatMode,
    setStatus,
    setRate,
    toggleShuffle,
    setRepeatMode,
    playNext,
    playPrevious,
    seekTo,
  } = usePlayerStore();

  if (!currentItem) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Text style={{ color: colors.text }}>No track selected</Text>
        <Pressable onPress={() => router.back()}>
          <Text style={{ color: colors.primary }}>Close</Text>
        </Pressable>
      </View>
    );
  }

  const isPlaying = status === 'playing';
  const progress = duration > 0 ? position / duration : 0;

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const cycleRepeat = () => {
    const modes: Array<'off' | 'one' | 'all'> = ['off', 'one', 'all'];
    const idx = modes.indexOf(repeatMode);
    setRepeatMode(modes[(idx + 1) % modes.length]);
  };

  const cycleSpeed = () => {
    const idx = PlaybackSpeeds.indexOf(rate as any);
    const next = PlaybackSpeeds[(idx + 1) % PlaybackSpeeds.length];
    setRate(next);
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.playerBackground, paddingTop: insets.top },
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <IconButton
          name="chevron-down"
          size={28}
          color={colors.text}
          onPress={() => router.back()}
        />
        <Text style={[styles.headerTitle, { color: colors.textSecondary }]}>
          Now Playing
        </Text>
        <IconButton name="ellipsis-horizontal" size={24} color={colors.text} />
      </View>

      {/* Artwork */}
      <View style={styles.artworkContainer}>
        <Image
          source={
            currentItem.artwork || currentItem.thumbnail
              ? { uri: currentItem.artwork || currentItem.thumbnail }
              : require('@/assets/images/placeholder.png')
          }
          style={styles.artwork}
        />
      </View>

      {/* Info */}
      <View style={styles.info}>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
          {currentItem.title}
        </Text>
        <Text style={[styles.artist, { color: colors.textSecondary }]}>
          {currentItem.artist || 'Unknown Artist'}
        </Text>
      </View>

      {/* Progress */}
      <View style={styles.progressSection}>
        <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
          <View
            style={[
              styles.progressFill,
              { width: `${progress * 100}%`, backgroundColor: colors.primary },
            ]}
          />
        </View>
        <View style={styles.timeRow}>
          <Text style={[styles.time, { color: colors.textSecondary }]}>
            {formatTime(position)}
          </Text>
          <Text style={[styles.time, { color: colors.textSecondary }]}>
            {formatTime(duration)}
          </Text>
        </View>
      </View>

      {/* Main Controls */}
      <View style={styles.controls}>
        <IconButton
          name="shuffle"
          size={22}
          color={isShuffle ? colors.primary : colors.textSecondary}
          onPress={toggleShuffle}
        />
        <IconButton
          name="play-skip-back"
          size={32}
          color={colors.text}
          onPress={playPrevious}
        />
        <Pressable
          style={[styles.playBtn, { backgroundColor: colors.primary }]}
          onPress={() => setStatus(isPlaying ? 'paused' : 'playing')}
        >
          <Ionicons
            name={isPlaying ? 'pause' : 'play'}
            size={36}
            color="#FFF"
          />
        </Pressable>
        <IconButton
          name="play-skip-forward"
          size={32}
          color={colors.text}
          onPress={playNext}
        />
        <IconButton
          name={
            repeatMode === 'one'
              ? 'repeat-outline'
              : repeatMode === 'all'
              ? 'repeat'
              : 'repeat'
          }
          size={22}
          color={repeatMode !== 'off' ? colors.primary : colors.textSecondary}
          onPress={cycleRepeat}
        />
      </View>

      {/* Secondary Controls */}
      <View style={styles.secondary}>
        <Pressable onPress={cycleSpeed} style={styles.speedBtn}>
          <Text style={{ color: colors.text, fontWeight: '600' }}>
            {rate}x
          </Text>
        </Pressable>
        <IconButton name="heart-outline" size={24} color={colors.text} />
        <IconButton name="list" size={24} color={colors.text} />
        <IconButton name="options" size={24} color={colors.text} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  headerTitle: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  artworkContainer: {
    alignItems: 'center',
    marginTop: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  artwork: {
    width: width * 0.75,
    height: width * 0.75,
    borderRadius: BorderRadius.lg,
  },
  info: {
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: '700',
    textAlign: 'center',
  },
  artist: {
    fontSize: FontSize.lg,
    textAlign: 'center',
    marginTop: 6,
  },
  progressSection: {
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  time: {
    fontSize: FontSize.sm,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    marginBottom: Spacing.xl,
  },
  playBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 28,
  },
  speedBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
  },
});
