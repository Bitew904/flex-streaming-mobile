import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Pressable,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { usePlayerStore } from '@/store/playerStore';
import { IconButton } from '@/components/ui/IconButton';
import { Colors, BorderRadius, FontSize, Spacing } from '@/constants/theme';
import { useColorScheme } from 'react-native';

const { width } = Dimensions.get('window');

export function MiniPlayer() {
  const router = useRouter();
  const scheme = useColorScheme() ?? 'dark';
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  const {
    currentItem,
    status,
    position,
    duration,
    setStatus,
    playNext,
    playPrevious,
  } = usePlayerStore();

  if (!currentItem) return null;

  const progress = duration > 0 ? position / duration : 0;
  const isPlaying = status === 'playing';

  const togglePlay = () => {
    setStatus(isPlaying ? 'paused' : 'playing');
  };

  const openFullPlayer = () => {
    if (currentItem.type === 'video') {
      router.push('/player/video');
    } else {
      router.push('/player/audio');
    }
  };

  return (
    <Pressable
      style={[styles.container, { backgroundColor: colors.surfaceElevated }]}
      onPress={openFullPlayer}
    >
      {/* Progress bar */}
      <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
        <View
          style={[
            styles.progressFill,
            { width: `${progress * 100}%`, backgroundColor: colors.primary },
          ]}
        />
      </View>

      <View style={styles.content}>
        <Image
          source={
            currentItem.artwork || currentItem.thumbnail
              ? { uri: currentItem.artwork || currentItem.thumbnail }
              : require('@/assets/images/placeholder.png')
          }
          style={styles.artwork}
        />

        <View style={styles.info}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
            {currentItem.title}
          </Text>
          <Text style={[styles.artist, { color: colors.textSecondary }]} numberOfLines={1}>
            {currentItem.artist || 'Unknown'}
          </Text>
        </View>

        <View style={styles.controls}>
          <IconButton
            name="play-skip-back"
            size={22}
            color={colors.text}
            onPress={playPrevious}
          />
          <IconButton
            name={isPlaying ? 'pause' : 'play'}
            size={28}
            color={colors.text}
            onPress={togglePlay}
          />
          <IconButton
            name="play-skip-forward"
            size={22}
            color={colors.text}
            onPress={playNext}
          />
          <IconButton
            name="close"
            size={20}
            color={colors.textSecondary}
            onPress={() => usePlayerStore.getState().clearQueue()}
          />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  progressTrack: {
    height: 2,
    width: '100%',
  },
  progressFill: {
    height: '100%',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  artwork: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.sm,
  },
  info: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  title: {
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  artist: {
    fontSize: FontSize.sm,
    marginTop: 2,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});
