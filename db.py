"""
Lightweight Postgres logging for Cliper downloads.

All operations are non-blocking and fail-safe: DB errors never break
a download. If DATABASE_URL is not set, logging is silently disabled.
"""
import os
import threading
from urllib.parse import urlparse

try:
    import psycopg
    from psycopg_pool import ConnectionPool
    _HAS_PSYCOPG = True
except ImportError:
    _HAS_PSYCOPG = False

DATABASE_URL = os.environ.get("DATABASE_URL", "")
_pool = None
_pool_lock = threading.Lock()

SCHEMA = """
CREATE TABLE IF NOT EXISTS downloads (
    id          SERIAL PRIMARY KEY,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    url         TEXT NOT NULL,
    domain      TEXT,
    title       TEXT,
    format      TEXT,
    quality     TEXT,
    duration    INTEGER,
    country     TEXT,
    success     BOOLEAN NOT NULL,
    error       TEXT,
    ms_elapsed  INTEGER
);
CREATE INDEX IF NOT EXISTS idx_downloads_created ON downloads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_downloads_domain  ON downloads(domain);
CREATE INDEX IF NOT EXISTS idx_downloads_country ON downloads(country);
-- Backfill for existing deployments that pre-date the title column
ALTER TABLE downloads ADD COLUMN IF NOT EXISTS title TEXT;
"""


def _get_pool():
    global _pool
    if _pool is not None:
        return _pool
    if not _HAS_PSYCOPG or not DATABASE_URL:
        return None
    with _pool_lock:
        if _pool is None:
            try:
                _pool = ConnectionPool(
                    DATABASE_URL,
                    min_size=1,
                    max_size=4,
                    timeout=10,
                    kwargs={"autocommit": True},
                )
                with _pool.connection() as conn:
                    conn.execute(SCHEMA)
            except Exception as e:
                print(f"[db] pool init failed: {e}", flush=True)
                _pool = None
    return _pool


def init():
    """Eagerly initialize the pool + schema at startup (best-effort)."""
    _get_pool()


def domain_of(url):
    try:
        return (urlparse(url).hostname or "").lower()
    except Exception:
        return ""


def log_download(
    *,
    url,
    format,
    title=None,
    quality=None,
    duration=None,
    country=None,
    success,
    error=None,
    ms_elapsed=None,
):
    """Insert one row. Silently ignores all errors."""
    pool = _get_pool()
    if pool is None:
        return
    try:
        with pool.connection() as conn:
            conn.execute(
                """
                INSERT INTO downloads
                    (url, domain, title, format, quality, duration, country,
                     success, error, ms_elapsed)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    url,
                    domain_of(url),
                    title,
                    format,
                    quality,
                    duration,
                    country,
                    success,
                    error,
                    ms_elapsed,
                ),
            )
    except Exception as e:
        print(f"[db] log_download failed: {e}", flush=True)
