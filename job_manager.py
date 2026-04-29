import threading
import time
import uuid


class DownloadCancelled(Exception):
    pass


TERMINAL_STATUSES = {"done", "error", "cancelled"}


class JobManager:
    def __init__(self, ttl_seconds=3600, time_func=None):
        self._jobs = {}
        self._lock = threading.Lock()
        self._ttl_seconds = ttl_seconds
        self._time = time_func or time.time

    def create(self, url, title):
        job_id = uuid.uuid4().hex[:10]
        now = self._time()
        job = {
            "id": job_id,
            "status": "downloading",
            "url": url,
            "title": title,
            "created_at": now,
            "updated_at": now,
            "progress": 0,
            "downloaded_bytes": 0,
            "total_bytes": None,
            "speed": None,
            "eta": None,
            "cancelled": False,
        }
        with self._lock:
            self._jobs[job_id] = job
        return job_id

    def _touch(self, job):
        job["updated_at"] = self._time()

    def get(self, job_id):
        with self._lock:
            return self._jobs.get(job_id)

    def snapshot(self, job_id):
        with self._lock:
            job = self._jobs.get(job_id)
            return dict(job) if job else None

    def update_progress(self, job_id, progress):
        with self._lock:
            job = self._jobs.get(job_id)
            if not job or job["cancelled"] or job["status"] != "downloading":
                raise DownloadCancelled()
            job.update(progress)
            self._touch(job)

    def mark_done(self, job_id, file_path, filename):
        with self._lock:
            job = self._jobs.get(job_id)
            if not job:
                return False
            if job["cancelled"] or job["status"] != "downloading":
                job["status"] = "cancelled"
                self._touch(job)
                return False
            job.update({
                "status": "done",
                "progress": 100,
                "file": file_path,
                "filename": filename,
            })
            self._touch(job)
            return True

    def mark_error(self, job_id, error):
        with self._lock:
            job = self._jobs.get(job_id)
            if not job:
                return
            if job["cancelled"]:
                job["status"] = "cancelled"
                self._touch(job)
                return
            job["status"] = "error"
            job["error"] = error
            self._touch(job)

    def cancel(self, job_id):
        with self._lock:
            job = self._jobs.get(job_id)
            if not job:
                return None
            if job["status"] == "downloading":
                job["cancelled"] = True
                job["status"] = "cancelled"
                self._touch(job)
            return dict(job)

    def is_cancelled(self, job_id):
        with self._lock:
            job = self._jobs.get(job_id)
            return not job or job["cancelled"]

    def prune_terminal(self, ttl_seconds=None):
        ttl = self._ttl_seconds if ttl_seconds is None else ttl_seconds
        cutoff = self._time() - ttl
        removed = []
        with self._lock:
            for job_id, job in list(self._jobs.items()):
                if job["status"] in TERMINAL_STATUSES and job["updated_at"] < cutoff:
                    removed.append(dict(job))
                    del self._jobs[job_id]
        return removed
