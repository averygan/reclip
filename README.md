# ReClip (Codex Branch)

ReClip is an Android app for on-device media downloading.  
It fetches metadata and downloads video/audio locally using yt-dlp + FFmpeg, without relying on external conversion servers.

## What ReClip does

- Download video in source-available resolutions
- Download audio with Pro processing profiles
- Handle app-to-app share links (including Spotify and YouTube-family links)
- Show download progress and runtime diagnostics
- Save media to `Downloads/ReClip`

## Why ReClip is useful

- Local-first processing (privacy and reliability)
- No dependency on third-party downloader websites
- Fast share-to-download flow
- Clear quality controls for both video and Pro audio
- Native Android billing and entitlement handling with RevenueCat

## Current key features (Codex)

- Video quality selector cards with bitrate metadata
- Persistent video quality preference (per-device, local storage)
- Pro audio processing profiles:
  - `mp3_320_cbr`
  - `mp3_v0_vbr`
  - `mp3_256_cbr`
  - `flac_lossless`
- Persistent audio profile preference (per-device, local storage)
- Runtime Status panel includes:
  - yt-dlp version
  - FFmpeg availability/path
  - MP3 encoder support
  - active audio profile
  - supported audio profile summary
- Pro-aware share routing:
  - Spotify links auto-route to Audio
  - `music.youtube.com`, `m.youtube.com`, and `youtu.be` auto-route to Audio for Pro users

## Build requirements

- JDK 21
- Android SDK/Build Tools
- Gradle wrapper in repo

## Build and install

```powershell
.\gradlew.bat :app:assembleDebug
.\gradlew.bat :app:installDebug
```

## Notes

- Pro-gated audio features depend on active RevenueCat entitlement mapping.
- Spotify support requires build-time credentials:
  - `SPOTIFY_CLIENT_ID`
  - `SPOTIFY_CLIENT_SECRET`

## Branch and CI

- Active branch target: `Codex`
- GitHub Actions build workflow publishes APK artifacts for successful runs.

## License

MIT
