# ReClip for Android

A fully self-contained Android app for downloading videos and audio from **1000+ websites**. Everything runs locally on your device — **no server, no internet dependency, no cloud required**. yt-dlp engine + FFmpeg bundled directly in the APK.

**Download from 1000+ sites:** YouTube, TikTok, Instagram, X/Twitter, Reddit, Facebook, Vimeo, Twitch, SoundCloud, Threads, LinkedIn, Dailymotion, and more.

## Features

✅ **On-device processing** — yt-dlp + FFmpeg run natively, no server needed  
✅ **MP4 video + MP3 audio** — Extract either format from any supported site  
✅ **Quality picker** — Choose resolution for video downloads  
✅ **Bulk downloads** — Paste multiple URLs, download all at once  
✅ **Share-to-download** — Share a URL from any app directly into ReClip  
✅ **Real-time progress** — Live percentage, speed, and ETA  
✅ **Open & Share** — Play or send downloaded files instantly  
✅ **Background downloads** — Continue when app is backgrounded  
✅ **No ads, no tracking, no cloud** — Everything stays on your phone  

## Architecture

### How It Works

```
┌─────────────────────────────────────────────┐
│         ReClip Android App                   │
│                                              │
│  ┌──────────────────┐  ┌────────────────┐  │
│  │   WebView UI     │◄─┤  Java Bridge   │  │
│  │  (HTML/CSS/JS)   │  │ (ReClipBridge) │  │
│  └──────────────────┘  └────────┬───────┘  │
│                                 │           │
│                    ┌────────────▼────────┐  │
│                    │ Chaquopy Python     │  │
│                    │ Runtime (embedded)  │  │
│                    │ ┌──────────────────┐ │  │
│                    │ │  reclip_engine   │ │  │
│                    │ │  (yt-dlp wrapper)│ │  │
│                    │ └──────────────────┘ │  │
│                    └──────────┬───────────┘  │
│                               │              │
│                    ┌──────────▼───────────┐  │
│                    │  FFmpeg Binary      │  │
│                    │  (arm64-v8a/x86_64) │  │
│                    │  (extracted from    │  │
│                    │   jniLibs/ at boot) │  │
│                    └─────────────────────┘  │
│                                              │
│  Downloads → /storage/.../Download/ReClip/  │
└─────────────────────────────────────────────┘
```

**The flow:**

1. **UI Layer** — Pure HTML/CSS/JavaScript running in an Android WebView. No framework, no build step. Clean, responsive design with dark theme.

2. **Java Bridge** — `ReClipBridge` exposes native functions to the WebView:
   - `fetchInfo(url)` — Get video metadata via yt-dlp
   - `startDownload(url, format, quality)` — Trigger download
   - `getProgress()` — Poll download status
   - `openFile()`, `shareFile()` — Open/share downloads
   - `getClipboard()` — Paste URLs

3. **Python Engine** (`reclip_engine.py`) — Runs on background threads via Chaquopy (embedded CPython for Android). Wraps yt-dlp and handles:
   - Video metadata extraction
   - Download orchestration
   - Progress tracking
   - FFmpeg path configuration

4. **FFmpeg Binary** — Compiled for Android during CI (GitHub Actions), bundled as `libffmpeg.so` in `jniLibs/`. Android auto-extracts to `nativeLibraryDir` on install. ReClipApplication locates it at startup.

5. **Downloads** — Saved to `Downloads/ReClip/` on device storage. Accessible via Files app or other media players.

## Building Locally

### Prerequisites

- **Android Studio** (Hedgehog 2023.1.1 or newer)
- **JDK 17+**
- **Android SDK 34**
- **Android NDK r27c** (for compiling FFmpeg from source)

### Quick Start

1. **Clone the repo and check out the android branch:**
   ```bash
   git clone https://github.com/waynekosterjr-hub/reclip.git
   cd reclip
   git checkout android
   ```

2. **Open in Android Studio:**
   - File → Open → select the `reclip` folder
   - Let Gradle sync (this takes ~2-3 min, installs Python runtime + yt-dlp)

3. **Build & run:**
   - Plug in a phone via USB (or use emulator)
   - Click **Run** (green play button) or `Shift+F10`
   - First build takes ~5 min, subsequent builds are fast

### Build Variants

**Debug APK** (for testing):
```bash
./gradlew assembleDebug
# Output: app/build/outputs/apk/debug/app-debug.apk
```

**Release APK** (unsigned, ready for signing):
```bash
./gradlew assembleRelease
# Output: app/build/outputs/apk/release/app-release-unsigned.apk
```

### First-Run Setup

On first launch, `ReClipApplication.onCreate()` automatically:
1. Initializes the Chaquopy Python runtime
2. Locates the bundled FFmpeg binary in `nativeLibraryDir`
3. Makes it executable
4. Passes the path to the Python engine

This all happens in ~1 second. You'll see the engine status in the top badge.

## Local Development

### Project Structure

```
reclip/
├── .github/workflows/
│   └── build.yml                    # GitHub Actions: ffmpeg build + APK build
├── app/
│   ├── build.gradle                 # App dependencies, Chaquopy config
│   ├── src/main/
│   │   ├── AndroidManifest.xml      # Permissions, services, intent filters
│   │   ├── java/com/reclip/app/
│   │   │   ├── ReClipApplication.java    # App init, FFmpeg detection
│   │   │   ├── MainActivity.java         # WebView host, JS↔Python bridge
│   │   │   └── DownloadService.java      # Foreground service (background DL)
│   │   ├── python/
│   │   │   └── reclip_engine.py          # yt-dlp wrapper, FFmpeg integration
│   │   ├── assets/www/
│   │   │   └── index.html                # Complete UI (single file, no build)
│   │   ├── jniLibs/                      # FFmpeg binaries (built in CI)
│   │   │   ├── arm64-v8a/libffmpeg.so
│   │   │   └── x86_64/libffmpeg.so
│   │   └── res/
│   │       ├── layout/activity_main.xml
│   │       ├── values/strings.xml, styles.xml
│   │       ├── drawable/ic_launcher.xml
│   │       └── xml/network_security_config.xml
├── gradle/wrapper/                  # Gradle distribution
├── scripts/
│   └── build_ffmpeg.sh              # FFmpeg cross-compile script (runs in CI)
├── build.gradle                     # Root build config
├── settings.gradle
├── gradle.properties
├── gradlew / gradlew.bat            # Gradle wrapper
└── README.md
```

### Making Changes

**UI changes** — Edit `app/src/main/assets/www/index.html` directly. No build step; changes reload on app restart.

**Python logic** — Edit `app/src/main/python/reclip_engine.py`. Chaquopy reloads on build.

**Java changes** — Edit files in `app/src/main/java/com/reclip/app/`. Rebuild APK.

**Styles/theme** — Edit `app/src/main/res/values/styles.xml` and colors in `index.html`.

## GitHub Actions Workflow

The `build.yml` workflow runs on every push to `android` branch:

### Job 1: Build FFmpeg
- Triggers: `if` FFmpeg binaries aren't cached
- Downloads FFmpeg 7.1 source
- Cross-compiles for `arm64-v8a` (phones) and `x86_64` (emulators)
- Uses Android NDK r27c + LLVM toolchain
- Caches result so future builds skip this (~10 min → 0 min)
- Output: `app/src/main/jniLibs/<ABI>/libffmpeg.so`

### Job 2: Build APK
- Depends on Job 1 (waits for FFmpeg)
- Downloads cached FFmpeg binaries
- Runs Gradle: `assembleDebug` + `assembleRelease`
- Packages APK with:
  - Python runtime (Chaquopy)
  - yt-dlp package
  - FFmpeg binaries
  - WebView UI
- Uploads APK artifacts (30-day retention)

**First run:** ~15 min total (FFmpeg compile)  
**Subsequent runs:** ~5 min (FFmpeg cached)

### Downloading APK from CI

1. Go to [Actions tab](https://github.com/waynekosterjr-hub/reclip/actions)
2. Click the latest "Build ReClip APK" workflow
3. Scroll to **Artifacts**
4. Click **ReClip-debug** → APK downloads
5. Install on phone via ADB or file transfer

## How the Bridge Works

The JavaScript UI and Python engine communicate via a **@JavascriptInterface bridge**:

### Java → Python (Async)

```java
// MainActivity.java
ReClip.fetchInfo("https://youtube.com/watch?v=...", "callback_123");

// Android runs in background thread, calls Python:
PyObject engine = py.getModule("reclip_engine");
PyObject result = engine.callAttr("get_info", url);

// Posts result back to WebView:
window._nativeCallback('callback_123', {success: true, ...});
```

### Python → Java (Sync)

```python
# reclip_engine.py
def set_ffmpeg_path(directory):
    # Called from Java before every yt-dlp operation
    global _ffmpeg_dir
    _ffmpeg_dir = directory
```

**Why this design?**
- Heavy lifting (yt-dlp, FFmpeg) happens in Python, off the main thread
- Results posted back to UI asynchronously so UI never blocks
- No network calls; everything is local
- FFmpeg path is set once at startup, reused for all downloads

## Permissions

The app requests:

- **INTERNET** — Fetch video metadata (yt-dlp needs network)
- **WRITE_EXTERNAL_STORAGE** — Save downloads to `/storage/.../Download/`
- **READ_EXTERNAL_STORAGE** — Access clipboard, media files
- **POST_NOTIFICATIONS** — Show download progress notification
- **FOREGROUND_SERVICE** — Keep downloads alive when backgrounded

See `AndroidManifest.xml` for details.

## Troubleshooting

### FFmpeg not found / MP3 extraction fails
- **Check:** Engine badge in top right. Should say "yt-dlp X.X.X + ffmpeg"
- **If yellow badge:** FFmpeg binary wasn't packaged. Rebuild APK from clean state:
  ```bash
  ./gradlew clean assembleDebug
  ```

### App crashes on startup
- **Check logcat:**
  ```bash
  adb logcat | grep -i reclip
  ```
- **Common issue:** Python runtime not initialized. Try uninstall + reinstall.

### Download progress stuck
- **Check:** Is app in background? Foreground service should keep it alive.
- **If still stuck:** Try killing the app and restarting.

### "Can't reach server" error
- **Expected in demo mode.** The app should auto-detect ffmpeg locally.
- **Real issue:** Python engine didn't initialize. Check logcat.

## Performance

- **App size:** ~180 MB (Chaquopy + yt-dlp + FFmpeg)
- **Memory:** ~300 MB baseline, ~500-800 MB during download
- **Network:** Only for metadata fetch + video stream. Metadata ~100-500 KB per video.
- **Storage:** Downloaded files stored uncompressed in `Downloads/ReClip/`. 1-hour video = 500 MB–2 GB depending on quality.

## License

MIT — same as the original ReClip project.

## Contributing

Found a bug? Have a feature idea?

1. Open an issue on GitHub
2. For code changes, fork the repo and submit a PR against the `android` branch

## FAQ

**Q: Can I use this offline?**  
A: Mostly. You need internet to fetch video metadata and download the stream. Once downloaded, you can watch/listen offline.

**Q: Why is the APK so large?**  
A: Python runtime (~80 MB), yt-dlp (~15 MB), FFmpeg (~50 MB), Chaquopy JNI bridges. Unavoidable for a self-contained engine.

**Q: Can I customize which sites to download from?**  
A: yt-dlp already supports 1000+ sites. To add more, you'd update yt-dlp version in `app/build.gradle`. To block certain sites, modify `reclip_engine.py`.

**Q: Why not use MediaStore API for downloads?**  
A: Android 11+ restricts raw file access. We use `Downloads/ReClip/` as a compromise — it's publicly visible and accessible from Files app.

**Q: Does this work on tablets?**  
A: Yes. Tested on phones (Portrait mode optimized), works on tablets too.

## Acknowledgments

- **yt-dlp** — The core download engine (maintained fork of youtube-dl)
- **FFmpeg** — Audio/video processing
- **Chaquopy** — Embedded Python for Android
- **Original ReClip** — Web version by Avery Gan

---

**Last updated:** May 2026  
**Branch:** `android`  
**Status:** Production-ready (v1.0)
