import os
import uuid
import glob
import json
import time
import ipaddress
import subprocess
import threading
import urllib.parse
import urllib.request
from flask import Flask, request, jsonify, send_file, render_template

app = Flask(__name__)
DOWNLOAD_DIR = os.path.join(os.path.dirname(__file__), "downloads")
os.makedirs(DOWNLOAD_DIR, exist_ok=True)

HISTORY_FILE = os.path.join(DOWNLOAD_DIR, "history.json")
HISTORY_LIMIT = 200
_history_lock = threading.Lock()

jobs = {}


def _read_history():
    try:
        with open(HISTORY_FILE, "r", encoding="utf-8") as fh:
            data = json.load(fh)
        return data if isinstance(data, list) else []
    except (OSError, ValueError):
        return []


def _write_history(entries):
    tmp = HISTORY_FILE + ".tmp"
    try:
        with open(tmp, "w", encoding="utf-8") as fh:
            json.dump(entries, fh, ensure_ascii=False, indent=2)
        os.replace(tmp, HISTORY_FILE)
    except OSError:
        pass


def load_history():
    with _history_lock:
        return _read_history()


def add_history_entry(entry):
    """Persist a completed download, newest first, capped at HISTORY_LIMIT."""
    with _history_lock:
        entries = [e for e in _read_history() if e.get("id") != entry["id"]]
        entries.insert(0, entry)
        _write_history(entries[:HISTORY_LIMIT])


def find_history_entry(entry_id):
    for entry in load_history():
        if entry.get("id") == entry_id:
            return entry
    return None


def _is_public_http_url(url):
    """Only fetch thumbnails from normal public http(s) hosts."""
    try:
        parsed = urllib.parse.urlsplit(url)
        if parsed.scheme not in ("http", "https") or not parsed.hostname:
            return False
        host = parsed.hostname.lower()
        if host == "localhost" or host.endswith(".localhost"):
            return False
        try:
            ip = ipaddress.ip_address(host)
        except ValueError:
            return True
        return not (
            ip.is_private
            or ip.is_loopback
            or ip.is_link_local
            or ip.is_reserved
            or ip.is_multicast
            or ip.is_unspecified
        )
    except ValueError:
        return False


def cache_thumbnail(job_id, url):
    """Copy the remote thumbnail into the downloads volume so it survives."""
    if not url or not _is_public_http_url(url):
        return None
    try:
        req = urllib.request.Request(
            url, headers={"User-Agent": "Mozilla/5.0 (ReClip thumbnail cache)"}
        )
        with urllib.request.urlopen(req, timeout=20) as resp:
            if not _is_public_http_url(resp.geturl()):
                return None
            content_type = (resp.headers.get("Content-Type") or "").split(";")[0].strip().lower()
            data = resp.read(5 * 1024 * 1024)
        ext = {
            "image/webp": ".webp",
            "image/png": ".png",
            "image/gif": ".gif",
            "image/jpeg": ".jpg",
            "image/jpg": ".jpg",
        }.get(content_type, ".jpg")
        name = f"{job_id}-thumb{ext}"
        with open(os.path.join(DOWNLOAD_DIR, name), "wb") as fh:
            fh.write(data)
        return name
    except Exception:
        return None


def parse_ytdlp_json(stdout):
    """Parse yt-dlp JSON output.

    With ``-j`` yt-dlp prints one JSON object per line. Some extractors
    emit multiple videos even with ``--no-playlist``, so stdout contains
    several objects and a plain ``json.loads`` raises "Extra data".
    Return the first valid object.
    """
    for line in stdout.splitlines():
        line = line.strip()
        if not line:
            continue
        return json.loads(line)
    raise ValueError("yt-dlp returned no data")


def run_download(job_id, url, format_choice, format_id):
    job = jobs[job_id]
    out_template = os.path.join(DOWNLOAD_DIR, f"{job_id}.%(ext)s")

    cmd = ["yt-dlp", "--no-playlist", "-o", out_template]

    if format_choice == "audio":
        cmd += ["-x", "--audio-format", "mp3"]
    elif format_id:
        cmd += ["-f", f"{format_id}+bestaudio/best", "--merge-output-format", "mp4"]
    else:
        cmd += ["-f", "bestvideo+bestaudio/best", "--merge-output-format", "mp4"]

    cmd.append(url)

    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
        if result.returncode != 0:
            job["status"] = "error"
            job["error"] = result.stderr.strip().split("\n")[-1]
            return

        files = glob.glob(os.path.join(DOWNLOAD_DIR, f"{job_id}.*"))
        if not files:
            job["status"] = "error"
            job["error"] = "Download completed but no file was found"
            return

        if format_choice == "audio":
            target = [f for f in files if f.endswith(".mp3")]
            chosen = target[0] if target else files[0]
        else:
            target = [f for f in files if f.endswith(".mp4")]
            chosen = target[0] if target else files[0]

        for f in files:
            if f != chosen:
                try:
                    os.remove(f)
                except OSError:
                    pass

        job["file"] = chosen
        ext = os.path.splitext(chosen)[1]
        title = job.get("title", "").strip()
        # Sanitize title for filename
        if title:
            safe_title = "".join(c for c in title if c not in r'\/:*?"<>|').strip()[:100].strip()
            job["filename"] = f"{safe_title}{ext}" if safe_title else os.path.basename(chosen)
        else:
            job["filename"] = os.path.basename(chosen)

        thumb = cache_thumbnail(job_id, job.get("thumbnail", ""))
        job["thumb"] = thumb

        try:
            size = os.path.getsize(chosen)
        except OSError:
            size = None

        add_history_entry({
            "id": job_id,
            "title": title or os.path.splitext(job["filename"])[0],
            "url": url,
            "uploader": job.get("uploader", ""),
            "duration": job.get("duration"),
            "format": "audio" if format_choice == "audio" else "video",
            "filename": job["filename"],
            "file": os.path.basename(chosen),
            "thumb": thumb,
            "thumbnail": job.get("thumbnail", ""),
            "size": size,
            "created_at": int(time.time()),
        })

        job["status"] = "done"
    except subprocess.TimeoutExpired:
        job["status"] = "error"
        job["error"] = "Download timed out (5 min limit)"
    except Exception as e:
        job["status"] = "error"
        job["error"] = str(e)


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/info", methods=["POST"])
def get_info():
    data = request.json
    url = data.get("url", "").strip()
    if not url:
        return jsonify({"error": "No URL provided"}), 400

    cmd = ["yt-dlp", "--no-playlist", "-j", url]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
        if result.returncode != 0:
            return jsonify({"error": result.stderr.strip().split("\n")[-1]}), 400

        info = parse_ytdlp_json(result.stdout)

        # Build quality options — keep best format per resolution
        best_by_height = {}
        for f in info.get("formats", []):
            height = f.get("height")
            if height and f.get("vcodec", "none") != "none":
                tbr = f.get("tbr") or 0
                if height not in best_by_height or tbr > (best_by_height[height].get("tbr") or 0):
                    best_by_height[height] = f

        formats = []
        for height, f in best_by_height.items():
            formats.append({
                "id": f["format_id"],
                "label": f"{height}p",
                "height": height,
            })
        formats.sort(key=lambda x: x["height"], reverse=True)

        return jsonify({
            "title": info.get("title", ""),
            "thumbnail": info.get("thumbnail", ""),
            "duration": info.get("duration"),
            "uploader": info.get("uploader", ""),
            "formats": formats,
        })
    except subprocess.TimeoutExpired:
        return jsonify({"error": "Timed out fetching video info"}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route("/api/playlist", methods=["POST"])
def get_playlist_info():
    data = request.json
    url = data.get("url", "").strip()
    if not url:
        return jsonify({"error": "No URL provided"}), 400

    cmd = ["yt-dlp", "--flat-playlist", "-J", url]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
        if result.returncode != 0:
            return jsonify({"error": result.stderr.strip().split("\n")[-1]}), 400

        info = json.loads(result.stdout)
        entries = info.get("entries", [])
        urls = [entry.get("url") for entry in entries if entry.get("url")]
        return jsonify({"urls": urls})
    except subprocess.TimeoutExpired:
        return jsonify({"error": "Timed out fetching playlist info"}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route("/api/download", methods=["POST"])
def start_download():
    data = request.json
    url = data.get("url", "").strip()
    format_choice = data.get("format", "video")
    format_id = data.get("format_id")
    title = data.get("title", "")
    uploader = data.get("uploader", "")
    duration = data.get("duration")
    thumbnail = data.get("thumbnail", "")

    if not url:
        return jsonify({"error": "No URL provided"}), 400

    job_id = uuid.uuid4().hex[:10]
    jobs[job_id] = {
        "status": "downloading",
        "url": url,
        "title": title if isinstance(title, str) else "",
        "uploader": uploader if isinstance(uploader, str) else "",
        "duration": duration if isinstance(duration, (int, float)) else None,
        "thumbnail": thumbnail if isinstance(thumbnail, str) else "",
    }

    thread = threading.Thread(target=run_download, args=(job_id, url, format_choice, format_id))
    thread.daemon = True
    thread.start()

    return jsonify({"job_id": job_id})


@app.route("/api/status/<job_id>")
def check_status(job_id):
    job = jobs.get(job_id)
    if not job:
        return jsonify({"error": "Job not found"}), 404
    return jsonify({
        "status": job["status"],
        "error": job.get("error"),
        "filename": job.get("filename"),
    })


@app.route("/api/history")
def get_history():
    items = []
    for entry in load_history():
        item = dict(entry)
        file_name = os.path.basename(item.get("file") or "")
        thumb_name = os.path.basename(item.get("thumb") or "")
        item["available"] = bool(file_name) and os.path.isfile(os.path.join(DOWNLOAD_DIR, file_name))
        item["has_thumb"] = bool(thumb_name) and os.path.isfile(os.path.join(DOWNLOAD_DIR, thumb_name))
        items.append(item)
    return jsonify({"items": items})


@app.route("/api/thumb/<entry_id>")
def get_thumb(entry_id):
    job = jobs.get(entry_id) or {}
    entry = find_history_entry(entry_id) or {}
    thumb = job.get("thumb") or entry.get("thumb")
    if not thumb:
        return jsonify({"error": "No thumbnail"}), 404
    path = os.path.join(DOWNLOAD_DIR, os.path.basename(thumb))
    if not os.path.isfile(path):
        return jsonify({"error": "No thumbnail"}), 404
    return send_file(path, max_age=86400)


@app.route("/api/file/<job_id>")
def download_file(job_id):
    job = jobs.get(job_id)
    if job and job.get("status") == "done" and os.path.isfile(job.get("file", "")):
        return send_file(job["file"], as_attachment=True, download_name=job.get("filename"))

    entry = find_history_entry(job_id)
    if entry:
        file_name = os.path.basename(entry.get("file") or "")
        path = os.path.join(DOWNLOAD_DIR, file_name)
        if file_name and os.path.isfile(path):
            return send_file(path, as_attachment=True, download_name=entry.get("filename"))

    return jsonify({"error": "File not ready"}), 404


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8899))
    host = os.environ.get("HOST", "127.0.0.1")
    app.run(host=host, port=port)
