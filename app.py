import os
import glob
import json
import shutil
import subprocess
import sys
import threading
from urllib.parse import urlparse
from flask import Flask, request, jsonify, send_file, render_template
from yt_dlp import YoutubeDL
from job_manager import DownloadCancelled, JobManager

APP_DIR = os.path.dirname(os.path.abspath(__file__))


def _runtime_roots():
    roots = []
    meipass = getattr(sys, "_MEIPASS", None)
    if meipass:
        roots.append(meipass)

    if getattr(sys, "frozen", False):
        contents_dir = os.path.dirname(os.path.dirname(sys.executable))
        roots.extend([
            os.path.join(contents_dir, "Resources"),
            os.path.join(contents_dir, "Frameworks"),
            contents_dir,
        ])

    roots.append(APP_DIR)
    return roots


def _find_runtime_dir(name):
    for root in _runtime_roots():
        candidate = os.path.join(root, name)
        if os.path.isdir(candidate):
            return candidate
    return os.path.join(APP_DIR, name)


def _find_bundled_bin_dir():
    for root in _runtime_roots():
        candidate = os.path.join(root, "bin")
        if os.path.isfile(os.path.join(candidate, "ffmpeg")):
            return candidate
    return os.path.join(APP_DIR, "bin")


BUNDLED_BIN_DIR = _find_bundled_bin_dir()

if os.path.isdir(BUNDLED_BIN_DIR):
    os.environ["PATH"] = BUNDLED_BIN_DIR + os.pathsep + os.environ.get("PATH", "")

try:
    import certifi

    os.environ.setdefault("SSL_CERT_FILE", certifi.where())
    os.environ.setdefault("REQUESTS_CA_BUNDLE", certifi.where())
except Exception:
    pass

app = Flask(
    __name__,
    template_folder=_find_runtime_dir("templates"),
    static_folder=_find_runtime_dir("static"),
)
DOWNLOAD_DIR = os.environ.get(
    "RECLIP_DOWNLOAD_DIR",
    os.path.join(os.path.expanduser("~"), "Downloads", "ReClip")
    if getattr(sys, "frozen", False)
    else os.path.join(APP_DIR, "downloads"),
)
CONFIG_PATH = os.path.join(os.path.expanduser("~"), ".reclip", "config.json")
TEMP_DOWNLOAD_DIR = os.path.join(APP_DIR, "downloads")


def _load_download_dir():
    if os.environ.get("RECLIP_DOWNLOAD_DIR"):
        return os.environ["RECLIP_DOWNLOAD_DIR"]
    try:
        with open(CONFIG_PATH, "r", encoding="utf-8") as f:
            configured = json.load(f).get("download_dir")
        if isinstance(configured, str) and configured.strip():
            return os.path.expanduser(configured)
    except (OSError, ValueError, TypeError):
        pass
    return DOWNLOAD_DIR


def _set_download_dir(path):
    global DOWNLOAD_DIR
    if not isinstance(path, str) or not path.strip():
        raise ValueError("Download folder cannot be empty")
    path = os.path.abspath(os.path.expanduser(path))
    os.makedirs(path, exist_ok=True)
    os.makedirs(os.path.dirname(CONFIG_PATH), exist_ok=True)
    with open(CONFIG_PATH, "w", encoding="utf-8") as f:
        json.dump({"download_dir": path}, f)
    DOWNLOAD_DIR = path
    return DOWNLOAD_DIR


DOWNLOAD_DIR = _load_download_dir()
os.makedirs(DOWNLOAD_DIR, exist_ok=True)
os.makedirs(TEMP_DOWNLOAD_DIR, exist_ok=True)

jobs = JobManager()


def _request_data():
    return request.get_json(silent=True) or {}


def _string_field(data, key, default=""):
    value = data.get(key, default)
    return value.strip() if isinstance(value, str) else default


def _clean_old_jobs():
    jobs.prune_terminal()


def _valid_url(url):
    parsed = urlparse(url)
    return parsed.scheme in {"http", "https"} and bool(parsed.netloc)


def _ffmpeg_location():
    bundled_ffmpeg = os.path.join(BUNDLED_BIN_DIR, "ffmpeg")
    if os.path.isfile(bundled_ffmpeg):
        return BUNDLED_BIN_DIR

    ffmpeg = shutil.which("ffmpeg")
    return os.path.dirname(ffmpeg) if ffmpeg else None


def _yt_dlp_options(**extra):
    opts = {
        "noplaylist": True,
        "quiet": True,
        "no_warnings": True,
        "noprogress": True,
    }
    ffmpeg_dir = _ffmpeg_location()
    if ffmpeg_dir:
        opts["ffmpeg_location"] = ffmpeg_dir
    opts.update(extra)
    return opts


def _format_filename(title, chosen):
    ext = os.path.splitext(chosen)[1]
    title = title.strip()
    if not title:
        return os.path.basename(chosen)

    safe_title = "".join(c for c in title if c not in r'\/:*?"<>|').strip()[:120].strip()
    return f"{safe_title}{ext}" if safe_title else os.path.basename(chosen)


def _unique_destination(filename):
    target = os.path.join(DOWNLOAD_DIR, filename)
    if not os.path.exists(target):
        return target, filename

    stem, ext = os.path.splitext(filename)
    counter = 2
    while True:
        candidate_name = f"{stem} ({counter}){ext}"
        candidate = os.path.join(DOWNLOAD_DIR, candidate_name)
        if not os.path.exists(candidate):
            return candidate, candidate_name
        counter += 1


def _cleanup_job_files(job_id, keep=None):
    for file_path in glob.glob(os.path.join(TEMP_DOWNLOAD_DIR, f"{job_id}.*")):
        if file_path == keep:
            continue
        try:
            os.remove(file_path)
        except OSError:
            pass


def _progress_hook(job_id):
    def hook(data):
        if jobs.is_cancelled(job_id):
            raise DownloadCancelled()

        if data.get("status") != "downloading":
            return

        total = data.get("total_bytes") or data.get("total_bytes_estimate")
        downloaded = data.get("downloaded_bytes") or 0
        percent = int(downloaded * 100 / total) if total else 0
        jobs.update_progress(job_id, {
            "progress": min(percent, 99),
            "downloaded_bytes": downloaded,
            "total_bytes": total,
            "speed": data.get("speed"),
            "eta": data.get("eta"),
        })

    return hook


def run_download(job_id, url, format_choice, format_id):
    os.makedirs(DOWNLOAD_DIR, exist_ok=True)
    os.makedirs(TEMP_DOWNLOAD_DIR, exist_ok=True)
    out_template = os.path.join(TEMP_DOWNLOAD_DIR, f"{job_id}.%(ext)s")

    if format_choice == "audio":
        ydl_opts = _yt_dlp_options(
            outtmpl=out_template,
            format="bestaudio/best",
            progress_hooks=[_progress_hook(job_id)],
            postprocessors=[{
                "key": "FFmpegExtractAudio",
                "preferredcodec": "mp3",
            }],
        )
    elif format_id:
        ydl_opts = _yt_dlp_options(
            outtmpl=out_template,
            format=f"{format_id}+bestaudio/best",
            merge_output_format="mp4",
            progress_hooks=[_progress_hook(job_id)],
        )
    else:
        ydl_opts = _yt_dlp_options(
            outtmpl=out_template,
            format="bestvideo+bestaudio/best",
            merge_output_format="mp4",
            progress_hooks=[_progress_hook(job_id)],
        )

    try:
        with YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])

        if jobs.is_cancelled(job_id):
            _cleanup_job_files(job_id)
            return

        files = glob.glob(os.path.join(TEMP_DOWNLOAD_DIR, f"{job_id}.*"))
        if not files:
            jobs.mark_error(job_id, "Download completed but no file was found")
            return

        if format_choice == "audio":
            target = [f for f in files if f.endswith(".mp3")]
            chosen = target[0] if target else files[0]
        else:
            target = [f for f in files if f.endswith(".mp4")]
            chosen = target[0] if target else files[0]

        job = jobs.snapshot(job_id) or {}
        final_name = _format_filename(job.get("title", ""), chosen)
        final_path, final_name = _unique_destination(final_name)
        shutil.move(chosen, final_path)
        _cleanup_job_files(job_id)

        if not jobs.mark_done(job_id, final_path, final_name):
            try:
                os.remove(final_path)
            except OSError:
                pass
    except DownloadCancelled:
        _cleanup_job_files(job_id)
    except Exception as e:
        jobs.mark_error(job_id, str(e))


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/config")
def get_config():
    return jsonify({"download_dir": DOWNLOAD_DIR})


@app.route("/api/select-folder", methods=["POST"])
def select_folder():
    script = (
        'POSIX path of (choose folder with prompt '
        '"Choose where ReClip should save downloads")'
    )
    try:
        result = subprocess.run(
            ["osascript", "-e", script],
            check=False,
            capture_output=True,
            text=True,
        )
        if result.returncode != 0:
            return jsonify({"cancelled": True, "download_dir": DOWNLOAD_DIR})
        chosen = result.stdout.strip()
        if not chosen:
            return jsonify({"cancelled": True, "download_dir": DOWNLOAD_DIR})
        return jsonify({"download_dir": _set_download_dir(chosen)})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/open-folder", methods=["POST"])
def open_folder():
    os.makedirs(DOWNLOAD_DIR, exist_ok=True)
    try:
        subprocess.Popen(["open", DOWNLOAD_DIR])
        return jsonify({"ok": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/reveal/<job_id>", methods=["POST"])
def reveal_file(job_id):
    job = jobs.snapshot(job_id)
    file_path = job.get("file") if job else None
    if not file_path or not os.path.isfile(file_path):
        return jsonify({"error": "File not found"}), 404
    try:
        subprocess.Popen(["open", "-R", file_path])
        return jsonify({"ok": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/info", methods=["POST"])
def get_info():
    _clean_old_jobs()
    data = _request_data()
    url = _string_field(data, "url")
    if not url:
        return jsonify({"error": "No URL provided"}), 400
    if not _valid_url(url):
        return jsonify({"error": "Only http(s) URLs are supported"}), 400

    try:
        with YoutubeDL(_yt_dlp_options(skip_download=True)) as ydl:
            info = ydl.extract_info(url, download=False)

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
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route("/api/download", methods=["POST"])
def start_download():
    _clean_old_jobs()
    data = _request_data()
    url = _string_field(data, "url")
    format_choice = _string_field(data, "format", "video")
    format_id = data.get("format_id")
    title = data.get("title", "")

    if not url:
        return jsonify({"error": "No URL provided"}), 400
    if not _valid_url(url):
        return jsonify({"error": "Only http(s) URLs are supported"}), 400
    if format_choice not in {"video", "audio"}:
        return jsonify({"error": "Format must be video or audio"}), 400
    if format_id is not None and not isinstance(format_id, str):
        return jsonify({"error": "format_id must be a string"}), 400
    if not isinstance(title, str):
        title = ""

    job_id = jobs.create(url, title)

    thread = threading.Thread(target=run_download, args=(job_id, url, format_choice, format_id))
    thread.daemon = True
    thread.start()

    return jsonify({"job_id": job_id})


@app.route("/api/status/<job_id>")
def check_status(job_id):
    _clean_old_jobs()
    job = jobs.snapshot(job_id)
    if not job:
        return jsonify({"error": "Job not found"}), 404
    return jsonify({
        "status": job["status"],
        "progress": job.get("progress", 0),
        "speed": job.get("speed"),
        "eta": job.get("eta"),
        "error": job.get("error"),
        "filename": job.get("filename"),
    })


@app.route("/api/cancel/<job_id>", methods=["POST"])
def cancel_download(job_id):
    job = jobs.cancel(job_id)
    if not job:
        return jsonify({"error": "Job not found"}), 404
    return jsonify({"status": job["status"]})


@app.route("/api/file/<job_id>")
def download_file(job_id):
    job = jobs.snapshot(job_id)
    if not job or job["status"] != "done":
        return jsonify({"error": "File not ready"}), 404
    return send_file(job["file"], as_attachment=True, download_name=job["filename"])


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8899))
    host = os.environ.get("HOST", "127.0.0.1")
    app.run(host=host, port=port)
