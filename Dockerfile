FROM python:3.12-slim

RUN apt-get update && \
    apt-get install -y --no-install-recommends ffmpeg && \
    rm -rf /var/lib/apt/lists/*

# Run as non-root user
RUN useradd --create-home --shell /bin/bash reclip
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
RUN mkdir -p downloads && chown -R reclip:reclip /app

USER reclip

EXPOSE 8899
ENV HOST=0.0.0.0
CMD ["python", "app.py"]
