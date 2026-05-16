# ReClip (Android)

ReClip is an on-device Android downloader for video and audio links.  
It supports direct paste and app-to-app sharing, then downloads and processes media locally on your phone.

## What ReClip can do

- Download video from supported sources in selectable quality
- Extract audio with embedded metadata and artwork
- Handle Spotify links in audio mode (with Pro entitlement)
- Show live download progress and status
- Save completed files to `Downloads/ReClip`
- Open and share downloaded files from inside the app

## Why ReClip is better than common alternatives

- **On-device processing**: no external conversion server required
- **More private by design**: your media flow stays local to your device runtime
- **More reliable**: not dependent on a third-party "download website" being online
- **Cleaner UX**: native Android app flow with share intent support and progress notifications
- **Single destination**: consistent output location in `Downloads/ReClip`

## Tech overview

- Android app host: Java/Kotlin
- UI: WebView (HTML/CSS/JS)
- Media engine: Python + yt-dlp (Chaquopy)
- Transcoding/muxing: bundled FFmpeg binaries
- Billing/entitlements: RevenueCat (native Android SDK)

## Build requirements

- JDK 21 (for Gradle/AGP toolchain)
- Android bytecode target remains Java/Kotlin 17
- Android SDK + build tools configured locally

## Build

```powershell
.\gradlew.bat :app:assembleDebug
```

Install to a connected device:

```powershell
.\gradlew.bat :app:installDebug
```

## Notes

- Spotify API credentials must be provided at build time for Spotify metadata/download resolution.
- Pro-gated features (like audio extraction/Spotify flow) depend on RevenueCat entitlement mapping in your project configuration.

## License

MIT
