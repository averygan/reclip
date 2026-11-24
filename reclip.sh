#!/bin/bash
set -e
cd "$(dirname "$0")"

# Check prerequisites
missing=""

if ! command -v python3 &> /dev/null; then
    missing="$missing python3"
fi

if ! command -v ffmpeg &> /dev/null; then
    missing="$missing ffmpeg"
fi

if ! command -v deno &> /dev/null; then
    missing="$missing deno"
fi

if [ -n "$missing" ]; then
    echo "Missing required tools:$missing"
    echo ""
    if command -v brew &> /dev/null; then
        echo "Install with:  brew install$missing"
    elif command -v apt &> /dev/null; then
        echo "Install with:  sudo apt install$missing"
    else
        echo "Please install:$missing"
    fi
    exit 1
fi

# Set up venv and install Python deps
if [ ! -d "venv" ]; then
    PYTHON="${PYTHON:-python3}"
    if ! "$PYTHON" -c 'import sys; sys.exit(sys.version_info < (3, 10))' 2>/dev/null; then
        echo "Python 3.10+ is required. Set PYTHON to a newer interpreter (e.g. PYTHON=/opt/homebrew/bin/python3 ./reclip.sh)."
        exit 1
    fi
    echo "Setting up virtual environment..."
    "$PYTHON" -m venv venv
    source venv/bin/activate
    python -m pip install -q -r requirements.txt
else
    source venv/bin/activate
fi

# Keep yt-dlp fresh — sites (Instagram, Facebook, etc.) break its extractors
# frequently, and the usual fix is simply updating yt-dlp. Skip with RECLIP_NO_UPDATE=1.
if [ -z "$RECLIP_NO_UPDATE" ]; then
    echo "Updating yt-dlp..."
    python -m pip install -q -U 'yt-dlp[default]' || echo "  (couldn't update yt-dlp — continuing with the installed version)"
fi

PORT="${PORT:-8899}"
export PORT

echo ""
echo "  ReClip is running at http://localhost:$PORT"
echo ""
python3 app.py
