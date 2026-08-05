import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Pressable,
  useColorScheme,
} from 'react-native';
import { useLibraryStore } from '@/store/libraryStore';
import { Colors, FontSize, Spacing, BorderRadius } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';

export default function PlaylistsScreen() {
  const scheme = useColorScheme() ?? 'dark';
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const { playlists, addPlaylist } = useLibraryStore();

  const createPlaylist = () => {
    const id = Date.now().toString();
    addPlaylist({
      id,
      name: `Playlist ${playlists.length + 1}`,
      items: [],
      isSmart: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Playlists</Text>
        <Pressable
          style={[styles.createBtn, { backgroundColor: colors.primary }]}
          onPress={createPlaylist}
        >
          <Ionicons name="add" size={22} color="#FFF" />
          <Text style={styles.createText}>New</Text>
        </Pressable>
      </View>

      <FlatList
        data={playlists}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: Spacing.md, paddingBottom: 100 }}
        renderItem={({ item }) => (
          <Pressable
            style={[styles.card, { backgroundColor: colors.surface }]}
          >
            <View
              style={[
                styles.cover,
                { backgroundColor: colors.surfaceElevated },
              ]}
            >
              <Ionicons name="list" size={28} color={colors.primary} />
            </View>
            <View style={styles.info}>
              <Text style={[styles.name, { color: colors.text }]}>
                {item.name}
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: FontSize.sm }}>
                {item.items.length} items
                {item.isSmart ? ' • Smart' : ''}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="list" size={48} color={colors.textMuted} />
            <Text style={{ color: colors.textSecondary, marginTop: 12 }}>
              No playlists yet
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: '700',
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    gap: 4,
  },
  createText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: FontSize.sm,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
  cover: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  name: {
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  empty: {
    alignItems: 'center',
    paddingTop: 80,
  },
});
