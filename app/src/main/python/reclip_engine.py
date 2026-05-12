"""
ReClip Engine — runs yt-dlp directly on the Android device.
Called from Java/Kotlin via Chaquopy. No server, no network service.
All processing happens in-process on the device.

FFmpeg is bundled inside the APK as a native library (libffmpeg.so).
The Java layer locates it and passes the directory path here via set_ffmpeg_path().
"""

import json
import os
import traceback

import yt_dlp


# ── FFmpeg path management ──
# Set by Java bridge on startup; points to the directory containing
# the bundled libffmpeg.so and libffprobe.so binaries.
_ffmpeg_dir = None


def set_ffmpeg_path(directory):
    """Called from Java to tell us where the bundled ffmpeg lives."""
    global _ffmpeg_dir
    _ffmpeg_dir = directory

    # yt-dlp looks for executables named 'ffmpeg' and 'ffprobe'.
    # Android bundles them as 'libffmpeg.so' and 'libffprobe.so' in nativeLibraryDir.
    # We create symlinks with the expected names so yt-dlp finds them.
    if directory and os.path.isdir(directory):
        _ensure_symlink(os.path.join(directory, 'libffmpeg.so'),
                        os.path.join(directory, 'ffmpeg'))
        _ensure_symlink(os.path.join(directory, 'libffprobe.so'),
                        os.path.join(directory, 'ffprobe'))


def _ensure_symlink(src, dst):
    """Create symlink dst -> src if src exists and dst doesn't."""
    try:
        if os.path.exists(src) and not os.path.exists(dst):
            os.symlink(src, dst)
    except OSError:
        # nativeLibraryDir may be read-only on some devices.
        # Fall back: yt-dlp can also find binaries by full path.
        pass


def _get_ffmpeg_opts():
    """Return yt-dlp options dict for ffmpeg location."""
    if _ffmpeg_dir:
        # First try symlinked name
        ffmpeg_path = os.path.join(_ffmpeg_dir, 'ffmpeg')
        if os.path.exists(ffmpeg_path):
            return {'ffmpeg_location': _ffmpeg_dir}
        # Fall back to .so name directly
        so_path = os.path.join(_ffmpeg_dir, 'libffmpeg.so')
        if os.path.exists(so_path):
            return {'ffmpeg_location': so_path}
    return {}


# ── Video Info ──

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
        ydl_opts.update(_get_ffmpeg_opts())

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


# ── Download ──

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

        # Apply bundled ffmpeg location
        ydl_opts.update(_get_ffmpeg_opts())

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

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            filename = ydl.prepare_filename(info)

            # For audio, the extension changes to mp3
            if format_choice == 'audio':
                base = os.path.splitext(filename)[0]
                filename = base + '.mp3'

            # Find the actual file (yt-dlp may have changed the name)
            if not os.path.exists(filename):
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


# ── Progress tracking ──

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


# ── Dependency check ──

def check_dependencies():
    """Verify yt-dlp and ffmpeg are available. Returns version info."""
    try:
        ytdlp_version = yt_dlp.version.__version__

        ffmpeg_available = False
        ffmpeg_path_found = ''
        if _ffmpeg_dir:
            for name in ['ffmpeg', 'libffmpeg.so']:
                p = os.path.join(_ffmpeg_dir, name)
                if os.path.exists(p):
                    ffmpeg_available = True
                    ffmpeg_path_found = p
                    break

        return json.dumps({
            'success': True,
            'yt_dlp_version': ytdlp_version,
            'ffmpeg_available': ffmpeg_available,
            'ffmpeg_path': ffmpeg_path_found,
        })
    except Exception as e:
        return json.dumps({
            'success': False,
            'error': str(e),
        })
