# ReClip

A self-hosted, open-source video and audio downloader with a clean web UI. Paste links from YouTube, TikTok, Instagram, Twitter/X, and 1000+ other sites — download as MP4 or extract audio in multiple formats.

![Python](https://img.shields.io/badge/python-3.12-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## Features

- Download videos from 1000+ supported sites (via [yt-dlp](https://github.com/yt-dlp/yt-dlp))
- MP4 video or audio extraction in multiple formats (MP3, AAC, OPUS, FLAC, WAV, M4A)
- Quality/resolution picker with codec selection (AVC1, VP9, AV01)
- Bulk downloads — paste multiple URLs at once
- Automatic URL deduplication
- Cookie-based authentication for age-restricted or bot-protected videos
- Clean, responsive UI — no frameworks, no build step
- Single Python file backend

## Quick Start

### Local

```bash
# Prerequisites: Python 3.12+, ffmpeg, Deno
brew install ffmpeg deno    # macOS
# or: apt install ffmpeg && curl -fsSL https://deno.land/install.sh | sh  # Linux

pip install -r requirements.txt
python app.py
```

Open **http://localhost:8899**.

### Docker

```bash
docker build -t reclip .
docker run -p 8899:8899 reclip
```

The Docker image includes ffmpeg and Deno — no extra setup needed.

### Docker Compose (Dokploy / Portainer)

```yaml
services:
  reclip:
    build: .
    ports:
      - "8899:8899"
    restart: unless-stopped
```

## Usage

1. Paste one or more video URLs into the input box
2. Choose **MP4** (video) or **MP3** (audio)
3. Click **Fetch** to load video info and thumbnails
4. Select quality/resolution (and codec if multiple are available)
5. Click **Download** on individual videos, or **Download All**

### Authentication (Cookies)

Some YouTube videos require authentication. If a fetch fails with a "Sign in to confirm you're not a bot" error, an auth upload option will appear automatically.

**Getting your YouTube cookies:**

1. Open a **private/incognito** browser window
2. Log into **youtube.com** in that window
3. In the **same tab**, navigate to `https://www.youtube.com/robots.txt`
4. Install the **EditThisCookie** browser extension ([Chrome](https://chrome.google.com/webstore/detail/editthiscookie/fngmhnnpilhplaeedifhfbceomclgfbg) / [Firefox](https://addons.mozilla.org/en-US/firefox/addon/editthiscookie-2/))
5. Click the EditThisCookie icon → **Export** (copies JSON cookies to clipboard)
6. Paste into a `.txt` file and save
7. Upload the file via the in-app "Choose session file" button
8. **Close the private window immediately** so the session cookies are never rotated

> **Why private/incognito?** YouTube rotates account cookies on open browser tabs as a security measure. Exporting from an active session may result in already-invalid cookies. The private window technique ensures cookies remain valid.

**Privacy:** Uploaded cookies are stored in RAM only (sessionStorage) and are never written to disk on the server. They are automatically deleted when you close the browser tab. The server writes them to a temporary file for the duration of the yt-dlp subprocess only, then deletes it.

**JSON and Netscape formats are both supported** — EditThisCookie exports JSON, which is automatically converted to Netscape format internally.

## Requirements

| Component | Purpose |
|-----------|---------|
| **Python 3.12+** | Backend runtime |
| **ffmpeg** | Audio/video merging and transcoding |
| **Deno** | JavaScript runtime for YouTube challenge solving |
| **yt-dlp** | Download engine |

> **Why Deno?** YouTube requires solving JavaScript challenges to access video streams. yt-dlp uses Deno (or Node.js) to execute these challenges. Without a JS runtime, only image/storyboard formats will be available.

## Supported Sites

Anything [yt-dlp supports](https://github.com/yt-dlp/yt-dlp/blob/master/supportedsites.md), including:

YouTube, TikTok, Instagram, Twitter/X, Reddit, Facebook, Vimeo, Twitch, Dailymotion, SoundCloud, Loom, Streamable, Pinterest, Tumblr, Threads, LinkedIn, and many more.

## Stack

- **Backend:** Python + Flask
- **Frontend:** Vanilla HTML/CSS/JS (single file, no build step)
- **Download engine:** [yt-dlp](https://github.com/yt-dlp/yt-dlp) + [ffmpeg](https://ffmpeg.org/)
- **JS runtime:** [Deno](https://deno.com/) (for YouTube challenge solving)

## Disclaimer

This tool is intended for personal use only. Please respect copyright laws and the terms of service of the platforms you download from. The developers are not responsible for any misuse of this tool.

## License

[MIT](LICENSE)