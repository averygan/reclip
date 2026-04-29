# ReClip

A self-hosted, open-source video and audio downloader with a clean web UI. Paste links from YouTube, TikTok, Instagram, Twitter/X, and 1000+ other sites — download as MP4 or MP3.

This fork keeps the original lightweight Flask + vanilla UI approach, but adds
macOS-focused quality-of-life features, safer download handling, and tests.

![Python](https://img.shields.io/badge/python-3.8+-blue)
![License](https://img.shields.io/badge/license-MIT-green)

https://github.com/user-attachments/assets/419d3e50-c933-444b-8cab-a9724986ba05

![ReClip MP3 Mode](assets/preview-mp3.png)

## Features

- Download videos from 1000+ supported sites (via [yt-dlp](https://github.com/yt-dlp/yt-dlp))
- MP4 video or MP3 audio extraction
- Quality/resolution picker
- Bulk downloads — paste multiple URLs at once
- Automatic URL deduplication
- Choose where downloaded files are saved
- Open the downloads folder or reveal a finished file in Finder
- Light/dark theme toggle with saved preference
- Native macOS app wrapper with a WKWebView window
- Progress, cancel, retry, and safer job state handling
- Clean, responsive UI — no frameworks, no build step

## What This Fork Adds

Compared with the original ReClip repo, this fork adds:

- **Configurable save location:** use the folder button in the top-right corner
  to choose where ReClip saves completed downloads. The choice is persisted in
  `~/.reclip/config.json`.
- **Finder actions:** open the active downloads folder, or click **Show** after a
  download finishes to reveal the saved file in Finder.
- **Dark theme:** a top-right theme button toggles light/dark mode and stores the
  preference in `localStorage`.
- **Safer download pipeline:** files are downloaded to an internal temp folder,
  then moved into the configured destination only after `yt-dlp` finishes.
- **Duplicate-safe filenames:** existing files are not overwritten; duplicates
  are saved as `Name (2).mp4`, `Name (3).mp4`, and so on.
- **Job manager:** download progress, cancellation, completion, errors, and
  cleanup are handled through a dedicated `JobManager` instead of loose globals.
- **Regression tests:** API and job lifecycle tests cover URL validation, format
  parsing, save-folder behavior, final file movement, duplicate naming, and
  cancellation.
- **macOS launcher behavior:** the app launcher respects the saved folder instead
  of resetting downloads to the default path on every launch.

## Quick Start

```bash
brew install yt-dlp ffmpeg    # or apt install ffmpeg && pip install yt-dlp
git clone https://github.com/averygan/reclip.git
cd reclip
./reclip.sh
```

Open **http://localhost:8899**.

On macOS, you can also launch the native app wrapper:

```bash
open ReClip.app
```

The native wrapper uses the same Flask app and project virtual environment, so
`yt-dlp` and `certifi` are installed together.

To build a standalone macOS app bundle:

```bash
./build-macos-app.sh
open dist/ReClip.app
```

The standalone build bundles Python dependencies and the local `ffmpeg` binary.
It is not codesigned or notarized.

Or with Docker:

```bash
docker build -t reclip . && docker run -p 8899:8899 reclip
```

## Usage

1. Paste one or more video URLs into the input box
2. Choose **MP4** (video) or **MP3** (audio)
3. Click **Fetch** to load video info and thumbnails
4. Select quality/resolution if available
5. Optional: click the folder-plus button in the top-right corner to choose a save folder
6. Click **Download** on individual videos, or **Download All**
7. Click **Show** to reveal the saved file in Finder, or use **Save As** for a browser download copy

## Supported Sites

Anything [yt-dlp supports](https://github.com/yt-dlp/yt-dlp/blob/master/supportedsites.md), including:

YouTube, TikTok, Instagram, Twitter/X, Reddit, Facebook, Vimeo, Twitch, Dailymotion, SoundCloud, Loom, Streamable, Pinterest, Tumblr, Threads, LinkedIn, and many more.

## Stack

- **Backend:** Python + Flask
- **Frontend:** Vanilla HTML/CSS/JS (single file, no build step)
- **Native macOS wrapper:** PyObjC + WKWebView
- **Download engine:** [yt-dlp](https://github.com/yt-dlp/yt-dlp) + [ffmpeg](https://ffmpeg.org/)
- **Dependencies:** Flask, yt-dlp, certifi, and macOS-only PyObjC packages
- **Tests:** pytest

## Tests

```bash
python -m pytest -q
```

## Disclaimer

This tool is intended for personal use only. Please respect copyright laws and the terms of service of the platforms you download from. The developers are not responsible for any misuse of this tool.

## License

[MIT](LICENSE)
