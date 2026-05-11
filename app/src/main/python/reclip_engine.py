"""
ReClip Engine — runs yt-dlp directly on the Android device.
Called from Java/Kotlin via Chaquopy. No server, no network service.
All processing happens in-process on the device.
"""

import json
import os
import traceback

# yt-dlp is installed via Chaquopy pip
import yt_dlp


def get_info(url):
    """
    Fetch video metadata without downloading.
    Returns JSON string with title, thumbnail, duration, formats, etc.
    """
    try:
        ydl_opts = {
            'quiet': True,
            'no_warnings': True,
            'noplaylist': True,
            'skip_download': True,
        }

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)

        # Build quality options — keep best format per resolution
        best_by_height = {}
        for f in info.get('formats', []):
            height = f.get('height')
            vcodec = f.get('vcodec', 'none')
            if height and vcodec != 'none':
                tbr = f.get('tbr') or 0
                existing = best_by_height.get(height)
                if not existing or tbr > (existing.get('tbr') or 0):
                    best_by_height[height] = f

        formats = []
        for height, f in best_by_height.items():
            formats.append({
                'id': f['format_id'],
                'label': f'{height}p',
                'height': height,
            })
        formats.sort(key=lambda x: x['height'], reverse=True)

        result = {
            'success': True,
            'title': info.get('title', ''),
            'thumbnail': info.get('thumbnail', ''),
            'duration': info.get('duration'),
            'uploader': info.get('uploader', ''),
            'formats': formats,
            'url': url,
        }
        return json.dumps(result)

    except Exception as e:
        return json.dumps({
            'success': False,
            'error': str(e),
            'url': url,
        })


def download_media(url, output_dir, format_choice='video', format_id=None, title=''):
    """
    Download video/audio to the specified directory.
    format_choice: 'video' or 'audio'
    format_id: specific format ID for quality selection
    Returns JSON string with file path or error.
    """
    try:
        os.makedirs(output_dir, exist_ok=True)

        # Sanitize title for filename
        if title:
            safe_title = ''.join(
                c for c in title if c not in r'\/:*?"<>|'
            ).strip()[:80].strip()
        else:
            safe_title = 'reclip_download'

        if not safe_title:
            safe_title = 'reclip_download'

        out_template = os.path.join(output_dir, f'{safe_title}.%(ext)s')

        ydl_opts = {
            'quiet': True,
            'no_warnings': True,
            'noplaylist': True,
            'outtmpl': out_template,
            'progress_hooks': [_progress_hook],
        }

        if format_choice == 'audio':
            ydl_opts['format'] = 'bestaudio/best'
            ydl_opts['postprocessors'] = [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'mp3',
                'preferredquality': '192',
            }]
        elif format_id:
            ydl_opts['format'] = f'{format_id}+bestaudio/best'
            ydl_opts['merge_output_format'] = 'mp4'
        else:
            ydl_opts['format'] = 'bestvideo+bestaudio/best'
            ydl_opts['merge_output_format'] = 'mp4'

        # ffmpeg location — Chaquopy bundles it or we use system
        # Try common Android locations
        ffmpeg_paths = [
            '/data/data/com.reclip.app/files/ffmpeg',
            '/system/bin/ffmpeg',
        ]
        for fp in ffmpeg_paths:
            if os.path.exists(fp):
                ydl_opts['ffmpeg_location'] = fp
                break

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            filename = ydl.prepare_filename(info)

            # For audio, the extension changes to mp3
            if format_choice == 'audio':
                base = os.path.splitext(filename)[0]
                filename = base + '.mp3'

            # Find the actual file (yt-dlp may have changed the name)
            if not os.path.exists(filename):
                # Search for files matching the safe_title
                for f in os.listdir(output_dir):
                    if f.startswith(safe_title):
                        filename = os.path.join(output_dir, f)
                        break

        if os.path.exists(filename):
            file_size = os.path.getsize(filename)
            return json.dumps({
                'success': True,
                'file': filename,
                'filename': os.path.basename(filename),
                'size': file_size,
            })
        else:
            return json.dumps({
                'success': False,
                'error': 'Download completed but file not found',
            })

    except Exception as e:
        return json.dumps({
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc(),
        })


# Global progress state — read by the Java bridge
_current_progress = {'percent': 0, 'speed': '', 'eta': '', 'status': 'idle'}


def _progress_hook(d):
    """Called by yt-dlp during download with progress updates."""
    global _current_progress
    if d['status'] == 'downloading':
        total = d.get('total_bytes') or d.get('total_bytes_estimate') or 0
        downloaded = d.get('downloaded_bytes', 0)
        percent = (downloaded / total * 100) if total > 0 else 0
        speed = d.get('_speed_str', '')
        eta = d.get('_eta_str', '')
        _current_progress = {
            'percent': round(percent, 1),
            'speed': speed,
            'eta': eta,
            'status': 'downloading',
        }
    elif d['status'] == 'finished':
        _current_progress = {
            'percent': 100,
            'speed': '',
            'eta': '',
            'status': 'processing',
        }


def get_progress():
    """Return current download progress as JSON."""
    return json.dumps(_current_progress)


def reset_progress():
    """Reset progress state."""
    global _current_progress
    _current_progress = {'percent': 0, 'speed': '', 'eta': '', 'status': 'idle'}


def check_dependencies():
    """Verify yt-dlp is available and return version info."""
    try:
        version = yt_dlp.version.__version__
        return json.dumps({
            'success': True,
            'yt_dlp_version': version,
        })
    except Exception as e:
        return json.dumps({
            'success': False,
            'error': str(e),
        })
