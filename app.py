"""ReClip — lightweight self-hosted video/audio downloader."""

import logging
import os
import re
import time
import uuid
import glob
import json
import subprocess
import threading
from typing import Any
from urllib.parse import urlparse

from flask import Flask, request, jsonify, send_file, render_template, Response

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
log = logging.getLogger("reclip")

# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------
app = Flask(__name__)

DOWNLOAD_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "downloads")
os.makedirs(DOWNLOAD_DIR, exist_ok=True)

MAX_TITLE_LEN = 80
JOB_TTL_SECONDS = 3600  # auto-purge jobs older than 1 hour
MAX_JOBS = 500  # hard cap to prevent memory exhaustion

jobs: dict[str, dict[str, Any]] = {}
jobs_lock = threading.Lock()

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_SAFE_FILENAME_RE = re.compile(r'[^\w\s\-\.]', re.UNICODE)
_MULTI_SPACE_RE = re.compile(r'\s+')
_FORMAT_ID_RE = re.compile(r'^[\w\-\+]+$')


def _validate_url(url: str) -> str | None:
    """Return an error message if *url* is not a valid HTTP(S) URL."""
    try:
        parsed = urlparse(url)
    except Exception:
        return "Invalid URL"
    if parsed.scheme not in ("http", "https"):
        return "Only http and https URLs are supported"
    if not parsed.netloc:
        return "Invalid URL"
    return None


def _sanitize_title(title: str) -> str:
    """Produce a filesystem-safe title string."""
    title = title.strip()
    # Remove null bytes and control characters
    title = re.sub(r'[\x00-\x1f\x7f]', '', title)
    title = _SAFE_FILENAME_RE.sub('', title)
    title = _MULTI_SPACE_RE.sub(' ', title).strip()
    # Prevent hidden files
    title = title.lstrip('.')
    return title[:MAX_TITLE_LEN].strip()


def _validate_format_id(format_id: str | None) -> bool:
    """Return True if format_id looks safe (alphanumeric, dashes, plus)."""
    if format_id is None:
        return True
    return bool(_FORMAT_ID_RE.match(format_id))


def _purge_stale_jobs() -> None:
    """Remove completed/errored jobs older than JOB_TTL_SECONDS and their files."""
    now = time.time()
    stale = []
    with jobs_lock:
        for jid, job in jobs.items():
            if job["status"] in ("done", "error") and now - job.get("created", now) > JOB_TTL_SECONDS:
                stale.append(jid)
        for jid in stale:
            _cleanup_job_files(jid)
            del jobs[jid]
    if stale:
        log.info("Purged %d stale job(s)", len(stale))


def _cleanup_job_files(job_id: str) -> None:
    """Delete all files associated with a job."""
    for f in glob.glob(os.path.join(DOWNLOAD_DIR, f"{job_id}.*")):
        try:
            os.remove(f)
        except OSError:
            pass


# ---------------------------------------------------------------------------
# Download worker
# ---------------------------------------------------------------------------

def run_download(job_id: str, url: str, format_choice: str, format_id: str | None) -> None:
    """Execute yt-dlp in a background thread."""
    with jobs_lock:
        job = jobs.get(job_id)
    if not job:
        return

    out_template = os.path.join(DOWNLOAD_DIR, f"{job_id}.%(ext)s")

    cmd = ["yt-dlp", "--no-playlist", "--no-warnings", "-o", out_template]

    if format_choice == "audio":
        cmd += ["-x", "--audio-format", "mp3"]
    elif format_id:
        cmd += ["-f", f"{format_id}+bestaudio/best", "--merge-output-format", "mp4"]
    else:
        cmd += ["-f", "bestvideo+bestaudio/best", "--merge-output-format", "mp4"]

    cmd.append(url)

    log.info("Job %s: starting download for %s", job_id, url)

    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
        if result.returncode != 0:
            stderr_last = result.stderr.strip().split("\n")[-1] if result.stderr else "Unknown error"
            log.warning("Job %s: yt-dlp failed — %s", job_id, stderr_last)
            with jobs_lock:
                job["status"] = "error"
                job["error"] = stderr_last
            return

        files = glob.glob(os.path.join(DOWNLOAD_DIR, f"{job_id}.*"))
        if not files:
            with jobs_lock:
                job["status"] = "error"
                job["error"] = "Download completed but no file was found"
            return

        if format_choice == "audio":
            target = [f for f in files if f.endswith(".mp3")]
        else:
            target = [f for f in files if f.endswith(".mp4")]
        chosen = target[0] if target else files[0]

        # Remove intermediate files
        for f in files:
            if f != chosen:
                try:
                    os.remove(f)
                except OSError:
                    pass

        ext = os.path.splitext(chosen)[1]
        title = job.get("title", "")
        safe_title = _sanitize_title(title)
        filename = f"{safe_title}{ext}" if safe_title else os.path.basename(chosen)

        with jobs_lock:
            job["status"] = "done"
            job["file"] = chosen
            job["filename"] = filename

        log.info("Job %s: done — %s", job_id, filename)

    except subprocess.TimeoutExpired:
        with jobs_lock:
            job["status"] = "error"
            job["error"] = "Download timed out (5 min limit)"
        log.warning("Job %s: timed out", job_id)
    except Exception as e:
        with jobs_lock:
            job["status"] = "error"
            job["error"] = "Internal download error"
        log.exception("Job %s: unexpected error — %s", job_id, e)


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.route("/")
def index() -> str:
    return render_template("index.html")


@app.route("/api/info", methods=["POST"])
def get_info() -> tuple[Response, int] | Response:
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Invalid request body"}), 400

    url = (data.get("url") or "").strip()
    url_err = _validate_url(url)
    if url_err:
        return jsonify({"error": url_err}), 400

    cmd = ["yt-dlp", "--no-playlist", "--no-warnings", "-j", url]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
        if result.returncode != 0:
            stderr_last = result.stderr.strip().split("\n")[-1] if result.stderr else "Unknown error"
            return jsonify({"error": stderr_last}), 400

        info = json.loads(result.stdout)

        # Build quality options — keep best format per resolution
        best_by_height: dict[int, dict] = {}
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
    except json.JSONDecodeError:
        return jsonify({"error": "Failed to parse video info"}), 400
    except Exception:
        log.exception("Error in /api/info")
        return jsonify({"error": "Internal server error"}), 500


@app.route("/api/download", methods=["POST"])
def start_download() -> tuple[Response, int] | Response:
    _purge_stale_jobs()

    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Invalid request body"}), 400

    url = (data.get("url") or "").strip()
    url_err = _validate_url(url)
    if url_err:
        return jsonify({"error": url_err}), 400

    format_choice = data.get("format", "video")
    if format_choice not in ("video", "audio"):
        return jsonify({"error": "Invalid format"}), 400

    format_id = data.get("format_id")
    if not _validate_format_id(format_id):
        return jsonify({"error": "Invalid format_id"}), 400

    title = (data.get("title") or "")[:200]  # cap title length from client

    with jobs_lock:
        if len(jobs) >= MAX_JOBS:
            return jsonify({"error": "Server is busy, please try again later"}), 503

    job_id = uuid.uuid4().hex[:10]
    with jobs_lock:
        jobs[job_id] = {
            "status": "downloading",
            "url": url,
            "title": title,
            "created": time.time(),
        }

    thread = threading.Thread(
        target=run_download,
        args=(job_id, url, format_choice, format_id),
        daemon=True,
    )
    thread.start()

    return jsonify({"job_id": job_id})


@app.route("/api/status/<job_id>")
def check_status(job_id: str) -> tuple[Response, int] | Response:
    # Validate job_id format (hex, 10 chars)
    if not re.match(r'^[0-9a-f]{10}$', job_id):
        return jsonify({"error": "Invalid job ID"}), 400

    with jobs_lock:
        job = jobs.get(job_id)
    if not job:
        return jsonify({"error": "Job not found"}), 404

    return jsonify({
        "status": job["status"],
        "error": job.get("error"),
        "filename": job.get("filename"),
    })


@app.route("/api/file/<job_id>")
def download_file(job_id: str) -> tuple[Response, int] | Response:
    # Validate job_id format
    if not re.match(r'^[0-9a-f]{10}$', job_id):
        return jsonify({"error": "Invalid job ID"}), 400

    with jobs_lock:
        job = jobs.get(job_id)
    if not job or job["status"] != "done":
        return jsonify({"error": "File not ready"}), 404

    filepath = job.get("file", "")

    # Path traversal protection: ensure file is inside DOWNLOAD_DIR
    real_path = os.path.realpath(filepath)
    if not real_path.startswith(os.path.realpath(DOWNLOAD_DIR)):
        log.warning("Path traversal attempt blocked: %s", filepath)
        return jsonify({"error": "Access denied"}), 403

    if not os.path.isfile(real_path):
        return jsonify({"error": "File not found"}), 404

    return send_file(real_path, as_attachment=True, download_name=job.get("filename", "download"))


@app.route("/api/cleanup/<job_id>", methods=["POST"])
def cleanup_job(job_id: str) -> tuple[Response, int] | Response:
    """Allow clients to signal they've downloaded the file so we can clean up."""
    if not re.match(r'^[0-9a-f]{10}$', job_id):
        return jsonify({"error": "Invalid job ID"}), 400

    with jobs_lock:
        job = jobs.pop(job_id, None)
    if not job:
        return jsonify({"error": "Job not found"}), 404

    _cleanup_job_files(job_id)
    return jsonify({"ok": True})


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8899))
    host = os.environ.get("HOST", "127.0.0.1")
    app.run(host=host, port=port, debug=False)
