<div align="center">

# ✦ ReClip

### *Capture anything, instantly.*

**A self-contained Android app for downloading video and audio from 1000+ sites.**
**No servers. No accounts. No tracking. Everything runs on-device.**

<br>

[![Build Status](https://github.com/waynekosterjr-hub/reclip/actions/workflows/build.yml/badge.svg?branch=android)](https://github.com/waynekosterjr-hub/reclip/actions)
![Android](https://img.shields.io/badge/Android-7.0%2B-3DDC84?logo=android&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-blue)
![yt-dlp](https://img.shields.io/badge/engine-yt--dlp-red)
![FFmpeg](https://img.shields.io/badge/ffmpeg-bundled-007808)

<br>

[Download APK](https://github.com/waynekosterjr-hub/reclip/actions) · [Report Bug](https://github.com/waynekosterjr-hub/reclip/issues) · [Request Feature](https://github.com/waynekosterjr-hub/reclip/issues)

</div>

---

## ✶ Why ReClip?

Most video downloaders are either **(a)** ad-infested websites that disappear overnight, **(b)** shady apps demanding your contacts and location, or **(c)** thin clients that send your URLs to someone else's server.

ReClip is different. The entire engine — yt-dlp, FFmpeg, Python runtime — is packaged **inside the APK** and runs **locally on your phone**. Your URLs never leave your device. Your downloads stay private. The app works whether your favorite extraction service is up or down.

```
   ┌─────────────────────────────────────────────┐
   │           Your Android Device                │
   │                                              │
   │   📱 ReClip App                              │
   │      ├─ 🎨 WebView UI (HTML/CSS/JS)         │
   │      ├─ 🌉 Java Bridge                      │
   │      ├─ 🐍 Python 3.11 + yt-dlp             │
   │      └─ 🎬 FFmpeg (bundled binary)          │
   │                                              │
   │   ↓ Downloads go to                          │
   │   📂 /Downloads/ReClip/                      │
   └─────────────────────────────────────────────┘

   No server. No cloud. No telemetry.
```

---

## ✶ Features

|  | Feature | Detail |
|--|---------|--------|
| 🎯 | **On-device engine** | yt-dlp + FFmpeg run natively. Zero server dependency. |
| 🌐 | **1000+ supported sites** | YouTube, TikTok, Instagram, X, Reddit, Twitch, Vimeo, SoundCloud, and many more. |
| 🎥 | **Video downloads** | MP4 with selectable resolution (1080p / 720p / 480p / etc.) |
| 🎵 | **Audio extraction** | MP3 at 192 kbps via bundled libmp3lame encoder |
| 📋 | **Bulk paste** | Drop multiple URLs at once, download all with one tap |
| 📤 | **Share-to-download** | Share a link from any app → ReClip auto-fetches |
| 📊 | **Live progress** | Real-time percentage, speed, and ETA |
| 📁 | **MediaStore integration** | Files appear instantly in your gallery & file manager |
| 🌙 | **Background downloads** | Foreground service keeps downloads running |
| 🔒 | **Zero permissions abuse** | Just storage + network. No contacts, no location. |
| ⚡ | **Beautiful UI** | Aurora-themed glassmorphism with smooth animations |

---

## ✶ Screenshots

> *Drop in screenshots once you've installed and captured them. Suggested shots:*
> - Empty state with aurora background
> - URL pasted, results loaded with thumbnails
> - Mid-download with progress fill
> - Downloaded state with Open/Share buttons

---

## ✶ Quick Start

### Option 1 — Download Pre-built APK (Easiest)

1. Go to [**Actions**](https://github.com/waynekosterjr-hub/reclip/actions)
2. Click the latest successful **"Build ReClip APK"** run
3. Scroll to **Artifacts** at the bottom → download **`ReClip-debug`**
4. Transfer the APK to your phone, tap to install (enable "Install from unknown sources" if prompted)
5. Open ReClip, paste a URL, hit **Fetch** → **Download** ✦

### Option 2 — Build Locally with Android Studio

```bash
# Clone the repo
git clone https://github.com/waynekosterjr-hub/reclip.git
cd reclip
git checkout android

# Open in Android Studio → wait for Gradle sync
# (Downloads Python runtime + yt-dlp automatically)

# Run on connected device or emulator
./gradlew assembleDebug
adb install app/build/outputs/apk/debug/app-debug.apk
```

**Prerequisites:** Android Studio Hedgehog+, JDK 17, Android SDK 34, Android NDK r27c

> 💡 **First build takes ~10 min** — Chaquopy packages Python 3.11 and yt-dlp into the APK.

---

## ✶ How It Works

ReClip is a **WebView UI** wrapping an embedded **Python + FFmpeg** engine. Here's the data flow when you tap "Download":

```
┌──────────────────┐      ┌──────────────────┐      ┌──────────────────┐
│  WebView UI      │      │  Java Bridge     │      │  Python Engine   │
│  (HTML/CSS/JS)   │      │  (ReClipBridge)  │      │  (reclip_engine) │
└────────┬─────────┘      └────────┬─────────┘      └────────┬─────────┘
         │                         │                         │
         │  startDownload(url)     │                         │
         │ ──────────────────────► │                         │
         │                         │  download_media()       │
         │                         │ ──────────────────────► │
         │                         │                         │
         │                         │                         │ ┌──────────┐
         │                         │                         │ │ yt-dlp   │
         │                         │                         │ └────┬─────┘
         │                         │                         │      │
         │                         │                         │ ┌────▼─────┐
         │                         │                         │ │ FFmpeg   │
         │                         │                         │ └────┬─────┘
         │                         │                         │      │
         │                         │  ◄──────────────────────┘ file path
         │                         │
         │                         │ Save to MediaStore →
         │                         │ /Downloads/ReClip/
         │                         │
         │  ◄──────────────────────┘ result JSON
         │
         ▼ Update UI
```

**Behind the scenes:**

1. You paste a URL and tap **Fetch**
2. The WebView calls `ReClip.fetchInfo(url)` via the JS interface
3. The Java bridge dispatches to a worker thread, calls Python via Chaquopy
4. `reclip_engine.py` runs `yt_dlp.YoutubeDL().extract_info()` and returns metadata
5. You pick a quality and tap **Download**
6. Python downloads the stream, then invokes the bundled FFmpeg (extracted from `nativeLibraryDir` to a writable location) for muxing or MP3 conversion
7. The Java side moves the file to `Downloads/ReClip/` via **MediaStore API**
8. The UI shows the **Open** and **Share** buttons

---

## ✶ Architecture

```
reclip/
├── .github/workflows/
│   └── build.yml                      🔨 CI: build FFmpeg + APK
├── app/
│   ├── build.gradle                   📦 Chaquopy config, dependencies
│   └── src/main/
│       ├── AndroidManifest.xml        🔐 Permissions, intents
│       ├── java/com/reclip/app/
│       │   ├── ReClipApplication.java 🚀 Boot Python, locate FFmpeg
│       │   ├── MainActivity.java      🌉 WebView host + JS↔Python bridge
│       │   └── DownloadService.java   ⏳ Background download service
│       ├── python/
│       │   └── reclip_engine.py       🐍 yt-dlp wrapper, FFmpeg control
│       ├── assets/www/
│       │   └── index.html             ✨ Aurora UI (single file)
│       ├── jniLibs/                   📚 FFmpeg binaries (per ABI)
│       │   ├── arm64-v8a/libffmpeg.so
│       │   └── x86_64/libffmpeg.so
│       └── res/                       🎨 Theme, icon, paths
├── scripts/
│   └── build_ffmpeg.sh                🛠️ Cross-compile FFmpeg + LAME
├── build.gradle                       ⚙️ Root config (AGP 8.2.2, Chaquopy 15)
└── settings.gradle
```

### Key Components

**🐍 Python Engine** (`reclip_engine.py`)
The brain. Wraps yt-dlp, manages FFmpeg paths, tracks progress, handles format selection. Runs in a Chaquopy-managed Python 3.11 interpreter embedded in the app.

**🌉 Java Bridge** (`MainActivity.java`)
The translator. Exposes `@JavascriptInterface` methods to the WebView — `fetchInfo()`, `startDownload()`, `getProgress()`, `openFile()`, etc. Dispatches Python calls to background threads, posts results back to the UI via `evaluateJavascript()`.

**✨ WebView UI** (`assets/www/index.html`)
The face. Pure HTML/CSS/JS, no framework, no build step. Aurora gradient background, glassmorphism cards, Instrument Serif display type, smooth spring animations, haptic feedback.

**🎬 FFmpeg Binary** (`jniLibs/`)
Cross-compiled in CI from FFmpeg 7.1 source with LAME (libmp3lame) for real MP3 encoding. Packaged as `libffmpeg.so` so Android auto-extracts it. Copied to a writable location on first launch (since `nativeLibraryDir` is read-only on Android 10+).

---

## ✶ Build Pipeline

The GitHub Actions workflow has two jobs:

### Job 1 — `build-ffmpeg`
- Downloads FFmpeg 7.1 and LAME 3.100 source
- Cross-compiles for `arm64-v8a` (phones) and `x86_64` (emulators) using Android NDK r27c
- Outputs to `app/src/main/jniLibs/<abi>/libffmpeg.so`
- **Cached** — only re-runs if `build_ffmpeg.sh` changes (~12 min first time, instant after)

### Job 2 — `build-apk`
- Pulls cached FFmpeg binaries
- Generates Gradle wrapper (Gradle 8.2 for Chaquopy compatibility)
- Builds debug + release APKs
- Uploads as artifacts (30-day retention)

**Total CI time:** ~15 min first build, ~5 min subsequent builds.

---

## ✶ Permissions

| Permission | Why |
|------------|-----|
| `INTERNET` | yt-dlp needs network to fetch video metadata + streams |
| `WRITE_EXTERNAL_STORAGE` | Save to `Downloads/` on Android 9 and below |
| `READ_EXTERNAL_STORAGE` | Read clipboard text (Android 12 and below) |
| `POST_NOTIFICATIONS` | Show download progress notification (Android 13+) |
| `FOREGROUND_SERVICE` | Keep downloads alive when app is backgrounded |

**Not requested:** Camera, microphone, contacts, location, SMS, call logs, accounts.

---

## ✶ Tech Stack

| Layer | Technology |
|-------|------------|
| **UI** | HTML5, CSS3 (variables, backdrop-filter, animations), Vanilla JS |
| **Bridge** | Android WebView + `@JavascriptInterface` |
| **Native** | Java 17, AndroidX, Material Components |
| **Engine** | Python 3.11, yt-dlp (latest), Chaquopy 15.0.1 |
| **Media** | FFmpeg 7.1 (static build, libmp3lame) |
| **Build** | Gradle 8.2, AGP 8.2.2, Android SDK 34, NDK r27c |
| **CI** | GitHub Actions (Ubuntu) |

---

## ✶ Troubleshooting

<details>
<summary><b>The "Fetch" button doesn't return anything</b></summary>
<br>

Check the status pill in the top right corner of the app. If it says **"Error"**, the Python engine failed to start. Try:
1. Uninstall + reinstall the app
2. Check `adb logcat | grep ReClip` for the actual error
3. Make sure your device has enough free storage (~250 MB for the app + Python runtime)

</details>

<details>
<summary><b>MP3 downloads come out as M4A instead</b></summary>
<br>

The status pill should say **"v2024.x.x · mp3"** when libmp3lame is properly bundled. If it doesn't, FFmpeg was compiled without MP3 support — the app falls back to AAC/M4A automatically.

**Fix:** Rebuild the FFmpeg binaries by editing `scripts/build_ffmpeg.sh` (any change invalidates the cache) and re-running the workflow.

</details>

<details>
<summary><b>Downloads finish but I can't find the file</b></summary>
<br>

Files save to **`/Downloads/ReClip/`**. Check:
- **Android 10+:** Open the **Files** app → **Downloads** → look for **ReClip** folder
- **Android 9 and below:** Make sure storage permission was granted in Settings
- Tap the **Open** button right after download as the most reliable way to find the file

</details>

<details>
<summary><b>App crashes when I tap Download</b></summary>
<br>

Likely cause: FFmpeg binary not extracted properly. Capture the crash:
```bash
adb logcat | grep -E "AndroidRuntime|ReClip"
```
Share the output in an [issue](https://github.com/waynekosterjr-hub/reclip/issues).

</details>

<details>
<summary><b>"Out of memory" errors on big videos</b></summary>
<br>

Long 4K videos can exceed Android's per-app memory limit. Try:
- Pick a lower resolution (720p or 480p)
- Close other apps first
- For very long videos (3+ hours), audio-only is much safer

</details>

---

## ✶ Roadmap

- [ ] **Settings screen** — toggle quality preset, file naming pattern
- [ ] **Download queue** — pause/resume, parallel downloads
- [ ] **History view** — browse past downloads inside the app
- [ ] **Playlist support** — download entire YouTube playlists
- [ ] **Subtitle extraction** — pull captions as `.srt`
- [ ] **Custom destination folders**
- [ ] **F-Droid release**

---

## ✶ Contributing

PRs welcome! Fork the repo, branch off `android`, and open a pull request.

**Areas where help is appreciated:**
- Testing on physical devices (especially Android 14+)
- Reducing APK size (currently ~180 MB due to bundled Python + FFmpeg)
- ARM v7 (32-bit) build support
- Localization

```bash
# Local dev workflow
git checkout android
# Make changes
./gradlew clean assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk
adb logcat | grep ReClip   # watch logs while testing
```

---

## ✶ FAQ

**Q: Is this legal?**
A: Downloading content you own or have rights to is fine. Downloading copyrighted material without permission may violate terms of service or local laws. ReClip is a tool — how you use it is your responsibility.

**Q: Why is the APK so large?**
A: It bundles a full Python 3.11 interpreter (~80 MB), yt-dlp (~15 MB), FFmpeg (~50 MB), and JNI bridges. The trade-off is **zero server dependency** — you can use it indefinitely even if every yt-dlp web service goes down.

**Q: Does it work offline?**
A: Once a video is downloaded, yes — fully offline playback. The download itself needs network (obviously).

**Q: Will my downloads sync to other devices?**
A: No. Everything is local. If you want cloud sync, use any cloud storage app to upload from `Downloads/ReClip/`.

**Q: Can I use this on Windows / iOS / Linux?**
A: This branch is Android-only. The original [ReClip web version](https://github.com/waynekosterjr-hub/reclip/tree/main) (Flask + browser) works on any desktop.

**Q: Why "Aurora" theme?**
A: Because video and audio downloads should feel as smooth as the northern lights — fluid, atmospheric, and effortless.

---

## ✶ Credits

| Project | License |
|---------|---------|
| [yt-dlp](https://github.com/yt-dlp/yt-dlp) | The download engine — Unlicense |
| [FFmpeg](https://ffmpeg.org/) | Audio/video processing — LGPL |
| [LAME](https://lame.sourceforge.io/) | MP3 encoder — LGPL |
| [Chaquopy](https://chaquo.com/chaquopy/) | Python for Android — MIT |
| [Instrument Serif](https://fonts.google.com/specimen/Instrument+Serif) | Display font — OFL |
| [Geist](https://vercel.com/font) | UI font — OFL |

---

## ✶ License

MIT © [Wayne Koster Jr.](https://github.com/waynekosterjr-hub)

<div align="center">
<br>

**Made with ✦ and a strong dislike for ad-laden downloader websites.**

<br>

*If ReClip saved you time or sanity, [give it a star](https://github.com/waynekosterjr-hub/reclip) ⭐*

</div>
