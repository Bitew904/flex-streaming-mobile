import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Pressable,
  Dimensions,
} from 'react-native';
import { MediaItem } from '@/types/media';
import { Colors, BorderRadius, FontSize, Spacing } from '@/constants/theme';
import { useColorScheme } from 'react-native';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

interface MediaCardProps {
  item: MediaItem;
  onPress: (item: MediaItem) => void;
  onLongPress?: (item: MediaItem) => void;
  variant?: 'grid' | 'list';
}

export function MediaCard({
  item,
  onPress,
  onLongPress,
  variant = 'grid',
}: MediaCardProps) {
  const scheme = useColorScheme() ?? 'dark';
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  if (variant === 'list') {
    return (
      <Pressable
        style={[styles.listCard, { backgroundColor: colors.surface }]}
        onPress={() => onPress(item)}
        onLongPress={() => onLongPress?.(item)}
      >
        <Image
          source={
            item.thumbnail || item.artwork
              ? { uri: item.thumbnail || item.artwork }
              : require('@/assets/images/placeholder.png')
          }
          style={styles.listThumb}
        />
        <View style={styles.listInfo}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={1}>
            {item.artist || item.album || formatDuration(item.duration)}
          </Text>
        </View>
        {item.isFavorite && (
          <Text style={styles.fav}>♥</Text>
        )}
      </Pressable>
    );
  }

  return (
    <Pressable
      style={[styles.gridCard, { width: CARD_WIDTH }]}
      onPress={() => onPress(item)}
      onLongPress={() => onLongPress?.(item)}
    >
      <Image
        source={
          item.thumbnail || item.artwork
            ? { uri: item.thumbnail || item.artwork }
            : require('@/assets/images/placeholder.png')
        }
        style={[styles.gridThumb, { backgroundColor: colors.surface }]}
      />
      <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
        {item.title}
      </Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={1}>
        {item.artist || formatDuration(item.duration)}
      </Text>
    </Pressable>
  );
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  gridCard: {
    marginBottom: Spacing.md,
  },
  gridThumb: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
  listCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
  listThumb: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.sm,
  },
  listInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  title: {
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: FontSize.sm,
    marginTop: 2,
  },
  fav: {
    color: '#EF4444',
    fontSize: 16,
    marginRight: Spacing.sm,
  },
});
