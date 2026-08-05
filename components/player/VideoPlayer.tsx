import React, {
  useRef,
  useEffect,
  useCallback,
  useMemo,
  forwardRef,
  useImperativeHandle,
  useState,
} from 'react';
import { StyleSheet, View, ViewStyle, Platform } from 'react-native';
import Video, {
  OnLoadData,
  OnProgressData,
  OnVideoErrorData,
  VideoRef,
  ResizeMode,
  SelectedTrackType,
  SelectedVideoTrackType,
} from 'react-native-video';
import { usePlayerStore } from '@/store/playerStore';
import { useSettingsStore } from '@/store/settingsStore';
import { MediaItem } from '@/types/media';
import {
  BUFFER_PRESETS,
  pickBufferPreset,
  guessContentType,
  resolutionToMaxBitRate,
  IS_ANDROID,
  VideoTrackSelection,
  AudioTrackSelection,
  TextTrackSelection,
} from '@/services/exoPlayerConfig';

export type AspectMode = 'contain' | 'cover' | 'stretch' | 'none';

export interface VideoPlayerHandle {
  seek: (seconds: number) => void;
  play: () => void;
  pause: () => void;
  enterPiP: () => void;
  exitPiP: () => void;
  /** Select ExoPlayer video track by resolution height or auto */
  setVideoTrack: (selection: VideoTrackSelection) => void;
  setAudioTrack: (selection: AudioTrackSelection) => void;
  setTextTrack: (selection: TextTrackSelection) => void;
}

interface VideoPlayerProps {
  item: MediaItem;
  style?: ViewStyle;
  resizeMode?: AspectMode;
  enterPictureInPictureOnLeave?: boolean;
  /** External / sidecar subtitles */
  textTracks?: Array<{
    title?: string;
    language?: string;
    type: 'application/x-subrip' | 'text/vtt' | 'application/ttml+xml' | string;
    uri: string;
  }>;
  onError?: (error: OnVideoErrorData) => void;
  onEnd?: () => void;
  onPictureInPictureStatusChanged?: (isActive: boolean) => void;
  onTracksChanged?: (data: {
    audioTracks: OnLoadData['audioTracks'];
    textTracks: OnLoadData['textTracks'];
    videoTracks?: any[];
  }) => void;
  onBandwidthUpdate?: (bitrate: number) => void;
}

const RESIZE_MAP: Record<AspectMode, ResizeMode> = {
  contain: ResizeMode.CONTAIN,
  cover: ResizeMode.COVER,
  stretch: ResizeMode.STRETCH,
  none: ResizeMode.NONE,
};

function mapVideoTrack(sel: VideoTrackSelection) {
  switch (sel.type) {
    case 'disabled':
      return { type: SelectedVideoTrackType.DISABLED };
    case 'resolution':
      return { type: SelectedVideoTrackType.RESOLUTION, value: sel.value };
    case 'index':
      return { type: SelectedVideoTrackType.INDEX, value: sel.value };
    default:
      return { type: SelectedVideoTrackType.AUTO };
  }
}

function mapAudioOrTextTrack(sel: AudioTrackSelection | TextTrackSelection) {
  switch (sel.type) {
    case 'disabled':
      return { type: SelectedTrackType.DISABLED };
    case 'title':
      return { type: SelectedTrackType.TITLE, value: sel.value };
    case 'language':
      return { type: SelectedTrackType.LANGUAGE, value: sel.value };
    case 'index':
      return { type: SelectedTrackType.INDEX, value: sel.value };
    default:
      return { type: SelectedTrackType.SYSTEM };
  }
}

export const VideoPlayer = forwardRef<VideoPlayerHandle, VideoPlayerProps>(
  function VideoPlayer(
    {
      item,
      style,
      resizeMode = 'contain',
      enterPictureInPictureOnLeave = true,
      textTracks,
      onError,
      onEnd,
      onPictureInPictureStatusChanged,
      onTracksChanged,
      onBandwidthUpdate,
    },
    ref
  ) {
    const videoRef = useRef<VideoRef>(null);

    const {
      status,
      rate,
      volume,
      isMuted,
      position,
      setStatus,
      setPosition,
      setDuration,
      seekTo,
      playNext,
    } = usePlayerStore();

    const {
      hardwareDecoder,
      lowMemoryMode,
      maxResolution,
      bufferPreset,
      rememberPosition,
    } = useSettingsStore();

    const [videoTrack, setVideoTrackState] = useState<VideoTrackSelection>(
      maxResolution > 0
        ? { type: 'resolution', value: maxResolution }
        : { type: 'auto' }
    );
    const [audioTrack, setAudioTrackState] = useState<AudioTrackSelection>({
      type: 'system',
    });
    const [textTrack, setTextTrackState] = useState<TextTrackSelection>({
      type: 'disabled',
    });

    const isPaused = status === 'paused' || status === 'idle';

    // Resolve ExoPlayer buffer config
    const bufferConfig = useMemo(() => {
      const presetName =
        bufferPreset ?? pickBufferPreset(item.uri, lowMemoryMode);
      return BUFFER_PRESETS[presetName];
    }, [item.uri, lowMemoryMode, bufferPreset]);

    const contentType = useMemo(
      () => guessContentType(item.uri),
      [item.uri]
    );

    const maxBitRate = useMemo(() => {
      if (videoTrack.type === 'resolution') {
        return resolutionToMaxBitRate(videoTrack.value);
      }
      if (maxResolution > 0) return resolutionToMaxBitRate(maxResolution);
      return 0;
    }, [videoTrack, maxResolution]);

    useImperativeHandle(ref, () => ({
      seek: (seconds: number) => {
        videoRef.current?.seek(seconds);
        seekTo(seconds);
      },
      play: () => setStatus('playing'),
      pause: () => setStatus('paused'),
      enterPiP: () => {
        try {
          (videoRef.current as any)?.enterPictureInPicture?.();
        } catch (e) {
          console.warn('[VideoPlayer] enterPiP failed', e);
        }
      },
      exitPiP: () => {
        try {
          (videoRef.current as any)?.exitPictureInPicture?.();
        } catch (e) {
          console.warn('[VideoPlayer] exitPiP failed', e);
        }
      },
      setVideoTrack: (sel) => setVideoTrackState(sel),
      setAudioTrack: (sel) => setAudioTrackState(sel),
      setTextTrack: (sel) => setTextTrackState(sel),
    }));

    useEffect(() => {
      setStatus('loading');
      setPosition(0);
      // Reset tracks when item changes
      setVideoTrackState(
        maxResolution > 0
          ? { type: 'resolution', value: maxResolution }
          : { type: 'auto' }
      );
      setAudioTrackState({ type: 'system' });
      setTextTrackState({ type: 'disabled' });
    }, [item.id, setStatus, setPosition, maxResolution]);

    const handleLoad = useCallback(
      (data: OnLoadData) => {
        setDuration(data.duration);
        setStatus('playing');

        onTracksChanged?.({
          audioTracks: data.audioTracks,
          textTracks: data.textTracks,
          videoTracks: (data as any).videoTracks,
        });

        // Resume from last position if enabled
        if (
          rememberPosition &&
          item.lastPlayed &&
          item.lastPlayed > 0 &&
          item.lastPlayed < data.duration - 2
        ) {
          videoRef.current?.seek(item.lastPlayed);
          seekTo(item.lastPlayed);
        }
      },
      [
        setDuration,
        setStatus,
        onTracksChanged,
        rememberPosition,
        item.lastPlayed,
        seekTo,
      ]
    );

    const handleProgress = useCallback(
      (data: OnProgressData) => {
        setPosition(data.currentTime);
      },
      [setPosition]
    );

    const handleEnd = useCallback(() => {
      setStatus('ended');
      if (onEnd) onEnd();
      else playNext();
    }, [setStatus, onEnd, playNext]);

    const handleError = useCallback(
      (error: OnVideoErrorData) => {
        console.warn('[VideoPlayer/ExoPlayer] error', error);
        setStatus('error');
        onError?.(error);
      },
      [setStatus, onError]
    );

    const handlePiPStatusChanged = useCallback(
      (payload: { isActive: boolean }) => {
        onPictureInPictureStatusChanged?.(payload.isActive);
      },
      [onPictureInPictureStatusChanged]
    );

    const handleRestoreUserInterfaceForPiPStop = useCallback(() => {
      try {
        (videoRef.current as any)?.restoreUserInterfaceForPictureInPictureStopCompleted?.(
          true
        );
      } catch {
        // optional API
      }
      onPictureInPictureStatusChanged?.(false);
    }, [onPictureInPictureStatusChanged]);

    const handleBandwidth = useCallback(
      (data: { bitrate: number }) => {
        onBandwidthUpdate?.(data.bitrate);
      },
      [onBandwidthUpdate]
    );

    if (!item?.uri) {
      return <View style={[styles.container, style]} />;
    }

    // Source object – ExoPlayer reads type / bufferConfig from source on newer APIs
    const source: any = {
      uri: item.uri,
      type: contentType,
      bufferConfig: IS_ANDROID ? bufferConfig : undefined,
      // Helps ExoPlayer treat local files correctly
      isNetwork: /^https?:\/\//i.test(item.uri),
    };

    if (textTracks && textTracks.length > 0) {
      source.textTracks = textTracks;
    }

    return (
      <View style={[styles.container, style]}>
        <Video
          key={item.id}
          ref={videoRef}
          source={source}
          style={StyleSheet.absoluteFill}
          resizeMode={RESIZE_MAP[resizeMode]}
          paused={isPaused}
          rate={rate}
          volume={isMuted ? 0 : volume}
          muted={isMuted}
          progressUpdateInterval={250}
          onLoad={handleLoad}
          onProgress={handleProgress}
          onEnd={handleEnd}
          onError={handleError}
          // --- ExoPlayer (Android) ---
          bufferConfig={IS_ANDROID ? bufferConfig : undefined}
          selectedVideoTrack={
            IS_ANDROID ? mapVideoTrack(videoTrack) : undefined
          }
          selectedAudioTrack={mapAudioOrTextTrack(audioTrack)}
          selectedTextTrack={mapAudioOrTextTrack(textTrack)}
          // Prefer MediaCodec hardware path when enabled
          // (ExoPlayer chooses HW decoders by default; this discourages software fallbacks)
          useTextureView={true}
          // Max bitrate for ABR ladders
          maxBitRate={maxBitRate > 0 ? maxBitRate : undefined}
          reportBandwidth={IS_ANDROID}
          onBandwidthUpdate={IS_ANDROID ? handleBandwidth : undefined}
          // Prevents decoder reuse issues on some devices when HW decode is forced
          disableFocus={false}
          // --- PiP ---
          enterPictureInPictureOnLeave={enterPictureInPictureOnLeave}
          onPictureInPictureStatusChanged={handlePiPStatusChanged}
          onRestoreUserInterfaceForPictureInPictureStop={
            Platform.OS === 'ios'
              ? handleRestoreUserInterfaceForPiPStop
              : undefined
          }
          playWhenInactive={true}
          playInBackground={false}
          ignoreSilentSwitch="ignore"
          controls={false}
          // Debug / quality
          automaticallyWaitsToMinimizeStalling={Platform.OS === 'ios'}
          // Optional: shutter color while first frame loads
          shutterColor="#000000"
        />
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#000',
    overflow: 'hidden',
  },
});
