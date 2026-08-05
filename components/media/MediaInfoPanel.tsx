import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  useColorScheme,
} from 'react-native';
import { MediaItem } from '@/types/media';
import { Colors, FontSize, Spacing, BorderRadius } from '@/constants/theme';
import {
  probeVideo,
  VideoMetadataResult,
  getMetadataBackends,
} from '@/services/mediaMetadata';
import { probeMedia } from '@/services/ffmpegMetadata';
import { formatDuration, formatFileSize, formatBitrate } from '@/utils/format';

interface MediaInfoPanelProps {
  item: MediaItem;
  forceProbe?: boolean;
}

export function MediaInfoPanel({ item, forceProbe = false }: MediaInfoPanelProps) {
  const scheme = useColorScheme() ?? 'dark';
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  const [videoMeta, setVideoMeta] = useState<VideoMetadataResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [sourceLabel, setSourceLabel] = useState<string>('');
  const [backends, setBackends] = useState<{
    expoVideoMetadata: boolean;
    ffmpeg: boolean;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const b = await getMetadataBackends();
      if (cancelled) return;
      setBackends(b);

      const needs =
        forceProbe ||
        !item.duration ||
        item.duration <= 0 ||
        !item.codec ||
        (item.type === 'video' && !item.resolution);

      if (!needs) return;

      setLoading(true);

      try {
        if (item.type === 'video') {
          const info = await probeVideo(item.uri);
          if (!cancelled && info) {
            setVideoMeta(info);
            setSourceLabel(
              info.source === 'expo-video-metadata'
                ? 'expo-video-metadata'
                : info.source === 'ffprobe'
                ? 'FFprobe'
                : ''
            );
          }
        } else if (b.ffmpeg) {
          const info = await probeMedia(item.uri);
          if (!cancelled && info) {
            setVideoMeta({
              duration: info.duration,
              width: info.width,
              height: info.height,
              fps: info.fps,
              bitRate: info.bitRate,
              codec: info.audioCodec || info.videoCodec,
              audioCodec: info.audioCodec,
              fileSize: info.size,
              source: 'ffprobe',
            });
            setSourceLabel('FFprobe');
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [item.id, item.uri, item.type, forceProbe]);

  const duration = videoMeta?.duration || item.duration || 0;
  const size = videoMeta?.fileSize || item.size;
  const bitrate = videoMeta?.bitRate || item.bitrate;
  const resolution =
    videoMeta?.width && videoMeta?.height
      ? `${videoMeta.width}x${videoMeta.height}`
      : item.resolution;
  const fps = videoMeta?.fps || item.fps;
  const codec =
    item.type === 'video'
      ? videoMeta?.codec || item.codec
      : videoMeta?.audioCodec || videoMeta?.codec || item.codec;
  const audioCodec = videoMeta?.audioCodec;

  const rows: { label: string; value: string }[] = [
    { label: 'Title', value: item.title },
    { label: 'Type', value: item.type },
    { label: 'Duration', value: formatDuration(duration) },
    { label: 'File size', value: formatFileSize(size) },
    { label: 'Video codec', value: item.type === 'video' ? codec || '—' : '—' },
    {
      label: 'Audio codec',
      value: audioCodec || (item.type === 'audio' ? codec : undefined) || '—',
    },
    { label: 'Resolution', value: resolution || '—' },
    { label: 'FPS', value: fps != null ? String(fps) : '—' },
    { label: 'Bitrate', value: formatBitrate(bitrate) },
    {
      label: 'Audio',
      value:
        videoMeta?.hasAudio == null
          ? '—'
          : videoMeta.hasAudio
          ? `${videoMeta.audioChannels ?? '?'} ch` +
            (videoMeta.audioSampleRate
              ? ` · ${videoMeta.audioSampleRate} Hz`
              : '')
          : 'No',
    },
    {
      label: 'HDR',
      value: videoMeta?.isHDR == null ? '—' : videoMeta.isHDR ? 'Yes' : 'No',
    },
    { label: 'Orientation', value: videoMeta?.orientation || '—' },
    { label: 'Artist', value: item.artist || '—' },
    { label: 'Album', value: item.album || '—' },
    { label: 'Genre', value: item.genre || '—' },
    { label: 'Year', value: item.year ? String(item.year) : '—' },
    { label: 'Path', value: item.path || item.uri },
  ];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.surface }]}
      contentContainerStyle={{ padding: Spacing.md }}
    >
      {loading && (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={{ color: colors.textSecondary, marginLeft: 8 }}>
            Reading metadata…
          </Text>
        </View>
      )}

      {sourceLabel !== '' && (
        <Text style={[styles.hint, { color: colors.textMuted }]}>
          Source: {sourceLabel}
        </Text>
      )}

      {backends && !backends.expoVideoMetadata && !backends.ffmpeg && (
        <Text style={[styles.hint, { color: colors.warning }]}>
          No advanced metadata module in this build. Showing basic fields only.
        </Text>
      )}

      {rows.map((row) => (
        <View
          key={row.label}
          style={[styles.row, { borderBottomColor: colors.border }]}
        >
          <Text style={[styles.label, { color: colors.textSecondary }]}>
            {row.label}
          </Text>
          <Text style={[styles.value, { color: colors.text }]} numberOfLines={3}>
            {row.value}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: BorderRadius.md,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  hint: {
    fontSize: FontSize.sm,
    marginBottom: Spacing.md,
  },
  row: {
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  label: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  value: {
    fontSize: FontSize.md,
  },
});
