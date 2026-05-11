# ReClip for Android

A fully self-contained Android app for downloading videos and audio from 1000+ sites. **No server required** — the yt-dlp engine runs directly on your device.

## Architecture

```
┌─────────────────────────────────────────────┐
│              Android App                     │
│                                              │
│  ┌──────────────┐    ┌───────────────────┐  │
│  │  WebView UI  │◄──►│  Java Bridge      │  │
│  │  (HTML/JS)   │    │  (ReClipBridge)    │  │
│  └──────────────┘    └────────┬──────────┘  │
│                               │              │
│                    ┌──────────▼──────────┐  │
│                    │  Chaquopy Python    │  │
│                    │  Runtime            │  │
│                    │  ┌────────────────┐ │  │
│                    │  │  reclip_engine │ │  │
│                    │  │  (yt-dlp)      │ │  │
│                    │  └────────────────┘ │  │
│                    └─────────────────────┘  │
│                                              │
│  Downloads → /Download/ReClip/               │
└─────────────────────────────────────────────┘
```

**How it works:**

1. The UI runs in a WebView (pure HTML/CSS/JS — no framework, no build step)
2. A `@JavascriptInterface` bridge (`ReClipBridge`) connects the UI to native code
3. The bridge calls Python functions via **Chaquopy** (embedded CPython for Android)
4. `reclip_engine.py` wraps yt-dlp — the same engine powering the original ReClip
5. Downloads save directly to `Downloads/ReClip/` on the device
6. No Flask server, no localhost, no network service — everything is in-process

## Features

- **Fully offline engine** — yt-dlp runs natively on-device
- **1000+ supported sites** — YouTube, TikTok, Instagram, X, Reddit, etc.
- **MP4 video or MP3 audio** extraction
- **Quality picker** — choose resolution per video
- **Bulk downloads** — paste multiple URLs at once
- **Share-to-download** — share a URL from any app directly to ReClip
- **Real-time progress** — live percentage and speed during downloads
- **Open & Share** — play or share downloaded files instantly
- **Foreground service** — downloads continue when app is backgrounded
- **No ads, no tracking, no cloud** — your media stays on your device

## Building

### Prerequisites

- Android Studio Hedgehog (2023.1.1) or newer
- JDK 17
- Android SDK 34

### Steps

1. Clone or copy this project
2. Open in Android Studio
3. Let Gradle sync (Chaquopy will download Python + yt-dlp automatically)
4. Build & run on a device or emulator

```bash
# Or from command line:
./gradlew assembleDebug
adb install app/build/outputs/apk/debug/app-debug.apk
```

> **Note:** First build takes ~5 min as Chaquopy downloads and packages the Python runtime + yt-dlp. Subsequent builds are fast.

### FFmpeg (optional but recommended)

For audio extraction (MP3) and format merging, yt-dlp needs ffmpeg. Options:

1. **Termux ffmpeg**: Install Termux, run `pkg install ffmpeg`, and the app will find it
2. **Bundle it**: Add a prebuilt ffmpeg binary to `app/src/main/assets/` and copy it to internal storage on first launch
3. **Without ffmpeg**: Video downloads still work; audio extraction and format merging may be limited

## Project Structure

```
app/
├── src/main/
│   ├── AndroidManifest.xml          # Permissions, services, intent filters
│   ├── assets/www/
│   │   └── index.html               # Complete UI (single file, no build step)
│   ├── java/com/reclip/app/
│   │   ├── ReClipApplication.java   # App init, Python startup, notification channel
│   │   ├── MainActivity.java        # WebView host + JS↔Python bridge
│   │   └── DownloadService.java     # Foreground service for background downloads
│   ├── python/
│   │   └── reclip_engine.py         # yt-dlp wrapper (info, download, progress)
│   └── res/
│       ├── layout/activity_main.xml
│       ├── values/strings.xml, styles.xml
│       ├── drawable/ic_launcher.xml
│       └── xml/file_paths.xml, network_security_config.xml
├── build.gradle                     # Chaquopy plugin + yt-dlp pip dependency
└── proguard-rules.pro
```

## How the Bridge Works

The JS UI calls native functions through `window.ReClip`:

```javascript
// Fetch video info (async, callback-based)
ReClip.fetchInfo(url, callbackId);

// Start download (async, callback-based)
ReClip.startDownload(url, 'video', '137', 'Title', callbackId);

// Poll progress (synchronous, returns JSON string)
ReClip.getProgress();  // → {"percent": 45.2, "speed": "2.1MiB/s", "status": "downloading"}

// Clipboard, file operations (synchronous)
ReClip.getClipboard();
ReClip.openFile(path);
ReClip.shareFile(path);
```

Java receives these calls on background threads, runs yt-dlp via Chaquopy, and posts results back to the WebView via `evaluateJavascript()`.

## License

MIT — same as the original ReClip project.
