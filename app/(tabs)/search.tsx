import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  useColorScheme,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useLibraryStore } from '@/store/libraryStore';
import { usePlayerStore } from '@/store/playerStore';
import { MediaCard } from '@/components/ui/MediaCard';
import { Colors, FontSize, Spacing, BorderRadius } from '@/constants/theme';
import { MediaItem } from '@/types/media';
import { Ionicons } from '@expo/vector-icons';

export default function SearchScreen() {
  const router = useRouter();
  const scheme = useColorScheme() ?? 'dark';
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const [query, setQuery] = useState('');

  const { videos, songs } = useLibraryStore();
  const { setQueue } = usePlayerStore();

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    const all = [...videos, ...songs];
    return all.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.artist?.toLowerCase().includes(q) ||
        item.album?.toLowerCase().includes(q) ||
        item.genre?.toLowerCase().includes(q)
    );
  }, [query, videos, songs]);

  const playItem = (item: MediaItem) => {
    const list = item.type === 'video' ? videos : songs;
    const index = list.findIndex((i) => i.id === item.id);
    setQueue(list, index >= 0 ? index : 0);
    router.push(item.type === 'video' ? '/player/video' : '/player/audio');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.searchBox,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <Ionicons name="search" size={20} color={colors.textMuted} />
        <TextInput
          style={[styles.input, { color: colors.text }]}
          placeholder="Search songs, videos, artists..."
          placeholderTextColor={colors.textMuted}
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
      </View>

      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: Spacing.md, paddingBottom: 100 }}
        renderItem={({ item }) => (
          <MediaCard item={item} onPress={playItem} variant="list" />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={{ color: colors.textSecondary }}>
              {query ? 'No results found' : 'Start typing to search'}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: Spacing.md,
    paddingHorizontal: Spacing.md,
    height: 48,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: FontSize.md,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 60,
  },
});
