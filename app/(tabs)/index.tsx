import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'react-native';
import { useLibraryStore } from '@/store/libraryStore';
import { usePlayerStore } from '@/store/playerStore';
import { MediaCard } from '@/components/ui/MediaCard';
import { Colors, FontSize, Spacing, BorderRadius } from '@/constants/theme';
import { MediaItem } from '@/types/media';
import { Ionicons } from '@expo/vector-icons';

export default function HomeScreen() {
  const router = useRouter();
  const scheme = useColorScheme() ?? 'dark';
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  const {
    videos,
    songs,
    recentlyPlayed,
    favorites,
    lastScanAt,
    folders,
    isScanning,
  } = useLibraryStore();
  const { setQueue } = usePlayerStore();

  const recentItems = [...videos, ...songs]
    .filter((m) => recentlyPlayed.includes(m.id))
    .sort(
      (a, b) =>
        recentlyPlayed.indexOf(a.id) - recentlyPlayed.indexOf(b.id)
    )
    .slice(0, 10);

  const favoriteItems = [...videos, ...songs]
    .filter((m) => favorites.includes(m.id))
    .slice(0, 10);

  const continueWatching = videos
    .filter((v) => v.lastPlayed && (v.lastPlayed as number) > 0)
    .slice(0, 8);

  const playItem = (item: MediaItem) => {
    const list = item.type === 'video' ? videos : songs;
    const index = list.findIndex((i) => i.id === item.id);
    setQueue(list, index >= 0 ? index : 0);
    if (item.type === 'video') {
      router.push('/player/video');
    } else {
      router.push('/player/audio');
    }
  };

  const Section = ({
    title,
    data,
    onSeeAll,
  }: {
    title: string;
    data: MediaItem[];
    onSeeAll?: () => void;
  }) => {
    if (data.length === 0) return null;
    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {title}
          </Text>
          {onSeeAll && (
            <Pressable onPress={onSeeAll}>
              <Text style={{ color: colors.primary, fontSize: FontSize.sm }}>
                See All
              </Text>
            </Pressable>
          )}
        </View>
        <FlatList
          horizontal
          data={data}
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: Spacing.md }}
          renderItem={({ item }) => (
            <View style={{ width: 160, marginRight: Spacing.md }}>
              <MediaCard item={item} onPress={playItem} variant="grid" />
            </View>
          )}
        />
      </View>
    );
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: 100 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header – no scan button; indexing is automatic */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.greeting, { color: colors.text }]}>
            Flex Streaming
          </Text>
          {(videos.length > 0 || songs.length > 0) && (
            <Text style={[styles.stats, { color: colors.textSecondary }]}>
              {videos.length} videos · {songs.length} songs
              {folders.length > 0 ? ` · ${folders.length} folders` : ''}
            </Text>
          )}
        </View>
        {isScanning && (
          <View style={styles.indexingBadge}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.indexingText, { color: colors.textSecondary }]}>
              Indexing…
            </Text>
          </View>
        )}
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        {[
          { icon: 'folder-open', label: 'Folders', route: '/videos' },
          { icon: 'cloud', label: 'Cloud', route: '/profile' },
          { icon: 'download', label: 'Downloads', route: '/profile' },
          { icon: 'radio', label: 'Network', route: '/profile' },
        ].map((action) => (
          <Pressable
            key={action.label}
            style={[styles.actionCard, { backgroundColor: colors.surface }]}
            onPress={() => router.push(action.route as any)}
          >
            <Ionicons
              name={action.icon as any}
              size={24}
              color={colors.primary}
            />
            <Text style={[styles.actionLabel, { color: colors.text }]}>
              {action.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <Section title="Continue Watching" data={continueWatching} />
      <Section title="Recently Played" data={recentItems} />
      <Section title="Favorites" data={favoriteItems} />
      <Section
        title="All Videos"
        data={videos.slice(0, 10)}
        onSeeAll={() => router.push('/videos')}
      />
      <Section
        title="All Songs"
        data={songs.slice(0, 10)}
        onSeeAll={() => router.push('/music')}
      />

      {/* Empty while first index is still running or nothing found */}
      {videos.length === 0 && songs.length === 0 && (
        <View style={styles.empty}>
          {isScanning ? (
            <>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                Indexing your media
              </Text>
              <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                Scanning device storage and media library…
              </Text>
            </>
          ) : (
            <>
              <Ionicons
                name="musical-notes"
                size={64}
                color={colors.textMuted}
              />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                No media found
              </Text>
              <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                Add videos or music to this device. Flex Streaming indexes them
                automatically in the background.
              </Text>
            </>
          )}
        </View>
      )}

      {lastScanAt != null && !isScanning && (
        <Text style={[styles.lastScan, { color: colors.textMuted }]}>
          Library updated{' '}
          {new Date(lastScanAt).toLocaleString(undefined, {
            dateStyle: 'medium',
            timeStyle: 'short',
          })}
        </Text>
      )}
    </ScrollView>
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
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  greeting: {
    fontSize: FontSize.xxl,
    fontWeight: '700',
  },
  stats: {
    fontSize: FontSize.sm,
    marginTop: 2,
  },
  indexingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  indexingText: {
    fontSize: FontSize.xs,
    fontWeight: '600',
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  actionCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: 6,
  },
  actionLabel: {
    fontSize: FontSize.xs,
    fontWeight: '600',
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
  empty: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: Spacing.xl,
  },
  emptyTitle: {
    fontSize: FontSize.xl,
    fontWeight: '600',
    marginTop: Spacing.md,
  },
  emptySub: {
    fontSize: FontSize.md,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  lastScan: {
    textAlign: 'center',
    fontSize: FontSize.xs,
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
  },
});
