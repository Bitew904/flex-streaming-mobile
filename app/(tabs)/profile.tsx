import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Switch,
  useColorScheme,
} from 'react-native';
import { useSettingsStore } from '@/store/settingsStore';
import { Colors, FontSize, Spacing, BorderRadius } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';

export default function ProfileScreen() {
  const scheme = useColorScheme() ?? 'dark';
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  const {
    themeMode,
    resumePlayback,
    autoPlay,
    autoNext,
    hardwareDecoder,
    lowMemoryMode,
    maxResolution,
    downloadWifiOnly,
    setThemeMode,
    setResumePlayback,
    setAutoPlay,
    setAutoNext,
    setHardwareDecoder,
    setLowMemoryMode,
    setMaxResolution,
    setDownloadWifiOnly,
  } = useSettingsStore();

  const SettingRow = ({
    icon,
    label,
    value,
    onValueChange,
    type = 'switch',
  }: {
    icon: string;
    label: string;
    value?: boolean;
    onValueChange?: (v: boolean) => void;
    type?: 'switch' | 'link';
  }) => (
    <View style={[styles.row, { borderBottomColor: colors.border }]}>
      <Ionicons name={icon as any} size={22} color={colors.primary} />
      <Text style={[styles.rowLabel, { color: colors.text }]}>{label}</Text>
      {type === 'switch' && onValueChange && (
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor="#FFF"
        />
      )}
      {type === 'link' && (
        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
      )}
    </View>
  );

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: 100 }}
    >
      <Text style={[styles.header, { color: colors.text }]}>Settings</Text>

      <Text style={[styles.section, { color: colors.textSecondary }]}>
        Appearance
      </Text>
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        {(['system', 'light', 'dark', 'amoled'] as const).map((mode) => (
          <Pressable
            key={mode}
            style={[styles.row, { borderBottomColor: colors.border }]}
            onPress={() => setThemeMode(mode)}
          >
            <Text style={[styles.rowLabel, { color: colors.text }]}>
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </Text>
            {themeMode === mode && (
              <Ionicons name="checkmark" size={22} color={colors.primary} />
            )}
          </Pressable>
        ))}
      </View>

      <Text style={[styles.section, { color: colors.textSecondary }]}>
        Playback
      </Text>
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <SettingRow
          icon="play-forward"
          label="Resume Playback"
          value={resumePlayback}
          onValueChange={setResumePlayback}
        />
        <SettingRow
          icon="play"
          label="Auto Play"
          value={autoPlay}
          onValueChange={setAutoPlay}
        />
        <SettingRow
          icon="play-skip-forward"
          label="Auto Next"
          value={autoNext}
          onValueChange={setAutoNext}
        />
        <SettingRow
          icon="hardware-chip"
          label="Hardware Decoder (ExoPlayer)"
          value={hardwareDecoder}
          onValueChange={setHardwareDecoder}
        />
        <SettingRow
          icon="phone-portrait-outline"
          label="Low Memory Mode"
          value={lowMemoryMode}
          onValueChange={setLowMemoryMode}
        />
      </View>

      <Text style={[styles.section, { color: colors.textSecondary }]}>
        ExoPlayer Quality Cap
      </Text>
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        {[
          { label: 'Auto (ABR)', value: 0 },
          { label: '480p', value: 480 },
          { label: '720p', value: 720 },
          { label: '1080p', value: 1080 },
          { label: '1440p', value: 1440 },
        ].map((opt) => (
          <Pressable
            key={opt.label}
            style={[styles.row, { borderBottomColor: colors.border }]}
            onPress={() => setMaxResolution(opt.value)}
          >
            <Text style={[styles.rowLabel, { color: colors.text }]}>
              {opt.label}
            </Text>
            {maxResolution === opt.value && (
              <Ionicons name="checkmark" size={22} color={colors.primary} />
            )}
          </Pressable>
        ))}
      </View>

      <Text style={[styles.section, { color: colors.textSecondary }]}>
        Downloads
      </Text>
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <SettingRow
          icon="wifi"
          label="Wi-Fi Only"
          value={downloadWifiOnly}
          onValueChange={setDownloadWifiOnly}
        />
      </View>

      <Text style={[styles.section, { color: colors.textSecondary }]}>
        Storage & Network
      </Text>
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <SettingRow icon="folder" label="Local Storage" type="link" />
        <SettingRow icon="cloud" label="Cloud Storage" type="link" />
        <SettingRow icon="globe" label="Network / SMB / FTP" type="link" />
      </View>

      <Text style={[styles.section, { color: colors.textSecondary }]}>
        About
      </Text>
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <View style={[styles.row, { borderBottomColor: colors.border }]}>
          <Text style={[styles.rowLabel, { color: colors.text }]}>
            Version
          </Text>
          <Text style={{ color: colors.textSecondary }}>1.0.0</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    fontSize: FontSize.xxl,
    fontWeight: '700',
    padding: Spacing.md,
  },
  section: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: Spacing.md,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  card: {
    marginHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  rowLabel: {
    flex: 1,
    fontSize: FontSize.md,
  },
});
