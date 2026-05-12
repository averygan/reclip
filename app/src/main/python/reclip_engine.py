"""
ReClip Engine — runs yt-dlp directly on the Android device.
Called from Java/Kotlin via Chaquopy. No server, no network service.
All processing happens in-process on the device.

FFmpeg is bundled inside the APK as a native library (libffmpeg.so).
The Java layer locates it and passes the directory path here via set_ffmpeg_path().

Because nativeLibraryDir is read-only on modern Android, we copy ffmpeg to a
writable location (app files dir) with the correct executable name on first use.
"""

import json
import os
import shutil
import stat
import subprocess
import traceback

import yt_dlp


# ── FFmpeg path management ──
_ffmpeg_dir = None          # source dir (nativeLibraryDir)
_ffmpeg_writable_dir = None # writable copy location (set by Java)
_ffmpeg_exec_path = None    # final executable path after setup
_has_libmp3lame = None      # cached check for MP3 encoder


def set_ffmpeg_path(native_dir, writable_dir):
    """
    Called from Java to tell us where the bundled ffmpeg lives.

    native_dir: nativeLibraryDir containing libffmpeg.so (read-only on modern Android)
    writable_dir: app files dir where we can place an executable copy
    """
    global _ffmpeg_dir, _ffmpeg_writable_dir, _ffmpeg_exec_path

    _ffmpeg_dir = native_dir
    _ffmpeg_writable_dir = writable_dir

    if not native_dir or not writable_dir:
        return

    os.makedirs(writable_dir, exist_ok=True)

    src_ffmpeg = os.path.join(native_dir, 'libffmpeg.so')
    src_ffprobe = os.path.join(native_dir, 'libffprobe.so')

    dst_ffmpeg = os.path.join(writable_dir, 'ffmpeg')
    dst_ffprobe = os.path.join(writable_dir, 'ffprobe')

    # Strategy 1: Try symlink (fastest, no disk usage)
    # Strategy 2: Copy the binary (works on all Android versions)
    for src, dst in [(src_ffmpeg, dst_ffmpeg), (src_ffprobe, dst_ffprobe)]:
        if not os.path.exists(src):
            continue

        # If destination already exists and is newer than source, skip
        if os.path.exists(dst) and os.path.getsize(dst) == os.path.getsize(src):
            try:
                os.chmod(dst, 0o755)
            except OSError:
                pass
            continue

        # Remove old version
        if os.path.lexists(dst):
            try:
                os.remove(dst)
            except OSError:
                pass

        # Try symlink first
        try:
            os.symlink(src, dst)
        except OSError:
            # Symlink failed — copy the file
            try:
                shutil.copy2(src, dst)
            except OSError as e:
                print(f"Failed to copy {src} -> {dst}: {e}")
                continue

        # Make executable
        try:
            os.chmod(dst, 0o755)
        except OSError:
            pass

    if os.path.exists(dst_ffmpeg):
        _ffmpeg_exec_path = dst_ffmpeg


def _check_libmp3lame():
    """Check if our bundled ffmpeg supports libmp3lame encoder."""
    global _has_libmp3lame
    if _has_libmp3lame is not None:
        return _has_libmp3lame
    if not _ffmpeg_exec_path or not os.path.exists(_ffmpeg_exec_path):
        _has_libmp3lame = False
        return False
    try:
        result = subprocess.run(
            [_ffmpeg_exec_path, '-encoders'],
            capture_output=True, text=True, timeout=10
        )
        _has_libmp3lame = 'libmp3lame' in result.stdout
    except Exception:
        _has_libmp3lame = False
    return _has_libmp3lame


def _get_ffmpeg_opts():
    """Return yt-dlp options dict for ffmpeg location."""
    if _ffmpeg_exec_path and os.path.exists(_ffmpeg_exec_path):
        # yt-dlp wants the *directory* containing ffmpeg and ffprobe
        return {'ffmpeg_location': os.path.dirname(_ffmpeg_exec_path)}
    return {}


# ── Video Info ──

def get_info(url):
    """Fetch video metadata without downloading."""
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

        # Track expected output extension for finding the file later
        expected_ext = None

        if format_choice == 'audio':
            ydl_opts['format'] = 'bestaudio/best'
            # Choose codec based on what ffmpeg supports.
            # libmp3lame requires the encoder to be built into ffmpeg.
            # If not available, fall back to AAC (always available in ffmpeg).
            if _check_libmp3lame():
                ydl_opts['postprocessors'] = [{
                    'key': 'FFmpegExtractAudio',
                    'preferredcodec': 'mp3',
                    'preferredquality': '192',
                }]
                expected_ext = '.mp3'
            else:
                # Fallback: AAC in M4A container (always works)
                ydl_opts['postprocessors'] = [{
                    'key': 'FFmpegExtractAudio',
                    'preferredcodec': 'aac',
                    'preferredquality': '192',
                }]
                expected_ext = '.m4a'
        elif format_id:
            ydl_opts['format'] = f'{format_id}+bestaudio/best'
            ydl_opts['merge_output_format'] = 'mp4'
            expected_ext = '.mp4'
        else:
            ydl_opts['format'] = 'bestvideo+bestaudio/best'
            ydl_opts['merge_output_format'] = 'mp4'
            expected_ext = '.mp4'

        downloaded_file = None
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            filename = ydl.prepare_filename(info)

            # For audio, the extension changes after postprocessing
            if format_choice == 'audio' and expected_ext:
                base = os.path.splitext(filename)[0]
                candidate = base + expected_ext
                if os.path.exists(candidate):
                    filename = candidate

            # Find the actual file (yt-dlp may have changed the name)
            if not os.path.exists(filename):
                # Search for files starting with our safe_title
                for f in sorted(os.listdir(output_dir),
                                key=lambda x: os.path.getmtime(os.path.join(output_dir, x)),
                                reverse=True):
                    if f.startswith(safe_title):
                        # Skip incomplete fragments
                        if f.endswith('.part') or f.endswith('.ytdl'):
                            continue
                        filename = os.path.join(output_dir, f)
                        break
            downloaded_file = filename

        if downloaded_file and os.path.exists(downloaded_file):
            file_size = os.path.getsize(downloaded_file)
            return json.dumps({
                'success': True,
                'file': downloaded_file,
                'filename': os.path.basename(downloaded_file),
                'size': file_size,
            })
        else:
            # List what's in the output dir for debugging
            files_in_dir = []
            try:
                files_in_dir = os.listdir(output_dir)
            except Exception:
                pass
            return json.dumps({
                'success': False,
                'error': 'Download completed but file not found',
                'output_dir': output_dir,
                'files_in_dir': files_in_dir,
                'expected_filename': downloaded_file,
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
    return json.dumps(_current_progress)


def reset_progress():
    global _current_progress
    _current_progress = {'percent': 0, 'speed': '', 'eta': '', 'status': 'idle'}


# ── Dependency check ──

def check_dependencies():
    """Verify yt-dlp and ffmpeg are available."""
    try:
        ytdlp_version = yt_dlp.version.__version__

        ffmpeg_available = bool(_ffmpeg_exec_path and os.path.exists(_ffmpeg_exec_path))
        ffmpeg_path = _ffmpeg_exec_path or ''
        has_mp3 = _check_libmp3lame() if ffmpeg_available else False

        return json.dumps({
            'success': True,
            'yt_dlp_version': ytdlp_version,
            'ffmpeg_available': ffmpeg_available,
            'ffmpeg_path': ffmpeg_path,
            'has_libmp3lame': has_mp3,
        })
    except Exception as e:
        return json.dumps({
            'success': False,
            'error': str(e),
        })
