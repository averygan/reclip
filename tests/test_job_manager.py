import pytest

from job_manager import DownloadCancelled, JobManager


def test_job_lifecycle_tracks_progress_and_done():
    now = [1000]
    jobs = JobManager(time_func=lambda: now[0])

    job_id = jobs.create("https://example.com/video", "Demo")
    jobs.update_progress(job_id, {
        "progress": 42,
        "downloaded_bytes": 420,
        "total_bytes": 1000,
        "speed": 10,
        "eta": 58,
    })

    job = jobs.snapshot(job_id)
    assert job["status"] == "downloading"
    assert job["progress"] == 42
    assert job["eta"] == 58

    assert jobs.mark_done(job_id, "/tmp/demo.mp4", "demo.mp4") is True
    job = jobs.snapshot(job_id)
    assert job["status"] == "done"
    assert job["progress"] == 100
    assert job["filename"] == "demo.mp4"


def test_cancel_prevents_late_progress_and_done():
    jobs = JobManager()
    job_id = jobs.create("https://example.com/video", "Demo")

    cancelled = jobs.cancel(job_id)

    assert cancelled["status"] == "cancelled"
    assert jobs.mark_done(job_id, "/tmp/demo.mp4", "demo.mp4") is False
    with pytest.raises(DownloadCancelled):
        jobs.update_progress(job_id, {"progress": 50})


def test_prune_terminal_keeps_active_jobs():
    now = [1000]
    jobs = JobManager(ttl_seconds=60, time_func=lambda: now[0])
    done_id = jobs.create("https://example.com/done", "Done")
    active_id = jobs.create("https://example.com/active", "Active")

    assert jobs.mark_done(done_id, "/tmp/done.mp4", "done.mp4") is True
    now[0] = 1061

    removed = jobs.prune_terminal()

    assert [job["id"] for job in removed] == [done_id]
    assert jobs.snapshot(done_id) is None
    assert jobs.snapshot(active_id)["status"] == "downloading"
