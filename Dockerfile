FROM python:3.12-slim

RUN apt-get update && \
    apt-get install -y --no-install-recommends ffmpeg && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
# Always grab the latest yt-dlp at build time (YouTube breaks it frequently)
RUN pip install --no-cache-dir --upgrade yt-dlp

COPY . .

EXPOSE 8899
ENV HOST=0.0.0.0
ENV PORT=8899
# Single worker + many threads: Cliper is I/O-bound (yt-dlp subprocess waits),
# and the in-memory `jobs` dict must live in one process so status/file
# endpoints can see the job a download thread created.
CMD ["sh", "-c", "gunicorn -w 1 -k gthread --threads 16 -t 320 -b 0.0.0.0:${PORT:-8899} app:app"]
