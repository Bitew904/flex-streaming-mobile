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
  'All Songs',
  'Albums',
  'Artists',
  'Genres',
  'Folders',
  'Favorites',
  'Recently Added',
  'Recently Played',
] as const;

export default function MusicScreen() {
  const router = useRouter();
  const scheme = useColorScheme() ?? 'dark';
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>('All Songs');

  const { songs, favorites, recentlyPlayed } = useLibraryStore();
  const { setQueue } = usePlayerStore();

  const getData = (): MediaItem[] => {
    switch (activeTab) {
      case 'Favorites':
        return songs.filter((s) => favorites.includes(s.id));
      case 'Recently Played':
        return songs
          .filter((s) => recentlyPlayed.includes(s.id))
          .sort(
            (a, b) =>
              recentlyPlayed.indexOf(a.id) - recentlyPlayed.indexOf(b.id)
          );
      case 'Recently Added':
        return [...songs].sort((a, b) => b.dateAdded - a.dateAdded);
      default:
        return songs;
    }
  };

  const data = getData();

  const playItem = (item: MediaItem) => {
    const index = data.findIndex((i) => i.id === item.id);
    setQueue(data, index >= 0 ? index : 0);
    router.push('/player/audio');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top Tabs */}
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
              activeTab === item && {
                backgroundColor: colors.primary,
              },
            ]}
          >
            <Text
              style={[
                styles.tabText,
                {
                  color:
                    activeTab === item ? '#FFFFFF' : colors.textSecondary,
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
        contentContainerStyle={{ padding: Spacing.md, paddingBottom: 100 }}
        renderItem={({ item }) => (
          <MediaCard item={item} onPress={playItem} variant="list" />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={{ color: colors.textSecondary, fontSize: FontSize.md }}>
              No songs found
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
