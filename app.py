import os
import uuid
import glob
import json
import subprocess
import threading
import re
from datetime import datetime
from flask import Flask, request, jsonify, send_file, render_template

app = Flask(__name__)
DOWNLOAD_DIR = os.path.join(os.path.dirname(__file__), "downloads")
os.makedirs(DOWNLOAD_DIR, exist_ok=True)

JOBS_FILE = os.path.join(os.path.dirname(__file__), "jobs.json")

jobs = {}
active_downloads = {}
download_lock = threading.Lock()


def load_jobs():
    """Load persisted jobs from disk."""
    global jobs
    if os.path.exists(JOBS_FILE):
        try:
            with open(JOBS_FILE, "r") as f:
                data = json.load(f)
                # Only load non-active jobs; active ones are stale after restart
                for job_id, job in data.items():
                    if job.get("status") in ("done", "error", "cancelled"):
                        # Verify file still exists for done jobs
                        if job.get("status") == "done" and job.get("file"):
                            if not os.path.exists(job["file"]):
                                continue
                        jobs[job_id] = job
        except Exception:
            jobs = {}


def save_jobs():
    """Persist jobs to disk."""
    try:
        with download_lock:
            # Only persist jobs that have a final status or are downloading
            persist = {}
            for job_id, job in jobs.items():
                persist[job_id] = {
                    "status": job.get("status"),
                    "url": job.get("url"),
                    "title": job.get("title"),
                    "filename": job.get("filename"),
                    "file": job.get("file"),
                    "progress": job.get("progress", 0),
                    "total_size": job.get("total_size"),
                    "error": job.get("error"),
                    "created_at": job.get("created_at"),
                }
            with open(JOBS_FILE, "w") as f:
                json.dump(persist, f)
    except Exception:
        pass


def cleanup_job(job_id):
    """Clean up files and state for a given job."""
    with download_lock:
        if job_id in active_downloads:
            process = active_downloads[job_id]
            try:
                process.terminate()
                process.wait(timeout=5)
            except Exception:
                try:
                    process.kill()
                except Exception:
                    pass
            del active_downloads[job_id]

    if job_id in jobs:
        jobs[job_id]["status"] = "cancelled"
        save_jobs()

    # Remove partial files
    patterns = [
        os.path.join(DOWNLOAD_DIR, f"{job_id}.*.part"),
        os.path.join(DOWNLOAD_DIR, f"{job_id}.*.part-*"),
        os.path.join(DOWNLOAD_DIR, f"{job_id}.*.ytdl"),
    ]
    for pattern in patterns:
        for f in glob.glob(pattern):
            try:
                os.remove(f)
            except OSError:
                pass


def run_download(job_id, url, format_choice, format_id):
    job = jobs[job_id]
    out_template = os.path.join(DOWNLOAD_DIR, f"{job_id}.%(ext)s")

    cmd = ["yt-dlp", "--no-playlist", "-o", out_template, "--newline"]

    if format_choice == "audio":
        cmd += ["-x", "--audio-format", "mp3"]
    elif format_id:
        cmd += ["-f", f"{format_id}+bestaudio/best", "--merge-output-format", "mp4"]
    else:
        cmd += ["-f", "bestvideo+bestaudio/best", "--merge-output-format", "mp4"]

    cmd.append(url)

    try:
        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,
        )

        with download_lock:
            if jobs[job_id].get("status") == "cancelled":
                process.terminate()
                return
            active_downloads[job_id] = process

        for line in process.stdout:
            if jobs[job_id].get("status") == "cancelled":
                process.terminate()
                break

            line = line.strip()
            if not line:
                continue

            # Parse progress from yt-dlp output
            match = re.search(
                r'\[download\]\s+([\d.]+)%\s+of\s+~?([\d.]+[KMGT]?i?B)',
                line,
            )
            if match:
                job["progress"] = float(match.group(1))
                job["total_size"] = match.group(2)

            dest_match = re.search(
                r'\[download\] Destination:\s+(.+)',
                line,
            )
            if dest_match:
                job["destination"] = dest_match.group(1)

        process.wait()

        with download_lock:
            if job_id in active_downloads:
                del active_downloads[job_id]

        if job.get("status") == "cancelled":
            save_jobs()
            return

        if process.returncode != 0:
            job["status"] = "error"
            job["error"] = "Download failed"
            save_jobs()
            return

        files = glob.glob(os.path.join(DOWNLOAD_DIR, f"{job_id}.*"))
        files = [
            f
            for f in files
            if not f.endswith(".part")
            and not f.endswith(".ytdl")
        ]

        if not files:
            job["status"] = "error"
            job["error"] = "Download completed but no file was found"
            save_jobs()
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
        if title:
            # Sanitize: lowercase, keep only alphanumerics, replace rest with _
            safe = ''
            for c in title:
                if c.isalnum():
                    safe += c.lower()
                else:
                    safe += '_'
            # Collapse consecutive underscores
            safe = re.sub(r'_+', '_', safe)
            safe = safe.strip('_')
            job["filename"] = f"{safe}{ext}" if safe else os.path.basename(chosen)
        else:
            job["filename"] = os.path.basename(chosen)
        
        # Rename file to the nice filename
        new_path = os.path.join(DOWNLOAD_DIR, job["filename"])
        if new_path != chosen and not os.path.exists(new_path):
            try:
                os.rename(chosen, new_path)
                job["file"] = new_path
            except OSError:
                pass
        
        save_jobs()

    except Exception as e:
        with download_lock:
            if job_id in active_downloads:
                del active_downloads[job_id]
        job["status"] = "error"
        job["error"] = str(e)
        save_jobs()


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

        info = json.loads(result.stdout)

        best_by_height = {}
        for f in info.get("formats", []):
            height = f.get("height")
            if height and f.get("vcodec", "none") != "none":
                tbr = f.get("tbr") or 0
                if height not in best_by_height or tbr > (
                    best_by_height[height].get("tbr") or 0
                ):
                    best_by_height[height] = f

        formats = []
        for height, f in best_by_height.items():
            formats.append(
                {
                    "id": f["format_id"],
                    "label": f"{height}p",
                    "height": height,
                }
            )
        formats.sort(key=lambda x: x["height"], reverse=True)

        return jsonify(
            {
                "title": info.get("title", ""),
                "thumbnail": info.get("thumbnail", ""),
                "duration": info.get("duration"),
                "uploader": info.get("uploader", ""),
                "formats": formats,
            }
        )
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

    # Cancel any previous downloads
    with download_lock:
        for old_job_id in list(active_downloads.keys()):
            cleanup_job(old_job_id)

    job_id = uuid.uuid4().hex[:10]
    jobs[job_id] = {
        "status": "downloading",
        "url": url,
        "title": title,
        "progress": 0,
        "created_at": datetime.now().isoformat(),
    }
    save_jobs()

    thread = threading.Thread(
        target=run_download, args=(job_id, url, format_choice, format_id)
    )
    thread.daemon = True
    thread.start()

    return jsonify({"job_id": job_id})


@app.route("/api/status/<job_id>")
def check_status(job_id):
    job = jobs.get(job_id)
    if not job:
        return jsonify({"error": "Job not found"}), 404
    return jsonify(
        {
            "status": job["status"],
            "error": job.get("error"),
            "filename": job.get("filename"),
            "progress": job.get("progress", 0),
            "total_size": job.get("total_size"),
        }
    )


@app.route("/api/cancel/<job_id>", methods=["POST"])
def cancel_download(job_id):
    job = jobs.get(job_id)
    if not job:
        return jsonify({"error": "Job not found"}), 404
    if job["status"] == "downloading":
        cleanup_job(job_id)
        return jsonify({"status": "cancelled"})
    return jsonify({"status": job["status"]})


@app.route("/api/jobs")
def list_jobs():
    """List all jobs (active and completed)."""
    result = []
    with download_lock:
        for job_id, job in jobs.items():
            result.append({
                "job_id": job_id,
                "status": job.get("status"),
                "title": job.get("title"),
                "url": job.get("url"),
                "filename": job.get("filename"),
                "progress": job.get("progress", 0),
                "total_size": job.get("total_size"),
                "error": job.get("error"),
                "created_at": job.get("created_at"),
            })
    result.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    return jsonify(result)


@app.route("/api/files")
def list_files():
    """List all completed files in downloads directory."""
    files = []
    try:
        for f in os.listdir(DOWNLOAD_DIR):
            filepath = os.path.join(DOWNLOAD_DIR, f)
            if os.path.isfile(filepath) and not f.endswith(".part") and not f.endswith(".ytdl"):
                stat = os.stat(filepath)
                files.append({
                    "name": f,
                    "size": stat.st_size,
                    "modified": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                })
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    files.sort(key=lambda x: x["modified"], reverse=True)
    return jsonify(files)


@app.route("/api/file/<job_id>")
def download_file(job_id):
    job = jobs.get(job_id)
    if not job or job["status"] != "done":
        return jsonify({"error": "File not ready"}), 404
    return send_file(job["file"], as_attachment=True, download_name=job["filename"])


# Load persisted jobs on startup
load_jobs()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8899))
    host = os.environ.get("HOST", "127.0.0.1")
    app.run(host=host, port=port)
