# Flex Streaming

Modern cross-platform media player built with **React Native + Expo**.

Inspired by the best of VLC, KMPlayer, MX Player, Kodi and MPV — implemented with original architecture and UX.

## Features (Current Starter)

- Expo Router file-based navigation
- Bottom tab navigation (Home / Music / Videos / Playlists / Search / Profile)
- Mini player + full-screen Audio & Video players
- Zustand state management (player, library, settings)
- Theme system (Light / Dark / AMOLED)
- Media library scanning foundation (`expo-media-library`)
- Queue, shuffle, repeat, playback speed
- Placeholder structure for cloud, network, subtitles, equalizer, AI features

## Tech Stack

| Layer              | Technology                          |
|--------------------|-------------------------------------|
| Framework          | Expo SDK 52 + React Native 0.76     |
| Language           | TypeScript                          |
| Navigation         | Expo Router 4                       |
| State              | Zustand                             |
| Video              | react-native-video                  |
| Audio              | react-native-track-player + Expo AV |
| Storage            | MMKV + SQLite (planned)             |
| Gestures / Anim    | Reanimated + Gesture Handler        |

## Getting Started

```bash
# 1. Install dependencies
npm install
# or
yarn install

# 2. Start the development server
npx expo start

# 3. Run on device / emulator
# Press `a` for Android or `i` for iOS
```

### Required native configuration

- **Android**: Storage & media permissions are declared in `app.json`.
- **iOS**: Background audio mode and photo library usage descriptions are set.
- For full format support (MKV, HEVC, AV1, DTS, etc.) you will need to integrate a native media engine (FFmpeg / VLC / ExoPlayer custom builds) later.

## Project Structure

```
flex-streaming/
├── app/                    # Expo Router screens
│   ├── (tabs)/             # Bottom tabs
│   │   ├── index.tsx       # Home dashboard
│   │   ├── music.tsx
│   │   ├── videos.tsx
│   │   ├── playlists.tsx
│   │   ├── search.tsx
│   │   └── profile.tsx     # Settings
│   ├── player/
│   │   ├── audio.tsx       # Full screen audio player
│   │   └── video.tsx       # Full screen video player
│   └── _layout.tsx
├── components/
│   ├── player/             # MiniPlayer, etc.
│   ├── ui/                 # MediaCard, IconButton...
│   ├── media/
│   └── library/
├── store/                  # Zustand stores
├── services/               # Media scanner, cloud, etc.
├── types/
├── constants/
└── assets/
```

## Roadmap (from the original plan)

### Phase 1 – MVP (this starter + next steps)
- [x] Core navigation & UI shell
- [x] Player state & mini / full players
- [x] Real `react-native-video` integration (play / pause / seek / speed / aspect / lock)
- [x] ExoPlayer on Android (DASH/HLS/RTSP/SS, buffer presets, track selection, ABR cap)
- [x] Full device / external storage media scanner
- [x] FFmpeg / FFprobe metadata (duration, codec, bitrate, fps, tags)
- [x] expo-video-metadata primary path for video (Mediabunny, light)
- [ ] Track Player integration for background audio
- [ ] Library persistence (SQLite / MMKV)
- [ ] Basic resume / continue watching
- [ ] Subtitle loading (SRT/VTT)

### Phase 2
- Equalizer, gapless, crossfade
- Folder browser + hidden folders
- Playlist import/export (M3U)
- Network streaming (HTTP/HLS)
- [x] Picture-in-Picture (system PiP on Android 8+ / iOS 14+)
- Floating window (in-app)

### Phase 3
- Cloud providers (Drive, OneDrive, Dropbox, S3, WebDAV, SMB)
- Advanced subtitle controls & download
- Hardware acceleration options
- Android TV support

### Phase 4+
- AI recommendations, chapter detection, subtitle translation
- Chromecast / AirPlay
- Multi-device sync
- Plugin system & theme marketplace

## Important Notes

1. **Development build required** – `react-native-video` is a native module. It does **not** work inside Expo Go. Create a development build:
   ```bash
   npx expo prebuild
   npx expo run:android   # or run:ios
   # or use EAS Build
   ```
2. **Format support** – `react-native-video` (ExoPlayer on Android / AVPlayer on iOS) covers most common formats. Full MKV / HEVC / Dolby / 8K still benefits from extra native engines later.
3. **Permissions** – Test on real devices; simulators have limited media libraries.
4. **Background playback** – Track Player + proper background modes are required for continuous audio.
5. **Performance** – Large libraries need efficient indexing and virtualized lists (already using FlatList).
6. **Picture-in-Picture** – Enabled via `react-native-video` (v6.9+) and the Expo config plugin. On Android the whole activity enters PiP; on iOS the video layer floats. Requires a real device (not all simulators support PiP).
7. **FFmpeg** – `ffmpeg-kit-react-native` is a large native dependency. Use a development / EAS build. The scanner falls back gracefully if the module is missing. Prefer the `https` package variant to keep binary size reasonable.

## License

Private / All rights reserved (replace with your preferred license).

---

Built as a clean foundation for the complete **Flex Streaming** vision.
