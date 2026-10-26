# ReClip

A self-hosted, open-source video and audio downloader with a clean web UI. Paste links from YouTube, TikTok, Instagram, Twitter/X, and 1000+ other sites — download as MP4 or MP3.

![Go](https://img.shields.io/badge/go-1.27+-blue)
![License](https://img.shields.io/badge/license-MIT-green)

https://github.com/user-attachments/assets/419d3e50-c933-444b-8cab-a9724986ba05

![ReClip MP3 Mode](assets/download.png)

## Features

- Download videos from 1000+ supported sites (via [yt-dlp](https://github.com/yt-dlp/yt-dlp))
- MP4 video or MP3 audio extraction
- Every MP4 is faststart (moov up front): playback starts with a single Range request
- Optional H.265 transcode — ~half the bitrate at the same perceived quality, for weak Wi-Fi or router-attached storage (a source that is already HEVC is only remuxed, never re-encoded)
- Quality/resolution picker
- Bulk downloads — paste multiple URLs at once
- Automatic URL deduplication
- Clean, responsive UI — no frameworks, no build step
- Single-file Go backend — stdlib only, compiles to one binary

## Quick Start

```bash
brew install go ffmpeg yt-dlp   # or apt install golang ffmpeg
git clone https://github.com/azhai/reclip.git
cd reclip
make
./bin/reclip
```

> yt-dlp needs no manual install: the Go service uses the one on `PATH`, or
> auto-downloads a standalone build into `./bin` on first start. It self-updates
> only that standalone build on every start (skip with `RECLIP_NO_UPDATE=1`); a
> system yt-dlp (e.g. Homebrew) is left to its own package manager to update.

Open **http://localhost:8899**.

## Usage

1. Paste one or more video URLs into the input box
2. Choose **MP4** (video) or **MP3** (audio)
3. Click **Fetch** to load video info and thumbnails
4. Select quality/resolution if available
5. Click **Download** on individual videos, or **Download All**

## Supported Sites

Anything [yt-dlp supports](https://github.com/yt-dlp/yt-dlp/blob/master/supportedsites.md), including:

YouTube, TikTok, Instagram, Twitter/X, Reddit, Facebook, Vimeo, Twitch, Dailymotion, SoundCloud, Loom, Streamable, Pinterest, Tumblr, Threads, LinkedIn, and many more.

## Chrome Extension (optional)

A lightweight companion extension lives in [`extension/`](extension/) (Manifest V3, vanilla JS, no build step):

- **Right-click** any video link, media element, or page → *ReClip → 用 ReClip 下载* opens the panel with the URL pre-filled and auto-fetches
- **Toolbar popup** — download the current tab, toggle MP4/MP3, and set the server address (default `http://127.0.0.1:8899`)
- An open panel tab is reused, but **only when it is the same origin (scheme + host + port)** — another app on `127.0.0.1:8898` is never navigated away from

Install: open `chrome://extensions` → enable **Developer mode** → **Load unpacked** → select the `extension/` directory.

## Stack

- **Backend:** Go (stdlib `net/http`, single binary)
- **Frontend:** Vanilla HTML/CSS/JS (single file, no build step)
- **Download engine:** [yt-dlp](https://github.com/yt-dlp/yt-dlp) (auto-downloaded standalone binary, Go-managed) + [ffmpeg](https://ffmpeg.org/)
- **Dependencies:** 0 Go packages — no Python; only ffmpeg needs installing

## Disclaimer

This tool is intended for personal use only. Please respect copyright laws and the terms of service of the platforms you download from. The developers are not responsible for any misuse of this tool.

## License

[MIT](LICENSE)
