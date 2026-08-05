import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  StatusBar,
  ActivityIndicator,
  PanResponder,
  LayoutChangeEvent,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePlayerStore } from '@/store/playerStore';
import { IconButton } from '@/components/ui/IconButton';
import {
  VideoPlayer,
  VideoPlayerHandle,
  AspectMode,
} from '@/components/player/VideoPlayer';
import { Colors, FontSize, Spacing, PlaybackSpeeds } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function VideoPlayerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const videoRef = useRef<VideoPlayerHandle>(null);

  const [showControls, setShowControls] = useState(true);
  const [locked, setLocked] = useState(false);
  const [aspectMode, setAspectMode] = useState<AspectMode>('contain');
  const [isBuffering, setIsBuffering] = useState(false);
  const [scrubPosition, setScrubPosition] = useState<number | null>(null);
  const [progressBarWidth, setProgressBarWidth] = useState(SCREEN_WIDTH - 100);
  const [isPiPActive, setIsPiPActive] = useState(false);
  const [autoPiPOnLeave, setAutoPiPOnLeave] = useState(true);

  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    currentItem,
    status,
    position,
    duration,
    rate,
    setStatus,
    setRate,
    playNext,
    playPrevious,
    seekTo,
  } = usePlayerStore();

  // Auto-hide controls (skip while in PiP – system owns the UI)
  const resetHideTimer = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    if (isPiPActive) return;
    setShowControls(true);
    if (!locked) {
      hideTimer.current = setTimeout(() => setShowControls(false), 4000);
    }
  }, [locked, isPiPActive]);

  useEffect(() => {
    resetHideTimer();
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [resetHideTimer]);

  useEffect(() => {
    if (scrubPosition !== null) {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      setShowControls(true);
    }
  }, [scrubPosition]);

  // When entering PiP, hide our overlay controls
  useEffect(() => {
    if (isPiPActive) {
      setShowControls(false);
      if (hideTimer.current) clearTimeout(hideTimer.current);
    } else {
      resetHideTimer();
    }
  }, [isPiPActive, resetHideTimer]);

  if (!currentItem) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>No video selected</Text>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.link}>Close</Text>
        </Pressable>
      </View>
    );
  }

  const isPlaying = status === 'playing';
  const isError = status === 'error';
  const displayPosition = scrubPosition ?? position;
  const progress = duration > 0 ? displayPosition / duration : 0;

  const formatTime = (sec: number) => {
    if (!isFinite(sec) || sec < 0) return '0:00';
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = Math.floor(sec % 60);
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const togglePlay = () => {
    setStatus(isPlaying ? 'paused' : 'playing');
    resetHideTimer();
  };

  const toggleControls = () => {
    if (locked || isPiPActive) return;
    if (showControls) {
      setShowControls(false);
      if (hideTimer.current) clearTimeout(hideTimer.current);
    } else {
      resetHideTimer();
    }
  };

  const cycleSpeed = () => {
    const idx = PlaybackSpeeds.indexOf(rate as (typeof PlaybackSpeeds)[number]);
    const next = PlaybackSpeeds[(idx + 1) % PlaybackSpeeds.length];
    setRate(next);
    resetHideTimer();
  };

  const cycleAspect = () => {
    const modes: AspectMode[] = ['contain', 'cover', 'stretch'];
    const idx = modes.indexOf(aspectMode);
    setAspectMode(modes[(idx + 1) % modes.length]);
    resetHideTimer();
  };

  const seekBy = (delta: number) => {
    const next = Math.max(0, Math.min(duration, position + delta));
    videoRef.current?.seek(next);
    seekTo(next);
    resetHideTimer();
  };

  const enterPictureInPicture = () => {
    videoRef.current?.enterPiP();
    resetHideTimer();
  };

  const onProgressLayout = (e: LayoutChangeEvent) => {
    setProgressBarWidth(e.nativeEvent.layout.width);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !locked && !isPiPActive,
      onMoveShouldSetPanResponder: () => !locked && !isPiPActive,
      onPanResponderGrant: (evt) => {
        const x = evt.nativeEvent.locationX;
        const ratio = Math.max(0, Math.min(1, x / progressBarWidth));
        setScrubPosition(ratio * duration);
      },
      onPanResponderMove: (evt) => {
        const x = evt.nativeEvent.locationX;
        const ratio = Math.max(0, Math.min(1, x / progressBarWidth));
        setScrubPosition(ratio * duration);
      },
      onPanResponderRelease: (evt) => {
        const x = evt.nativeEvent.locationX;
        const ratio = Math.max(0, Math.min(1, x / progressBarWidth));
        const newPos = ratio * duration;
        videoRef.current?.seek(newPos);
        seekTo(newPos);
        setScrubPosition(null);
        resetHideTimer();
      },
    })
  ).current;

  return (
    <View style={styles.container}>
      <StatusBar hidden={!showControls || isPiPActive} />

      {/* Real video surface */}
      <Pressable style={styles.videoArea} onPress={toggleControls}>
        <VideoPlayer
          ref={videoRef}
          item={currentItem}
          style={StyleSheet.absoluteFillObject}
          resizeMode={aspectMode}
          enterPictureInPictureOnLeave={autoPiPOnLeave}
          onError={() => setIsBuffering(false)}
          onPictureInPictureStatusChanged={(active) => {
            setIsPiPActive(active);
          }}
        />

        {(status === 'loading' || isBuffering) && !isPiPActive && (
          <View style={styles.centerOverlay}>
            <ActivityIndicator size="large" color="#FFF" />
          </View>
        )}

        {isError && !isPiPActive && (
          <View style={styles.centerOverlay}>
            <Ionicons name="alert-circle" size={48} color="#F87171" />
            <Text style={styles.errorText}>Unable to play this video</Text>
            <Text style={styles.errorSub}>
              Format may not be supported on this device
            </Text>
            <Pressable
              style={styles.retryBtn}
              onPress={() => setStatus('playing')}
            >
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        )}
      </Pressable>

      {/* Controls overlay – hidden while in system PiP */}
      {showControls && !isPiPActive && (
        <View
          style={[styles.overlay, { paddingTop: insets.top }]}
          pointerEvents="box-none"
        >
          {/* Top bar */}
          <View style={styles.topBar}>
            <IconButton
              name="chevron-back"
              size={28}
              color="#FFF"
              onPress={() => router.back()}
            />
            <Text style={styles.videoTitle} numberOfLines={1}>
              {currentItem.title}
            </Text>

            {/* Picture-in-Picture button */}
            <IconButton
              name="tablet-landscape-outline"
              size={22}
              color="#FFF"
              onPress={enterPictureInPicture}
            />

            <IconButton
              name={locked ? 'lock-closed' : 'lock-open'}
              size={22}
              color="#FFF"
              onPress={() => {
                setLocked((v) => !v);
                resetHideTimer();
              }}
            />
          </View>

          {/* Center controls */}
          {!locked && (
            <View style={styles.centerControls} pointerEvents="box-none">
              <IconButton
                name="play-back"
                size={32}
                color="#FFF"
                onPress={() => seekBy(-10)}
              />
              <IconButton
                name="play-skip-back"
                size={36}
                color="#FFF"
                onPress={() => {
                  playPrevious();
                  resetHideTimer();
                }}
              />
              <Pressable style={styles.playBtn} onPress={togglePlay}>
                <Ionicons
                  name={isPlaying ? 'pause' : 'play'}
                  size={42}
                  color="#FFF"
                />
              </Pressable>
              <IconButton
                name="play-skip-forward"
                size={36}
                color="#FFF"
                onPress={() => {
                  playNext();
                  resetHideTimer();
                }}
              />
              <IconButton
                name="play-forward"
                size={32}
                color="#FFF"
                onPress={() => seekBy(10)}
              />
            </View>
          )}

          {/* Bottom bar */}
          {!locked && (
            <View
              style={[styles.bottomBar, { paddingBottom: insets.bottom + 8 }]}
            >
              <View style={styles.progressRow}>
                <Text style={styles.time}>{formatTime(displayPosition)}</Text>
                <View
                  style={styles.progressTrack}
                  onLayout={onProgressLayout}
                  {...panResponder.panHandlers}
                >
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${Math.min(100, progress * 100)}%` },
                    ]}
                  />
                  <View
                    style={[
                      styles.scrubber,
                      { left: `${Math.min(100, progress * 100)}%` },
                    ]}
                  />
                </View>
                <Text style={styles.time}>{formatTime(duration)}</Text>
              </View>

              <View style={styles.bottomActions}>
                <Pressable onPress={cycleSpeed} hitSlop={12}>
                  <Text style={styles.speedText}>{rate}x</Text>
                </Pressable>

                <IconButton
                  name="text"
                  size={22}
                  color="#FFF"
                  onPress={resetHideTimer}
                />

                <IconButton
                  name="scan-outline"
                  size={22}
                  color="#FFF"
                  onPress={cycleAspect}
                />

                {/* Toggle auto-PiP when leaving app */}
                <Pressable
                  onPress={() => {
                    setAutoPiPOnLeave((v) => !v);
                    resetHideTimer();
                  }}
                  hitSlop={8}
                  style={styles.autoPipBtn}
                >
                  <Ionicons
                    name={autoPiPOnLeave ? 'phone-landscape' : 'phone-portrait-outline'}
                    size={20}
                    color={autoPiPOnLeave ? Colors.dark.primary : '#FFF'}
                  />
                </Pressable>

                <IconButton
                  name="settings-outline"
                  size={22}
                  color="#FFF"
                  onPress={resetHideTimer}
                />
              </View>
            </View>
          )}
        </View>
      )}

      {/* Small indicator when returning from PiP (optional) */}
      {isPiPActive && (
        <View style={[styles.pipBadge, { top: insets.top + 8 }]}>
          <Ionicons name="tablet-landscape-outline" size={14} color="#FFF" />
          <Text style={styles.pipBadgeText}>PiP Active</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  videoArea: {
    ...StyleSheet.absoluteFillObject,
  },
  centerOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  emptyText: {
    color: '#FFF',
    fontSize: FontSize.lg,
    textAlign: 'center',
    marginTop: 100,
  },
  link: {
    color: Colors.dark.primary,
    textAlign: 'center',
    marginTop: 16,
    fontSize: FontSize.md,
  },
  errorText: {
    color: '#FFF',
    fontSize: FontSize.lg,
    fontWeight: '600',
    marginTop: 12,
  },
  errorSub: {
    color: '#AAA',
    fontSize: FontSize.sm,
    marginTop: 6,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  retryBtn: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: Colors.dark.primary,
    borderRadius: 8,
  },
  retryText: {
    color: '#FFF',
    fontWeight: '600',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    backgroundColor: 'rgba(0,0,0,0.55)',
    gap: 4,
  },
  videoTitle: {
    flex: 1,
    color: '#FFF',
    fontSize: FontSize.md,
    fontWeight: '600',
    marginHorizontal: 8,
  },
  centerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 28,
  },
  playBtn: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomBar: {
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: Spacing.md,
    paddingTop: 12,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  time: {
    color: '#FFF',
    fontSize: FontSize.sm,
    minWidth: 42,
    fontVariant: ['tabular-nums'],
  },
  progressTrack: {
    flex: 1,
    height: 20,
    justifyContent: 'center',
  },
  progressFill: {
    height: 3,
    backgroundColor: Colors.dark.primary,
    borderRadius: 2,
  },
  scrubber: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#FFF',
    marginLeft: -7,
    top: 3,
  },
  bottomActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginTop: 10,
  },
  speedText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: FontSize.md,
  },
  autoPipBtn: {
    padding: 8,
  },
  pipBadge: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  pipBadgeText: {
    color: '#FFF',
    fontSize: FontSize.xs,
    fontWeight: '600',
  },
});
