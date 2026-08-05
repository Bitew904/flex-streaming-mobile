import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Pressable,
  useColorScheme,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useLibraryStore } from '@/store/libraryStore';
import { usePlayerStore } from '@/store/playerStore';
import { MediaCard } from '@/components/ui/MediaCard';
import { Colors, FontSize, Spacing } from '@/constants/theme';
import { MediaItem } from '@/types/media';

const TABS = [
  'All Videos',
  'Movies',
  'TV Shows',
  'Folders',
  'Shorts',
  'Camera',
  'Downloads',
  'Favorites',
] as const;

export default function VideosScreen() {
  const router = useRouter();
  const scheme = useColorScheme() ?? 'dark';
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>('All Videos');

  const { videos, favorites } = useLibraryStore();
  const { setQueue } = usePlayerStore();

  const getData = (): MediaItem[] => {
    switch (activeTab) {
      case 'Favorites':
        return videos.filter((v) => favorites.includes(v.id));
      case 'Downloads':
        // Placeholder: filter by path containing Downloads if available
        return videos.filter((v) => v.path?.toLowerCase().includes('download'));
      default:
        return videos;
    }
  };

  const data = getData();

  const playItem = (item: MediaItem) => {
    const index = data.findIndex((i) => i.id === item.id);
    setQueue(data, index >= 0 ? index : 0);
    router.push('/player/video');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        horizontal
        data={TABS}
        keyExtractor={(item) => item}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabs}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => setActiveTab(item)}
            style={[
              styles.tab,
              activeTab === item && { backgroundColor: colors.primary },
            ]}
          >
            <Text
              style={[
                styles.tabText,
                {
                  color: activeTab === item ? '#FFFFFF' : colors.textSecondary,
                },
              ]}
            >
              {item}
            </Text>
          </Pressable>
        )}
      />

      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={{ gap: Spacing.md }}
        contentContainerStyle={{ padding: Spacing.md, paddingBottom: 100 }}
        renderItem={({ item }) => (
          <MediaCard item={item} onPress={playItem} variant="grid" />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={{ color: colors.textSecondary, fontSize: FontSize.md }}>
              No videos found
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabs: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: 8,
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  tabText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  empty: {
    alignItems: 'center',
    paddingTop: 60,
  },
});
