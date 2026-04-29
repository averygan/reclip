import app as reclip_app
import json
import os
from job_manager import JobManager


class InlineThread:
    def __init__(self, target, args):
        self.target = target
        self.args = args
        self.daemon = False

    def start(self):
        self.target(*self.args)


def make_client(tmp_path, monkeypatch):
    reclip_app.jobs = JobManager()
    monkeypatch.setattr(reclip_app, "DOWNLOAD_DIR", str(tmp_path))
    monkeypatch.setattr(reclip_app, "TEMP_DOWNLOAD_DIR", str(tmp_path / "tmp"))
    monkeypatch.setattr(reclip_app, "CONFIG_PATH", str(tmp_path / "config.json"))
    reclip_app.app.config.update(TESTING=True)
    return reclip_app.app.test_client()


def test_info_rejects_invalid_json(tmp_path, monkeypatch):
    client = make_client(tmp_path, monkeypatch)

    res = client.post("/api/info", data="not-json", content_type="application/json")

    assert res.status_code == 400
    assert res.get_json()["error"] == "No URL provided"


def test_info_returns_best_format_per_height(tmp_path, monkeypatch):
    client = make_client(tmp_path, monkeypatch)

    class FakeYDL:
        def __init__(self, opts):
            self.opts = opts

        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return False

        def extract_info(self, url, download):
            return {
                "title": "Demo",
                "thumbnail": "https://example.com/thumb.jpg",
                "duration": 65,
                "uploader": "Uploader",
                "formats": [
                    {"format_id": "low", "height": 720, "tbr": 1000, "vcodec": "avc1"},
                    {"format_id": "best", "height": 720, "tbr": 2000, "vcodec": "avc1"},
                    {"format_id": "audio", "tbr": 100, "vcodec": "none"},
                    {"format_id": "hd", "height": 1080, "tbr": 3000, "vcodec": "avc1"},
                ],
            }

    monkeypatch.setattr(reclip_app, "YoutubeDL", FakeYDL)

    res = client.post("/api/info", json={"url": "https://example.com/watch?v=1"})

    assert res.status_code == 200
    assert res.get_json()["formats"] == [
        {"id": "hd", "label": "1080p", "height": 1080},
        {"id": "best", "label": "720p", "height": 720},
    ]


def test_download_validation_rejects_bad_input(tmp_path, monkeypatch):
    client = make_client(tmp_path, monkeypatch)

    bad_url = client.post("/api/download", json={"url": "file:///tmp/demo.mp4"})
    bad_format = client.post(
        "/api/download",
        json={"url": "https://example.com/video", "format": "gif"},
    )

    assert bad_url.status_code == 400
    assert bad_url.get_json()["error"] == "Only http(s) URLs are supported"
    assert bad_format.status_code == 400
    assert bad_format.get_json()["error"] == "Format must be video or audio"


def test_download_status_and_file_flow(tmp_path, monkeypatch):
    client = make_client(tmp_path, monkeypatch)

    def fake_run_download(job_id, url, format_choice, format_id):
        file_path = tmp_path / f"{job_id}.mp4"
        file_path.write_bytes(b"video")
        reclip_app.jobs.mark_done(job_id, str(file_path), "Demo.mp4")

    monkeypatch.setattr(reclip_app.threading, "Thread", InlineThread)
    monkeypatch.setattr(reclip_app, "run_download", fake_run_download)

    start = client.post(
        "/api/download",
        json={"url": "https://example.com/video", "format": "video", "title": "Demo"},
    )
    job_id = start.get_json()["job_id"]
    status = client.get(f"/api/status/{job_id}")
    file_res = client.get(f"/api/file/{job_id}")

    assert start.status_code == 200
    assert status.get_json()["status"] == "done"
    assert status.get_json()["progress"] == 100
    assert file_res.status_code == 200
    assert file_res.data == b"video"


def test_select_folder_persists_config(tmp_path, monkeypatch):
    client = make_client(tmp_path, monkeypatch)
    chosen = tmp_path / "chosen"

    class Result:
        returncode = 0
        stdout = f"{chosen}\n"

    monkeypatch.setattr(reclip_app.subprocess, "run", lambda *args, **kwargs: Result())

    res = client.post("/api/select-folder")
    config = client.get("/api/config")

    assert res.status_code == 200
    assert res.get_json()["download_dir"] == str(chosen)
    assert config.get_json()["download_dir"] == str(chosen)
    with open(tmp_path / "config.json", encoding="utf-8") as f:
        assert json.load(f) == {"download_dir": str(chosen)}


def test_select_folder_cancel_keeps_current_dir(tmp_path, monkeypatch):
    client = make_client(tmp_path, monkeypatch)

    class Result:
        returncode = 1
        stdout = ""

    monkeypatch.setattr(reclip_app.subprocess, "run", lambda *args, **kwargs: Result())

    res = client.post("/api/select-folder")

    assert res.status_code == 200
    assert res.get_json() == {"cancelled": True, "download_dir": str(tmp_path)}


def test_run_download_moves_file_to_configured_dir_and_keeps_it_after_prune(tmp_path, monkeypatch):
    now = [1000]
    reclip_app.jobs = JobManager(ttl_seconds=1, time_func=lambda: now[0])
    monkeypatch.setattr(reclip_app, "DOWNLOAD_DIR", str(tmp_path / "dest"))
    monkeypatch.setattr(reclip_app, "TEMP_DOWNLOAD_DIR", str(tmp_path / "tmp"))

    class FakeYDL:
        def __init__(self, opts):
            self.opts = opts

        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return False

        def download(self, urls):
            file_path = self.opts["outtmpl"].replace("%(ext)s", "mp4")
            os.makedirs(os.path.dirname(file_path), exist_ok=True)
            with open(file_path, "wb") as f:
                f.write(b"video")

    monkeypatch.setattr(reclip_app, "YoutubeDL", FakeYDL)

    job_id = reclip_app.jobs.create("https://example.com/video", "Demo: Video?")
    reclip_app.run_download(job_id, "https://example.com/video", "video", None)
    job = reclip_app.jobs.snapshot(job_id)
    now[0] = 1002
    reclip_app._clean_old_jobs()

    assert job["status"] == "done"
    assert job["filename"] == "Demo Video.mp4"
    assert os.path.isfile(job["file"])
    assert str(tmp_path / "dest") in job["file"]
    assert not list((tmp_path / "tmp").glob(f"{job_id}.*"))
    assert os.path.isfile(job["file"])


def test_run_download_uses_unique_filename_for_duplicates(tmp_path, monkeypatch):
    reclip_app.jobs = JobManager()
    monkeypatch.setattr(reclip_app, "DOWNLOAD_DIR", str(tmp_path / "dest"))
    monkeypatch.setattr(reclip_app, "TEMP_DOWNLOAD_DIR", str(tmp_path / "tmp"))
    os.makedirs(tmp_path / "dest", exist_ok=True)
    (tmp_path / "dest" / "Demo.mp4").write_bytes(b"existing")

    class FakeYDL:
        def __init__(self, opts):
            self.opts = opts

        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return False

        def download(self, urls):
            file_path = self.opts["outtmpl"].replace("%(ext)s", "mp4")
            os.makedirs(os.path.dirname(file_path), exist_ok=True)
            with open(file_path, "wb") as f:
                f.write(b"new")

    monkeypatch.setattr(reclip_app, "YoutubeDL", FakeYDL)

    job_id = reclip_app.jobs.create("https://example.com/video", "Demo")
    reclip_app.run_download(job_id, "https://example.com/video", "video", None)
    job = reclip_app.jobs.snapshot(job_id)

    assert job["filename"] == "Demo (2).mp4"
    assert (tmp_path / "dest" / "Demo.mp4").read_bytes() == b"existing"
    assert (tmp_path / "dest" / "Demo (2).mp4").read_bytes() == b"new"


def test_cancel_marks_active_job_cancelled(tmp_path, monkeypatch):
    client = make_client(tmp_path, monkeypatch)
    job_id = reclip_app.jobs.create("https://example.com/video", "Demo")

    res = client.post(f"/api/cancel/{job_id}")

    assert res.status_code == 200
    assert res.get_json()["status"] == "cancelled"
