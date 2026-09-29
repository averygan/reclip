# ReClip

A self-hosted, open-source video and audio downloader with a clean web UI. Paste links from YouTube, TikTok, Instagram, Twitter/X, and 1000+ other sites — download as MP4 or MP3.

![Python](https://img.shields.io/badge/python-3.8+-blue)
![License](https://img.shields.io/badge/license-MIT-green)

https://github.com/user-attachments/assets/419d3e50-c933-444b-8cab-a9724986ba05

![ReClip MP3 Mode](assets/preview-mp3.png)

## Features

- Download videos from 1000+ supported sites (via [yt-dlp](https://github.com/yt-dlp/yt-dlp))
- MP4 video or MP3 audio extraction
- Quality/resolution picker
- Live download progress — percent, speed, ETA
- Cancel running downloads from the UI
- Parallel fragment downloads for segmented streams (YouTube etc.)
- Login cookies managed in the UI (for premium / paywalled sites)
- Bulk downloads — paste multiple URLs at once
- Automatic URL deduplication
- Clean, responsive UI — no frameworks, no build step
- Single Python file backend (~150 lines)

## Quick Start

```bash
brew install yt-dlp ffmpeg    # or apt install ffmpeg && pip install yt-dlp
git clone https://github.com/averygan/reclip.git
cd reclip
./reclip.sh
```

Open **http://localhost:8899**.

Or with Docker:

```bash
docker build -t reclip . && docker run -p 8899:8899 reclip
```

## Usage

1. Paste one or more video URLs into the input box
2. Choose **MP4** (video) or **MP3** (audio)
3. Click **Fetch** to load video info and thumbnails
4. Select quality/resolution if available
5. Click **Download** on individual videos, or **Download All**

## Login-required videos (optional)

Some sites (e.g. Bilibili premium or charging-exclusive videos) only serve
full-quality streams to a logged-in account that owns access.

**Easiest: configure in the web UI** — click **Cookies** (top right), paste either:

- a Netscape `cookies.txt` (export from your logged-in browser with a
  "Get cookies.txt" extension), or
- a browser Cookie header string like `SESSDATA=xxx; bili_jct=yyy`
  (set the Domain field to match the site)

Saved cookies live in `cookies.txt` (gitignored) and are used for all downloads
until you clear them.

Alternatively via environment variables:

```bash
# Netscape cookies.txt
export RECLIP_COOKIES_FILE=/path/to/cookies.txt

# or read cookies straight from a browser profile
export RECLIP_COOKIES_BROWSER=firefox
```

UI-configured cookies take precedence over the env vars. `RECLIP_DOWNLOAD_TIMEOUT`
(seconds, default 1800) raises the per-download time limit for huge files.
For Docker, see the commented mounts in `docker-compose.yml`.

**Keep your cookies file private** — it is your login session. It is gitignored
here; don't copy it anywhere else. Cookies only prove identity: the account
itself must own the access.

## Supported Sites

Anything [yt-dlp supports](https://github.com/yt-dlp/yt-dlp/blob/master/supportedsites.md), including:

YouTube, TikTok, Instagram, Twitter/X, Reddit, Facebook, Vimeo, Twitch, Dailymotion, SoundCloud, Loom, Streamable, Pinterest, Tumblr, Threads, LinkedIn, and many more.

## Stack

- **Backend:** Python + Flask (~150 lines)
- **Frontend:** Vanilla HTML/CSS/JS (single file, no build step)
- **Download engine:** [yt-dlp](https://github.com/yt-dlp/yt-dlp) + [ffmpeg](https://ffmpeg.org/)
- **Dependencies:** 2 (Flask, yt-dlp)

## Disclaimer

This tool is intended for personal use only. Please respect copyright laws and the terms of service of the platforms you download from. The developers are not responsible for any misuse of this tool.

## License

[MIT](LICENSE)
