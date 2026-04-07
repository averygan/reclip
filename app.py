import os
import uuid
import glob
import json
import time
import subprocess
import threading
import logging
from flask import Flask, request, jsonify, send_file, render_template

app = Flask(__name__)
DOWNLOAD_DIR = os.path.join(os.path.dirname(__file__), "downloads")
os.makedirs(DOWNLOAD_DIR, exist_ok=True)

# Cleanup settings
MAX_DOWNLOAD_AGE_HOURS = 1  # Remove files older than 1 hour
MAX_DOWNLOAD_DIR_SIZE_MB = 500  # Remove oldest files when dir exceeds this

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

jobs = {}


def cleanup_old_downloads():
    """Remove download files older than MAX_DOWNLOAD_AGE_HOURS."""
    now = time.time()
    cutoff = now - (MAX_DOWNLOAD_AGE_HOURS * 3600)
    removed = 0
    for f in glob.glob(os.path.join(DOWNLOAD_DIR, "*")):
        try:
            if os.path.isfile(f) and os.path.getmtime(f) < cutoff:
                os.remove(f)
                removed += 1
        except OSError:
            pass
    if removed:
        logger.info(f"Cleanup: removed {removed} old download(s)")


def enforce_dir_size_limit():
    """If downloads dir exceeds MAX_DOWNLOAD_DIR_SIZE_MB, remove oldest files first."""
    files = []
    total = 0
    for f in glob.glob(os.path.join(DOWNLOAD_DIR, "*")):
        if os.path.isfile(f):
            size = os.path.getsize(f)
            total += size
            files.append((os.path.getmtime(f), f, size))

    max_bytes = MAX_DOWNLOAD_DIR_SIZE_MB * 1024 * 1024
    if total <= max_bytes:
        return

    # Sort oldest first, remove until under limit
    files.sort()
    removed = 0
    for _, f, size in files:
        try:
            os.remove(f)
            total -= size
            removed += 1
            if total <= max_bytes:
                break
        except OSError:
            pass
    if removed:
        logger.info(f"Cleanup: removed {removed} file(s) to enforce size limit")


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

        job["status"] = "done"
        job["file"] = chosen
        ext = os.path.splitext(chosen)[1]
        title = job.get("title", "").strip()
        # Sanitize title for filename
        if title:
            safe_title = "".join(c for c in title if c not in r'\/:*?"<>|').strip()[:20].strip()
            job["filename"] = f"{safe_title}{ext}" if safe_title else os.path.basename(chosen)
        else:
            job["filename"] = os.path.basename(chosen)
    except subprocess.TimeoutExpired:
        job["status"] = "error"
        job["error"] = "Download timed out (5 min limit)"
    except Exception as e:
        job["status"] = "error"
        job["error"] = str(e)


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/cleanup", methods=["POST"])
def cleanup_endpoint():
    """Manually trigger cleanup of old downloads."""
    cleanup_old_downloads()
    enforce_dir_size_limit()
    return jsonify({"status": "ok", "message": "Cleanup completed"})


@app.route("/api/downloads/stats", methods=["GET"])
def downloads_stats():
    """Return stats about the downloads folder."""
    files = glob.glob(os.path.join(DOWNLOAD_DIR, "*"))
    file_list = []
    total_size = 0
    for f in files:
        if os.path.isfile(f):
            size = os.path.getsize(f)
            total_size += size
            file_list.append({
                "name": os.path.basename(f),
                "size": size,
                "modified": os.path.getmtime(f),
            })
    file_list.sort(key=lambda x: x["modified"], reverse=True)
    return jsonify({
        "count": len(file_list),
        "total_size_bytes": total_size,
        "total_size_mb": round(total_size / (1024 * 1024), 2),
        "files": file_list,
    })


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

        info = json.loads(result.stdout)

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


@app.route("/api/download", methods=["POST"])
def start_download():
    data = request.json
    url = data.get("url", "").strip()
    format_choice = data.get("format", "video")
    format_id = data.get("format_id")
    title = data.get("title", "")

    if not url:
        return jsonify({"error": "No URL provided"}), 400

    # Run cleanup before starting new downloads
    cleanup_old_downloads()
    enforce_dir_size_limit()

    job_id = uuid.uuid4().hex[:10]
    jobs[job_id] = {"status": "downloading", "url": url, "title": title}

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


@app.route("/api/file/<job_id>")
def download_file(job_id):
    job = jobs.get(job_id)
    if not job or job["status"] != "done":
        return jsonify({"error": "File not ready"}), 404
    return send_file(job["file"], as_attachment=True, download_name=job["filename"])


if __name__ == "__main__":
    # Clean up stale downloads on startup
    cleanup_old_downloads()
    enforce_dir_size_limit()

    port = int(os.environ.get("PORT", 8899))
    host = os.environ.get("HOST", "127.0.0.1")
    app.run(host=host, port=port)
