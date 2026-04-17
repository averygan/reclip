FROM python:3.12-slim

RUN apt-get update && \
    apt-get install -y --no-install-recommends ffmpeg curl unzip && \
    rm -rf /var/lib/apt/lists/*

# Install Deno (yt-dlp needs it for YouTube JS challenges)
RUN curl -fsSL https://deno.land/install.sh | sh && \
    mv /root/.deno/bin/deno /usr/local/bin/deno

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install latest yt-dlp from GitHub (PyPI is often outdated)
RUN pip install --no-cache-dir --upgrade https://github.com/yt-dlp/yt-dlp/archive/master.tar.gz

COPY . .

EXPOSE 8899
ENV HOST=0.0.0.0
CMD ["python", "app.py"]
