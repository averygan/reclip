import os
import uuid
import glob
import json
import subprocess
import threading
import shutil
import sys
from flask import Flask, request, jsonify, send_file, render_template

app = Flask(__name__)
# Vercel serverless functions (and many other serverless platforms) only allow
# writes in /tmp. Keep local development behavior, but prefer /tmp in
# serverless environments to avoid startup crashes.
DEFAULT_DOWNLOAD_DIR = os.path.join(os.path.dirname(__file__), "downloads")
DOWNLOAD_DIR = os.environ.get("DOWNLOAD_DIR")
if not DOWNLOAD_DIR:
    if os.environ.get("VERCEL") or os.environ.get("AWS_LAMBDA_FUNCTION_NAME"):
        DOWNLOAD_DIR = "/tmp/clipdown-downloads"
    else:
        DOWNLOAD_DIR = DEFAULT_DOWNLOAD_DIR
os.makedirs(DOWNLOAD_DIR, exist_ok=True)

jobs = {}
YOUTUBE_BOT_ERROR_TEXT = "Sign in to confirm you’re not a bot"


def build_ytdlp_flags():
    flags = ["--no-playlist"]
    cookies_file = os.environ.get("YTDLP_COOKIES_FILE", "").strip()
    cookies_from_browser = os.environ.get("YTDLP_COOKIES_FROM_BROWSER", "").strip()
    if cookies_file:
        flags += ["--cookies", cookies_file]
    elif cookies_from_browser:
        flags += ["--cookies-from-browser", cookies_from_browser]
    return flags


def build_ytdlp_cmd(*args):
    override = os.environ.get("YT_DLP_BIN", "").strip()
    if override:
        return [override, *args]
    if shutil.which("yt-dlp"):
        return ["yt-dlp", *args]
    return [sys.executable, "-m", "yt_dlp", *args]


def is_youtube_url(url):
    u = (url or "").lower()
    return "youtube.com" in u or "youtu.be" in u


def run_ytdlp(cmd, url=None, timeout=60):
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
    if (
        result.returncode != 0
        and url
        and is_youtube_url(url)
        and YOUTUBE_BOT_ERROR_TEXT in result.stderr
    ):
        retry_cmd = [*cmd, "--extractor-args", "youtube:player_client=android"]
        return subprocess.run(retry_cmd, capture_output=True, text=True, timeout=timeout)
    return result


def build_ytdlp_flags():
    flags = ["--no-playlist"]
    cookies_file = os.environ.get("YTDLP_COOKIES_FILE", "").strip()
    cookies_from_browser = os.environ.get("YTDLP_COOKIES_FROM_BROWSER", "").strip()
    if cookies_file:
        flags += ["--cookies", cookies_file]
    elif cookies_from_browser:
        flags += ["--cookies-from-browser", cookies_from_browser]
    return flags


def build_ytdlp_cmd(*args):
    override = os.environ.get("YT_DLP_BIN", "").strip()
    if override:
        return [override, *args]
    if shutil.which("yt-dlp"):
        return ["yt-dlp", *args]
    return [sys.executable, "-m", "yt_dlp", *args]


def run_download(job_id, url, format_choice, format_id):
    job = jobs[job_id]
    out_template = os.path.join(DOWNLOAD_DIR, f"{job_id}.%(ext)s")

    cmd = build_ytdlp_cmd(*build_ytdlp_flags(), "-o", out_template)

    if format_choice == "audio":
        cmd += ["-x", "--audio-format", "mp3"]
    elif format_id:
        cmd += ["-f", f"{format_id}+bestaudio/best", "--merge-output-format", "mp4"]
    else:
        cmd += ["-f", "bestvideo+bestaudio/best", "--merge-output-format", "mp4"]

    cmd.append(url)

    try:
        result = run_ytdlp(cmd, url=url, timeout=300)
        if result.returncode != 0:
            last_error = result.stderr.strip().split("\n")[-1]
            if YOUTUBE_BOT_ERROR_TEXT in result.stderr:
                last_error = (
                    "YouTube blocked this request. "
                    "Try again with cookies. "
                    "Set YTDLP_COOKIES_FILE or YTDLP_COOKIES_FROM_BROWSER."
                )
            job["status"] = "error"
            job["error"] = last_error
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
    except FileNotFoundError:
        job["status"] = "error"
        job["error"] = "yt-dlp is not installed on the server"
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

    cmd = build_ytdlp_cmd(*build_ytdlp_flags(), "-j", url)
    try:
        result = run_ytdlp(cmd, url=url, timeout=60)
        if result.returncode != 0:
            last_error = result.stderr.strip().split("\n")[-1]
            if "Sign in to confirm you’re not a bot" in result.stderr:
                last_error = (
                    "YouTube requires cookies for this video. "
                    "Set YTDLP_COOKIES_FILE or YTDLP_COOKIES_FROM_BROWSER."
                )
            return jsonify({"error": last_error}), 400

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
    except FileNotFoundError:
        return jsonify({"error": "yt-dlp is not installed on the server"}), 500
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
    port = int(os.environ.get("PORT", 8899))
    host = os.environ.get("HOST", "127.0.0.1")
    app.run(host=host, port=port)
