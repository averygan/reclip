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
import base64
import time
import urllib.parse
import urllib.request

import yt_dlp

_MIN_ARTWORK_SIZE = 1200
_AUDIO_PROFILES = {
    'mp3_320_cbr':  {'codec': 'mp3',  'quality': '320', 'ext': '.mp3',
                     'extra_args': ['-ar', '48000', '-compression_level', '0']},
    'mp3_v0_vbr':   {'codec': 'mp3',  'quality': '0',   'ext': '.mp3',
                     'extra_args': ['-ar', '44100', '-compression_level', '0']},
    'mp3_256_cbr':  {'codec': 'mp3',  'quality': '256', 'ext': '.mp3',
                     'extra_args': ['-ar', '44100', '-compression_level', '0']},
    'flac_lossless':{'codec': 'flac', 'quality': None,  'ext': '.flac',
                     'extra_args': ['-ar', '48000']},
}

# ── FFmpeg path management ──
_ffmpeg_dir = None          # source dir (nativeLibraryDir)
_ffmpeg_writable_dir = None # writable copy location (set by Java)
_ffmpeg_exec_path = None    # final executable path after setup
_has_libmp3lame = None      # cached check for MP3 encoder
_spotify_client_id = ''
_spotify_client_secret = ''
_spotify_access_token = None
_spotify_token_expires_at = 0


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


def set_spotify_credentials(client_id, client_secret):
    """Called from Java with build-time Spotify API credentials."""
    global _spotify_client_id, _spotify_client_secret
    global _spotify_access_token, _spotify_token_expires_at
    _spotify_client_id = (client_id or '').strip()
    _spotify_client_secret = (client_secret or '').strip()
    _spotify_access_token = None
    _spotify_token_expires_at = 0


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


def _is_spotify_url(url):
    return 'open.spotify.com/' in (url or '') or 'spotify.link/' in (url or '')


def _spotify_error(message):
    return json.dumps({
        'success': False,
        'source': 'spotify',
        'error': message,
    })


def _require_spotify_credentials():
    if not _spotify_client_id or not _spotify_client_secret:
        raise RuntimeError(
            'Spotify support is not configured. Set SPOTIFY_CLIENT_ID and '
            'SPOTIFY_CLIENT_SECRET at build time.'
        )


def _spotify_token():
    """Return an app-level Spotify Web API token."""
    global _spotify_access_token, _spotify_token_expires_at
    _require_spotify_credentials()

    if _spotify_access_token and time.time() < _spotify_token_expires_at - 60:
        return _spotify_access_token

    credentials = f'{_spotify_client_id}:{_spotify_client_secret}'.encode('utf-8')
    body = urllib.parse.urlencode({'grant_type': 'client_credentials'}).encode('utf-8')
    request = urllib.request.Request(
        'https://accounts.spotify.com/api/token',
        data=body,
        headers={
            'Authorization': 'Basic ' + base64.b64encode(credentials).decode('ascii'),
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        method='POST',
    )
    with urllib.request.urlopen(request, timeout=20) as response:
        data = json.loads(response.read().decode('utf-8'))

    _spotify_access_token = data['access_token']
    _spotify_token_expires_at = time.time() + int(data.get('expires_in', 3600))
    return _spotify_access_token


def _spotify_api(path):
    request = urllib.request.Request(
        'https://api.spotify.com/v1/' + path.lstrip('/'),
        headers={'Authorization': 'Bearer ' + _spotify_token()},
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        return json.loads(response.read().decode('utf-8'))


def _resolve_spotify_url(url):
    if 'spotify.link/' not in (url or ''):
        return url
    request = urllib.request.Request(url, method='HEAD')
    with urllib.request.urlopen(request, timeout=15) as response:
        return response.geturl()


def _spotify_type_and_id(url):
    resolved = _resolve_spotify_url(url)
    parsed = urllib.parse.urlparse(resolved)
    parts = [part for part in parsed.path.split('/') if part]
    if parts and parts[0].startswith('intl-'):
        parts = parts[1:]
    if len(parts) < 2 or parsed.netloc != 'open.spotify.com':
        raise RuntimeError('Unsupported Spotify link. Use a public track, album, or playlist URL.')
    kind = parts[0]
    spotify_id = parts[1]
    if kind not in ('track', 'album', 'playlist'):
        raise RuntimeError('Only public Spotify track, album, and playlist links are supported.')
    return kind, spotify_id, resolved


def _download_thumbnail(url, output_dir, base_name):
    if not url or not output_dir:
        return ''
    safe_base = ''.join(c for c in (base_name or 'cover') if c.isalnum() or c in ('-', '_')).strip()
    safe_base = safe_base or 'cover'
    path = os.path.join(output_dir, safe_base + '.jpg')
    try:
        with urllib.request.urlopen(url, timeout=20) as response, open(path, 'wb') as f:
            f.write(response.read())
        return path if os.path.exists(path) else ''
    except Exception:
        return ''


def _image_dimensions(path):
    if not path or not os.path.exists(path):
        return (0, 0)
    if not _ffmpeg_exec_path or not os.path.exists(_ffmpeg_exec_path):
        return (0, 0)
    ffprobe_path = os.path.join(os.path.dirname(_ffmpeg_exec_path), 'ffprobe')
    if not os.path.exists(ffprobe_path):
        ffprobe_path = _ffmpeg_exec_path
    try:
        result = subprocess.run(
            [
                ffprobe_path,
                '-v', 'error',
                '-select_streams', 'v:0',
                '-show_entries', 'stream=width,height',
                '-of', 'default=noprint_wrappers=1:nokey=1',
                path,
            ],
            capture_output=True, text=True, timeout=20
        )
        if result.returncode != 0:
            return (0, 0)
        vals = [v.strip() for v in result.stdout.splitlines() if v.strip()]
        if len(vals) >= 2:
            return (int(vals[0]), int(vals[1]))
    except Exception:
        pass
    return (0, 0)


def _ensure_min_artwork_size(artwork_path, min_size):
    if not artwork_path or not os.path.exists(artwork_path):
        return artwork_path
    width, height = _image_dimensions(artwork_path)
    if width >= min_size and height >= min_size:
        return artwork_path
    if not _ffmpeg_exec_path or not os.path.exists(_ffmpeg_exec_path):
        return artwork_path

    out_path = os.path.splitext(artwork_path)[0] + f'_min{min_size}.jpg'
    # Preserve aspect ratio, scale until both dimensions cover min_size, then center crop.
    # This prevents warping/stretching while guaranteeing a square cover size.
    scale_filter = (
        f"scale={min_size}:{min_size}:force_original_aspect_ratio=increase,"
        f"crop={min_size}:{min_size}"
    )
    try:
        result = subprocess.run(
            [
                _ffmpeg_exec_path, '-y', '-i', artwork_path,
                '-vf', scale_filter,
                '-q:v', '2',
                out_path,
            ],
            capture_output=True, text=True, timeout=60
        )
        if result.returncode == 0 and os.path.exists(out_path):
            return out_path
    except Exception:
        pass
    return artwork_path


def _normalize_audio_tags(raw):
    if not isinstance(raw, dict):
        return {}

    title = (raw.get('title') or raw.get('name') or '').strip()
    artist = (
        raw.get('artist')
        or raw.get('uploader')
        or raw.get('creator')
        or raw.get('channel')
        or ''
    ).strip()
    album = (raw.get('album') or '').strip()
    track = raw.get('track') or raw.get('track_number') or raw.get('track_number_int')
    if track is None:
        track = raw.get('trackNumber')
    date_val = (
        raw.get('date')
        or raw.get('release_date')
        or raw.get('upload_date')
        or ''
    ).strip()
    genre = (raw.get('genre') or '').strip()

    tags = {
        'title': title,
        'artist': artist,
        'album': album,
        'track': str(track).strip() if track is not None else '',
        'date': date_val,
        'genre': genre,
    }
    return {k: v for k, v in tags.items() if v}


def _embed_audio_metadata(file_path, metadata, artwork_path=''):
    if not file_path or not os.path.exists(file_path):
        return file_path
    if not _ffmpeg_exec_path or not os.path.exists(_ffmpeg_exec_path):
        return file_path
    if not isinstance(metadata, dict):
        return file_path

    tags = _normalize_audio_tags(metadata)
    if artwork_path:
        artwork_path = _ensure_min_artwork_size(artwork_path, _MIN_ARTWORK_SIZE)

    tmp_out = file_path + '.meta.tmp' + os.path.splitext(file_path)[1]
    cmd = [_ffmpeg_exec_path, '-y', '-i', file_path]
    with_art = bool(artwork_path and os.path.exists(artwork_path))
    if with_art:
        cmd.extend(['-i', artwork_path, '-map', '0:a', '-map', '1:v'])
    cmd.extend(['-c:a', 'copy'])
    if with_art:
        cmd.extend(['-c:v', 'mjpeg', '-disposition:v:0', 'attached_pic'])
    cmd.extend(['-map_metadata', '-1'])
    for key in ('title', 'artist', 'album', 'track', 'date', 'genre'):
        val = tags.get(key)
        if val:
            cmd.extend(['-metadata', f'{key}={val}'])
    if with_art:
        cmd.extend(['-metadata:s:v', 'title=Album cover', '-metadata:s:v', 'comment=Cover (front)'])
    if file_path.lower().endswith('.mp3'):
        cmd.extend(['-id3v2_version', '3'])
    cmd.append(tmp_out)

    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=90)
        if result.returncode == 0 and os.path.exists(tmp_out):
            os.replace(tmp_out, file_path)
    except Exception:
        pass
    finally:
        if os.path.exists(tmp_out):
            try:
                os.remove(tmp_out)
            except Exception:
                pass
    return file_path


def _track_to_reclip_item(track, index=None, list_name=None, fallback_album=None):
    album = track.get('album') or fallback_album or {}
    images = album.get('images') or []
    artists = track.get('artists') or []
    spotify_url = (track.get('external_urls') or {}).get('spotify', '')
    uploader = ', '.join(artist.get('name', '') for artist in artists if artist.get('name'))
    item = {
        'url': spotify_url,
        'spotifyUrl': spotify_url,
        'source': 'spotify',
        'title': track.get('name') or 'Untitled',
        'uploader': uploader,
        'thumbnail': images[0].get('url', '') if images else '',
        'duration': int((track.get('duration_ms') or 0) / 1000) or None,
        'formats': [],
        'audioOnly': True,
    }
    if list_name:
        item['playlist'] = list_name
    if index is not None:
        item['playlistPosition'] = index + 1
    return item


def _largest_spotify_image_url(images):
    best_url = ''
    best_area = -1
    for img in images or []:
        if not isinstance(img, dict):
            continue
        url = img.get('url') or ''
        if not url:
            continue
        w = int(img.get('width') or 0)
        h = int(img.get('height') or 0)
        area = w * h
        if area > best_area:
            best_area = area
            best_url = url
    return best_url


def _best_thumbnail_url_from_info(info):
    if not isinstance(info, dict):
        return ''
    best_url = ''
    best_area = -1
    for thumb in info.get('thumbnails') or []:
        if not isinstance(thumb, dict):
            continue
        url = thumb.get('url') or ''
        if not url:
            continue
        w = int(thumb.get('width') or 0)
        h = int(thumb.get('height') or 0)
        area = w * h
        if area > best_area:
            best_area = area
            best_url = url
    if best_url:
        return best_url
    return info.get('thumbnail') or ''


def _get_spotify_info(url):
    """Resolve public Spotify metadata through a mobile spotDL-style adapter."""
    try:
        kind, spotify_id, resolved = _spotify_type_and_id(url)
        items = []

        if kind == 'track':
            track = _spotify_api(f'tracks/{spotify_id}')
            items.append(_track_to_reclip_item(track))
        elif kind == 'album':
            album = _spotify_api(f'albums/{spotify_id}')
            tracks = album.get('tracks', {}).get('items', [])
            while album.get('tracks', {}).get('next'):
                next_url = album['tracks']['next'].split('/v1/', 1)[1]
                next_page = _spotify_api(next_url)
                tracks.extend(next_page.get('items', []))
                album['tracks']['next'] = next_page.get('next')
            items = [
                _track_to_reclip_item(track, index, album.get('name'), album)
                for index, track in enumerate(tracks)
            ]
        else:
            playlist = _spotify_api(f'playlists/{spotify_id}')
            entries = playlist.get('tracks', {}).get('items', [])
            while playlist.get('tracks', {}).get('next'):
                next_url = playlist['tracks']['next'].split('/v1/', 1)[1]
                next_page = _spotify_api(next_url)
                entries.extend(next_page.get('items', []))
                playlist['tracks']['next'] = next_page.get('next')
            tracks = [entry.get('track') for entry in entries if entry.get('track')]
            items = [
                _track_to_reclip_item(track, index, playlist.get('name'))
                for index, track in enumerate(tracks)
            ]

        if not items:
            return _spotify_error('No public Spotify tracks found for this link.')

        first = items[0]
        return json.dumps({
            'success': True,
            'source': 'spotify',
            'title': first.get('title', 'Spotify'),
            'thumbnail': first.get('thumbnail', ''),
            'duration': first.get('duration'),
            'uploader': first.get('uploader', ''),
            'formats': [],
            'audioOnly': True,
            'url': first.get('url') or url,
            'spotifyUrl': resolved,
            'items': items,
        })
    except Exception as e:
        return _spotify_error(str(e))


# ── Video Info ──

def get_info(url):
    """Fetch video metadata without downloading."""
    if _is_spotify_url(url):
        return _get_spotify_info(url)

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
                'tbr': round(float(f.get('tbr') or 0), 1),
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

def download_media(url, output_dir, format_choice='video', format_id=None, title='', audio_profile=None):
    """
    Download video/audio to the specified directory.
    format_choice: 'video' or 'audio'
    format_id: specific format ID for quality selection
    Returns JSON string with file path or error.
    """
    if _is_spotify_url(url):
        return _download_spotify_media(url, output_dir)

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
            'writethumbnail': True,
            'addmetadata': True,
        }

        # Apply bundled ffmpeg location
        ydl_opts.update(_get_ffmpeg_opts())

        # Track expected output extension for finding the file later
        expected_ext = None

        if format_choice == 'audio':
            ydl_opts['format'] = 'bestaudio/best'
            profile = _AUDIO_PROFILES.get(audio_profile or '', _AUDIO_PROFILES['mp3_320_cbr'])
            has_lame = _check_libmp3lame()

            if profile['codec'] == 'flac':
                pp_codec, pp_quality, expected_ext = 'flac', None, '.flac'
            elif profile['codec'] == 'mp3' and has_lame:
                pp_codec, pp_quality, expected_ext = 'mp3', profile['quality'], '.mp3'
            else:
                pp_codec, pp_quality, expected_ext = 'aac', '192', '.m4a'

            pp = {'key': 'FFmpegExtractAudio', 'preferredcodec': pp_codec}
            if pp_quality is not None:
                pp['preferredquality'] = pp_quality
            ydl_opts['postprocessors'] = [pp, {'key': 'FFmpegMetadata'}, {'key': 'EmbedThumbnail'}]
            if pp_codec != 'aac':
                ydl_opts['postprocessor_args'] = {'ffmpegextractaudio': profile['extra_args']}
        elif format_id:
            ydl_opts['format'] = f'{format_id}+bestaudio/best'
            ydl_opts['merge_output_format'] = 'mp4'
            ydl_opts['postprocessors'] = [
                {'key': 'FFmpegMetadata'},
                {'key': 'EmbedThumbnail'},
            ]
            expected_ext = '.mp4'
        else:
            ydl_opts['format'] = 'bestvideo+bestaudio/best'
            ydl_opts['merge_output_format'] = 'mp4'
            ydl_opts['postprocessors'] = [
                {'key': 'FFmpegMetadata'},
                {'key': 'EmbedThumbnail'},
            ]
            expected_ext = '.mp4'

        downloaded_file = None
        downloaded_thumb = ''
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            filename = ydl.prepare_filename(info)
            requested = (info.get('requested_downloads') or [])
            for req in requested:
                if isinstance(req, dict):
                    thumb_path = req.get('filepath')
                    if isinstance(thumb_path, str) and thumb_path.lower().endswith(('.jpg', '.jpeg', '.webp', '.png')):
                        if os.path.exists(thumb_path):
                            downloaded_thumb = thumb_path

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
        source_info = info if isinstance(info, dict) else {}

        if (
            format_choice == 'audio'
            and downloaded_file
            and os.path.exists(downloaded_file)
        ):
            artwork_url = _best_thumbnail_url_from_info(source_info)
            artwork_path = _download_thumbnail(artwork_url, output_dir, f'{safe_title}_cover')
            metadata = {
                'title': source_info.get('track') or source_info.get('title') or title or '',
                'artist': source_info.get('artist') or source_info.get('uploader') or source_info.get('creator') or '',
                'album': source_info.get('album') or '',
                'track': source_info.get('track_number') or '',
                'date': source_info.get('release_date') or source_info.get('upload_date') or '',
                'genre': source_info.get('genre') or '',
            }
            downloaded_file = _embed_audio_metadata(downloaded_file, metadata, artwork_path)

        if downloaded_file and os.path.exists(downloaded_file):
            file_size = os.path.getsize(downloaded_file)
            if not downloaded_thumb:
                base = os.path.splitext(downloaded_file)[0]
                for ext in ('.jpg', '.jpeg', '.webp', '.png'):
                    t = base + ext
                    if os.path.exists(t):
                        downloaded_thumb = t
                        break
            result = {
                'success': True,
                'file': downloaded_file,
                'filename': os.path.basename(downloaded_file),
                'size': file_size,
            }
            # Keep artwork embedded in the media file; don't expose sidecar image files.
            return json.dumps(result)
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

def _download_spotify_media(url, output_dir):
    """Download a Spotify-matched audio file through yt-dlp search."""
    global _current_progress
    try:
        os.makedirs(output_dir, exist_ok=True)
        _current_progress = {'percent': 3, 'speed': '', 'eta': '', 'status': 'resolving'}

        kind, spotify_id, _resolved = _spotify_type_and_id(url)
        if kind != 'track':
            return json.dumps({
                'success': False,
                'source': 'spotify',
                'error': 'Choose an individual Spotify track to download.',
            })

        track = _spotify_api(f'tracks/{spotify_id}')
        item = _track_to_reclip_item(track)
        title = item.get('title') or 'spotify_track'
        uploader = item.get('uploader') or ''
        query = f'{uploader} - {title} official audio'.strip()
        if not query:
            return json.dumps({
                'success': False,
                'source': 'spotify',
                'error': 'No matching public Spotify track found.',
            })

        _current_progress = {'percent': 25, 'speed': '', 'eta': '', 'status': 'matching'}
        safe_title = ''.join(c for c in f'{uploader} - {title}' if c not in r'\/:*?"<>|').strip()
        safe_title = (safe_title or 'spotify_track')[:100].strip()
        out_template = os.path.join(output_dir, f'{safe_title}.%(ext)s')

        expected_ext = '.mp3' if _check_libmp3lame() else '.m4a'
        ydl_opts = {
            'quiet': True,
            'no_warnings': True,
            'ignoreconfig': True,
            'noplaylist': True,
            'format': 'bestaudio/best',
            'paths': {
                'home': output_dir,
                'temp': output_dir,
            },
            'outtmpl': {
                'default': f'{safe_title}.%(ext)s',
            },
            'progress_hooks': [_progress_hook],
            'postprocessors': [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'mp3' if _check_libmp3lame() else 'aac',
                'preferredquality': '192',
            }],
        }
        ydl_opts.update(_get_ffmpeg_opts())

        downloaded_file = ''
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info('ytsearch1:' + query, download=True)
            entry = (info.get('entries') or [info])[0]
            filename = ydl.prepare_filename(entry)
            candidate = os.path.splitext(filename)[0] + expected_ext
            candidate_paths = [
                candidate,
                filename,
                info.get('filepath', ''),
                info.get('_filename', ''),
                entry.get('filepath', ''),
                entry.get('_filename', ''),
            ]
            for requested in entry.get('requested_downloads') or []:
                if isinstance(requested, dict):
                    candidate_paths.append(requested.get('filepath', ''))
            for maybe_path in candidate_paths:
                if isinstance(maybe_path, str) and maybe_path and os.path.exists(maybe_path):
                    downloaded_file = maybe_path
                    break

        _current_progress = {'percent': 100, 'speed': '', 'eta': '', 'status': 'processing'}

        filename = downloaded_file or ''
        if not filename or not os.path.exists(filename):
            audio_exts = ('.mp3', '.m4a', '.aac', '.opus', '.ogg', '.wav')
            picked = ''
            for f in sorted(os.listdir(output_dir),
                            key=lambda x: os.path.getmtime(os.path.join(output_dir, x)),
                            reverse=True):
                candidate = os.path.join(output_dir, f)
                lower = f.lower()
                if not os.path.isfile(candidate):
                    continue
                if lower.endswith(('.part', '.ytdl', '.tmp')):
                    continue
                if not lower.endswith(audio_exts):
                    continue
                if safe_title and not f.startswith(safe_title):
                    continue
                picked = candidate
                break
            if not picked:
                for f in sorted(os.listdir(output_dir),
                                key=lambda x: os.path.getmtime(os.path.join(output_dir, x)),
                                reverse=True):
                    candidate = os.path.join(output_dir, f)
                    lower = f.lower()
                    if not os.path.isfile(candidate):
                        continue
                    if lower.endswith(('.part', '.ytdl', '.tmp')):
                        continue
                    if not lower.endswith(audio_exts):
                        continue
                    picked = candidate
                    break
            filename = picked

        if filename and os.path.exists(filename):
            album_images = (track.get('album') or {}).get('images') or []
            thumbnail_url = _largest_spotify_image_url(album_images) or item.get('thumbnail') or ''
            artist_genre = ''
            try:
                first_artist = ((track.get('artists') or [None])[0] or {}).get('id')
                if first_artist:
                    artist_data = _spotify_api(f'artists/{first_artist}')
                    genres = artist_data.get('genres') or []
                    if genres:
                        artist_genre = genres[0]
            except Exception:
                artist_genre = ''
            artwork_path = _download_thumbnail(thumbnail_url, output_dir, f'spotify_cover_{spotify_id}')
            metadata = {
                'title': track.get('name') or title,
                'artist': uploader,
                'album': ((track.get('album') or {}).get('name') or ''),
                'track': track.get('track_number') or '',
                'date': ((track.get('album') or {}).get('release_date') or ''),
                'genre': artist_genre,
            }
            filename = _embed_audio_metadata(filename, metadata, artwork_path)
            return json.dumps({
                'success': True,
                'source': 'spotify',
                'file': filename,
                'filename': os.path.basename(filename),
                'size': os.path.getsize(filename),
                'title': title,
                'uploader': uploader,
                'thumbnail': thumbnail_url,
                'album': ((track.get('album') or {}).get('name') or ''),
                'artists': [a.get('name', '') for a in (track.get('artists') or []) if a.get('name')],
            })

        return json.dumps({
            'success': False,
            'source': 'spotify',
            'error': 'Spotify match downloaded, but the output file was not found.',
            'output_dir': output_dir,
        })
    except Exception as e:
        return json.dumps({
            'success': False,
            'source': 'spotify',
            'error': str(e),
            'traceback': traceback.format_exc(),
        })


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

        audio_profiles = []
        for key, profile in _AUDIO_PROFILES.items():
            codec = profile.get('codec', '')
            quality = profile.get('quality')
            effective_supported = True
            if codec == 'mp3' and not has_mp3:
                effective_supported = False
            audio_profiles.append({
                'key': key,
                'codec': codec,
                'quality': quality if quality is not None else 'lossless',
                'ext': profile.get('ext', ''),
                'effective_supported': effective_supported,
            })

        return json.dumps({
            'success': True,
            'yt_dlp_version': ytdlp_version,
            'ffmpeg_available': ffmpeg_available,
            'ffmpeg_path': ffmpeg_path,
            'has_libmp3lame': has_mp3,
            'audio_profiles': audio_profiles,
            'audio_profile_default': 'mp3_320_cbr',
        })
    except Exception as e:
        return json.dumps({
            'success': False,
            'error': str(e),
        })
