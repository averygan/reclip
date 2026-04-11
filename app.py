import os
import uuid
import glob
import json
import time
import ipaddress
import subprocess
import threading
from urllib.parse import urlparse
from flask import Flask, request, jsonify, send_file, render_template
from flask_limiter import Limiter
import requests as http_requests
import db

app = Flask(__name__)
DOWNLOAD_DIR = os.path.join(os.path.dirname(__file__), "downloads")
os.makedirs(DOWNLOAD_DIR, exist_ok=True)

# ---- Config ----
ALLOWED_DOMAINS = {
    "youtube.com", "youtu.be", "m.youtube.com", "music.youtube.com",
    "tiktok.com", "vm.tiktok.com", "vt.tiktok.com",
    "twitter.com", "x.com", "mobile.twitter.com",
    "instagram.com", "www.instagram.com",
    "facebook.com", "fb.watch", "www.facebook.com",
    "reddit.com", "www.reddit.com", "v.redd.it",
    "vimeo.com",
    "soundcloud.com",
}
MAX_DURATION_SEC = 30 * 60      # 30 minutes
MAX_FILESIZE = 500 * 1024 * 1024  # 500 MB
FILE_TTL_SEC = 30 * 60          # auto-delete after 30 min
MAX_CONCURRENT_DOWNLOADS = 4

TURNSTILE_SECRET = os.environ.get("TURNSTILE_SECRET_KEY", "")
TURNSTILE_SITE = os.environ.get("TURNSTILE_SITE_KEY", "")

jobs = {}
jobs_lock = threading.Lock()
download_semaphore = threading.Semaphore(MAX_CONCURRENT_DOWNLOADS)


# ---- Helpers ----
def get_real_ip():
    return (
        request.headers.get("CF-Connecting-IP")
        or request.headers.get("X-Forwarded-For", "").split(",")[0].strip()
        or request.remote_addr
        or "0.0.0.0"
    )


limiter = Limiter(
    get_real_ip,
    app=app,
    default_limits=["200 per hour"],
    storage_uri="memory://",
)


def is_private_host(hostname):
    try:
        ip = ipaddress.ip_address(hostname)
        return ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved
    except ValueError:
        return False


def validate_url(url):
    if not url or len(url) > 2048:
        return "Invalid URL"
    try:
        p = urlparse(url)
    except Exception:
        return "Invalid URL"
    if p.scheme not in ("http", "https"):
        return "Only http(s) URLs allowed"
    host = (p.hostname or "").lower()
    if not host:
        return "Invalid URL"
    if is_private_host(host):
        return "Private addresses not allowed"
    # domain allowlist (match suffix)
    if not any(host == d or host.endswith("." + d) for d in ALLOWED_DOMAINS):
        return "Domain not supported"
    return None


def verify_turnstile(token):
    if not TURNSTILE_SECRET:
        return True  # disabled when not configured
    if not token:
        return False
    try:
        r = http_requests.post(
            "https://challenges.cloudflare.com/turnstile/v0/siteverify",
            data={
                "secret": TURNSTILE_SECRET,
                "response": token,
                "remoteip": get_real_ip(),
            },
            timeout=5,
        )
        return bool(r.json().get("success"))
    except Exception:
        return False


def cleanup_worker():
    while True:
        try:
            now = time.time()
            with jobs_lock:
                stale = [jid for jid, j in jobs.items() if now - j.get("created", now) > FILE_TTL_SEC]
                for jid in stale:
                    j = jobs.pop(jid, None)
                    if j and j.get("file"):
                        try:
                            os.remove(j["file"])
                        except OSError:
                            pass
            # orphan files on disk
            for f in glob.glob(os.path.join(DOWNLOAD_DIR, "*")):
                try:
                    if now - os.path.getmtime(f) > FILE_TTL_SEC:
                        os.remove(f)
                except OSError:
                    pass
        except Exception:
            pass
        time.sleep(120)


threading.Thread(target=cleanup_worker, daemon=True).start()

# Best-effort DB init — silent if DATABASE_URL not set
db.init()


def run_download(job_id, url, format_choice, format_id):
    with download_semaphore:
        job = jobs[job_id]
        out_template = os.path.join(DOWNLOAD_DIR, f"{job_id}.%(ext)s")

        cmd = [
            "yt-dlp",
            "--no-playlist",
            "--max-filesize", str(MAX_FILESIZE),
            "--match-filter", f"duration<={MAX_DURATION_SEC}",
            "--extractor-args", "youtube:player_client=tv,web_safari,web",
            "--user-agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
            "-o", out_template,
        ]

        quality_label = None
        if format_choice == "audio":
            cmd += ["-x", "--audio-format", "mp3"]
            quality_label = "audio"
        elif format_id:
            cmd += ["-f", f"{format_id}+bestaudio/best", "--merge-output-format", "mp4"]
            quality_label = str(format_id)
        else:
            cmd += ["-f", "bestvideo[height<=1080]+bestaudio/best[height<=1080]/best", "--merge-output-format", "mp4"]
            quality_label = "auto<=1080"

        cmd.append(url)

        t_start = time.time()
        success = False
        err_msg = None

        try:
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
            if result.returncode != 0:
                job["status"] = "error"
                err_msg = result.stderr.strip().split("\n")[-1] if result.stderr else "Download failed"
                job["error"] = err_msg
                return

            files = glob.glob(os.path.join(DOWNLOAD_DIR, f"{job_id}.*"))
            if not files:
                job["status"] = "error"
                err_msg = "File too large or too long"
                job["error"] = err_msg
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
            if title:
                safe_title = "".join(c for c in title if c not in r'\/:*?"<>|').strip()[:40].strip()
                job["filename"] = f"{safe_title}{ext}" if safe_title else os.path.basename(chosen)
            else:
                job["filename"] = os.path.basename(chosen)
            # Set status last so pollers don't see "done" before file+filename are populated
            job["status"] = "done"
            success = True
        except subprocess.TimeoutExpired:
            job["status"] = "error"
            err_msg = "Download timed out (5 min limit)"
            job["error"] = err_msg
        except Exception as e:
            job["status"] = "error"
            err_msg = str(e)
            job["error"] = err_msg
        finally:
            ms_elapsed = int((time.time() - t_start) * 1000)
            db.log_download(
                url=url,
                format="mp3" if format_choice == "audio" else "mp4",
                title=(job.get("title") or None),
                quality=quality_label,
                duration=job.get("duration"),
                country=job.get("country"),
                success=success,
                error=err_msg,
                ms_elapsed=ms_elapsed,
            )


@app.route("/")
def index():
    return render_template("index.html", turnstile_site_key=TURNSTILE_SITE)


@app.route("/healthz")
def healthz():
    return jsonify({"ok": True})


@app.route("/api/info", methods=["POST"])
@limiter.limit("30 per hour")
def get_info():
    data = request.json or {}
    url = (data.get("url") or "").strip()
    err = validate_url(url)
    if err:
        return jsonify({"error": err}), 400

    cmd = [
        "yt-dlp",
        "--no-playlist",
        "--extractor-args", "youtube:player_client=tv,web_safari,web",
        "--user-agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
        "-j", url,
    ]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
        if result.returncode != 0:
            return jsonify({"error": result.stderr.strip().split("\n")[-1] if result.stderr else "Failed"}), 400

        info = json.loads(result.stdout)
        duration = info.get("duration") or 0
        if duration and duration > MAX_DURATION_SEC:
            return jsonify({"error": f"Video too long (max {MAX_DURATION_SEC // 60} min)"}), 400

        best_by_height = {}
        for f in info.get("formats", []):
            height = f.get("height")
            if height and f.get("vcodec", "none") != "none":
                tbr = f.get("tbr") or 0
                if height not in best_by_height or tbr > (best_by_height[height].get("tbr") or 0):
                    best_by_height[height] = f

        formats = []
        for height, f in best_by_height.items():
            if height > 1080:
                continue
            formats.append({
                "id": f["format_id"],
                "label": f"{height}p",
                "height": height,
            })
        formats.sort(key=lambda x: x["height"], reverse=True)

        return jsonify({
            "title": info.get("title", ""),
            "thumbnail": info.get("thumbnail", ""),
            "duration": duration,
            "uploader": info.get("uploader", ""),
            "formats": formats,
        })
    except subprocess.TimeoutExpired:
        return jsonify({"error": "Timed out fetching video info"}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route("/api/download", methods=["POST"])
@limiter.limit("10 per hour")
def start_download():
    data = request.json or {}
    url = (data.get("url") or "").strip()
    format_choice = data.get("format", "video")
    format_id = data.get("format_id")
    title = data.get("title", "")
    duration = data.get("duration")
    cf_token = data.get("cf_token", "")

    err = validate_url(url)
    if err:
        return jsonify({"error": err}), 400

    if not verify_turnstile(cf_token):
        return jsonify({"error": "Bot check failed"}), 403

    country = request.headers.get("CF-IPCountry") or None

    job_id = uuid.uuid4().hex[:10]
    with jobs_lock:
        jobs[job_id] = {
            "status": "downloading",
            "url": url,
            "title": title,
            "duration": duration,
            "country": country,
            "created": time.time(),
        }

    thread = threading.Thread(target=run_download, args=(job_id, url, format_choice, format_id))
    thread.daemon = True
    thread.start()

    return jsonify({"job_id": job_id})


@app.route("/api/status/<job_id>")
@limiter.limit("600 per hour")
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
