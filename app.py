import os
import re
import uuid
import glob
import json
import queue
import time
import subprocess
import threading
from collections import deque
from flask import Flask, request, jsonify, send_file, render_template

app = Flask(__name__)
DOWNLOAD_DIR = os.path.join(os.path.dirname(__file__), "downloads")
os.makedirs(DOWNLOAD_DIR, exist_ok=True)

# Optional login state for paywalled / login-required videos (Bilibili premium,
# charging-exclusive, etc.). Cookies only prove identity — the account itself
# must own the access.
#   RECLIP_COOKIES_FILE    = path to a Netscape cookies.txt (recommended)
#   RECLIP_COOKIES_BROWSER = browser name for --cookies-from-browser (chrome, edge, firefox, ...)
# Never commit a cookies file to git.
COOKIES_FILE = os.environ.get("RECLIP_COOKIES_FILE", "").strip()
COOKIES_BROWSER = os.environ.get("RECLIP_COOKIES_BROWSER", "").strip()
# Cookies configured from the web UI are stored here (gitignored) and take
# precedence over the env config above.
COOKIES_STORE = os.path.join(os.path.dirname(__file__), "cookies.txt")
# Big files (long 4K videos) easily exceed the old 5 min limit.
DOWNLOAD_TIMEOUT = int(os.environ.get("RECLIP_DOWNLOAD_TIMEOUT", "1800"))
# Parallel fragment downloads (HLS/DASH segmented streams, e.g. YouTube).
# No effect on single-file downloads. Raise for flaky/throttled links.
CONCURRENT_FRAGMENTS = int(os.environ.get("RECLIP_CONCURRENT_FRAGMENTS", "4"))

jobs = {}


def cookies_source():
    """Which cookie config is active: settings | env | browser | None."""
    if os.path.isfile(COOKIES_STORE) and os.path.getsize(COOKIES_STORE) > 0:
        return "settings"
    if COOKIES_FILE:
        return "env"
    if COOKIES_BROWSER:
        return "browser"
    return None


def active_cookies_file():
    """Page-configured cookies take precedence over the env file."""
    if os.path.isfile(COOKIES_STORE) and os.path.getsize(COOKIES_STORE) > 0:
        return COOKIES_STORE
    return COOKIES_FILE or None


def ytdlp_base_cmd(url):
    """Common yt-dlp args: auth cookies + anti-bot headers.

    Bilibili's WAF answers HTTP 412 to bare requests; sending an Origin
    header for the site passes it.
    """
    cmd = ["yt-dlp"]
    ck = active_cookies_file()
    if ck:
        cmd += ["--cookies", ck]
    elif COOKIES_BROWSER:
        cmd += ["--cookies-from-browser", COOKIES_BROWSER]
    if "bilibili.com" in url or "b23.tv" in url:
        cmd += ["--add-header", "Origin:https://www.bilibili.com"]
    return cmd


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

    cmd = ytdlp_base_cmd(url) + ["--no-playlist", "-o", out_template]

    if format_choice == "audio":
        cmd += ["-x", "--audio-format", "mp3"]
    elif format_id:
        # Try video+audio merge first (DASH), then the format alone
        # (Bilibili's low-res durl mp4s already contain audio), then best.
        cmd += ["-f", f"{format_id}+bestaudio/{format_id}/best", "--merge-output-format", "mp4"]
    else:
        cmd += ["-f", "bestvideo+bestaudio/best", "--merge-output-format", "mp4"]

    # Machine-readable progress line per download step.
    cmd += ["--newline", "--progress-template",
            "download:PROGRESS|%(progress.downloaded_bytes)s|%(progress.total_bytes)s"
            "|%(progress.total_bytes_estimate)s|%(progress.speed)s|%(progress.eta)s"]
    # Fetch segmented streams (HLS/DASH) in parallel; harmless for single files.
    if CONCURRENT_FRAGMENTS > 1:
        cmd += ["--concurrent-fragments", str(CONCURRENT_FRAGMENTS)]
    cmd.append(url)

    job["progress"] = {"phase": "starting", "stage": 0, "percent": None,
                       "downloaded_bytes": None, "total_bytes": None, "speed": None, "eta": None}
    lines = deque(maxlen=100)

    def handle_line(line):
        lines.append(line)
        if line.startswith("PROGRESS|"):
            parts = line.split("|")

            def num(i):
                try:
                    v = float(parts[i])
                    return None if v != v else v  # NaN guard
                except (IndexError, TypeError, ValueError):
                    return None

            downloaded, total = num(1), num(2) or num(3)
            job["progress"] = {
                "phase": "downloading",
                "stage": (job.get("progress") or {}).get("stage", 1),
                "percent": round(downloaded / total * 100, 1) if downloaded is not None and total else None,
                "downloaded_bytes": downloaded,
                "total_bytes": total,
                "speed": num(4),
                "eta": num(5),
            }
        elif "[download] Destination:" in line:
            # DASH downloads fetch video and audio as separate parts; the
            # percent restarts at 0 for each, so count them.
            prev = job.get("progress") or {}
            job["progress"] = {**prev, "phase": "downloading",
                               "stage": prev.get("stage", 0) + 1,
                               "percent": None, "downloaded_bytes": None,
                               "total_bytes": None, "speed": None, "eta": None}
        elif "[Merger]" in line:
            job["progress"] = {**job["progress"], "phase": "merging",
                               "percent": None, "speed": None, "eta": None}
        elif "[ExtractAudio]" in line or "[Fixup" in line or "[VideoRemuxer]" in line:
            job["progress"] = {**job["progress"], "phase": "processing",
                               "percent": None, "speed": None, "eta": None}

    try:
        proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                                text=True, encoding="utf-8", errors="replace", bufsize=1)
        job["_proc"] = proc
        out_q = queue.Queue()

        def reader():
            for line in proc.stdout:
                out_q.put(line)
            out_q.put(None)

        threading.Thread(target=reader, daemon=True).start()

        deadline = time.monotonic() + DOWNLOAD_TIMEOUT
        timed_out = False
        while True:
            try:
                line = out_q.get(timeout=5)
            except queue.Empty:
                if time.monotonic() > deadline:
                    proc.kill()
                    timed_out = True
                    break
                continue
            if line is None:
                break
            handle_line(line.rstrip("\r\n"))
        proc.wait()

        if job.get("cancel"):
            # User abort: drop the partial files ({job_id}.* never reaches the UI).
            for f in glob.glob(os.path.join(DOWNLOAD_DIR, f"{job_id}.*")):
                try:
                    os.remove(f)
                except OSError:
                    pass
            job["status"] = "cancelled"
            return
        if timed_out:
            job["status"] = "error"
            job["error"] = f"Download timed out ({DOWNLOAD_TIMEOUT // 60} min limit)"
            return
        if proc.returncode != 0:
            job["status"] = "error"
            useful = [l for l in lines if not l.startswith("PROGRESS|")]
            err = next((l for l in reversed(useful) if "ERROR" in l), None)
            job["error"] = err or (useful[-1] if useful else "Download failed")
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
            safe_title = "".join(c for c in title if c not in r'\/:*?"<>|').strip()[:100].strip()
            job["filename"] = f"{safe_title}{ext}" if safe_title else os.path.basename(chosen)
        else:
            job["filename"] = os.path.basename(chosen)
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

    cmd = ytdlp_base_cmd(url) + ["--no-playlist", "-j", url]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
        if result.returncode != 0:
            return jsonify({"error": result.stderr.strip().split("\n")[-1]}), 400

        info = parse_ytdlp_json(result.stdout)

        # Build quality options — keep best format per resolution.
        # vcodec is "none" only for explicit audio-only formats; some
        # extractors (e.g. Bilibili's durl mp4s) omit vcodec entirely even
        # though the format has video, so missing must not be treated as
        # audio-only.
        best_by_height = {}
        for f in info.get("formats", []):
            height = f.get("height")
            if height and f.get("vcodec") != "none":
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

    cmd = ytdlp_base_cmd(url) + ["--flat-playlist", "-J", url]
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
        "progress": job.get("progress"),
    })


@app.route("/api/download/<job_id>", methods=["DELETE"])
def cancel_download(job_id):
    job = jobs.get(job_id)
    if not job:
        return jsonify({"error": "Job not found"}), 404
    if job["status"] != "downloading":
        return jsonify({"error": f"Job already {job['status']}"}), 400
    job["cancel"] = True
    proc = job.get("_proc")
    if proc:
        try:
            proc.kill()
        except OSError:
            pass
    return jsonify({"ok": True})


@app.route("/api/cookies", methods=["GET", "POST", "DELETE"])
def manage_cookies():
    """Manage login cookies from the web UI.

    The cookie content itself is never returned by the API.
    """
    if request.method == "GET":
        source = cookies_source()
        return jsonify({"configured": source is not None, "source": source})

    if request.method == "DELETE":
        try:
            if os.path.isfile(COOKIES_STORE):
                os.remove(COOKIES_STORE)
        except OSError as e:
            return jsonify({"error": str(e)}), 500
        return jsonify({"ok": True, "configured": cookies_source() is not None})

    data = request.json or {}
    content = (data.get("content") or "").strip()
    if not content:
        return jsonify({"error": "No cookie content provided"}), 400

    if "# Netscape HTTP Cookie File" in content or any(l.count("\t") >= 5 for l in content.splitlines()):
        # Already in Netscape cookies.txt format
        body = content if content.endswith("\n") else content + "\n"
        count = sum(1 for l in body.splitlines() if l.strip() and not l.startswith("#"))
    else:
        # Browser "Cookie" header string: "a=b; c=d" -> Netscape lines
        domain = (data.get("domain") or "").strip() or ".bilibili.com"
        if not re.fullmatch(r"\.?[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}", domain):
            return jsonify({"error": f"Invalid domain: {domain}"}), 400
        rows = []
        for pair in content.strip().rstrip(";").split(";"):
            if "=" not in pair:
                continue
            name, value = pair.split("=", 1)
            if name.strip():
                rows.append(f"{domain}\tTRUE\t/\tTRUE\t0\t{name.strip()}\t{value.strip()}")
        if not rows:
            return jsonify({"error": "No name=value cookie pairs found"}), 400
        body = "# Netscape HTTP Cookie File\n" + "\n".join(rows) + "\n"
        count = len(rows)

    if count == 0:
        return jsonify({"error": "No cookies found in the provided content"}), 400

    with open(COOKIES_STORE, "w", encoding="utf-8") as f:
        f.write(body)
    return jsonify({"ok": True, "count": count, "source": cookies_source()})


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
