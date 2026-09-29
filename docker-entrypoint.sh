#!/bin/sh
# Keep yt-dlp fresh on container start — sites (Instagram, Facebook, etc.) break
# its extractors frequently, and the usual fix is simply updating yt-dlp.
# Installs into the reclip user's ~/.local (first on PATH). Skip with RECLIP_NO_UPDATE=1.
if [ -z "$RECLIP_NO_UPDATE" ]; then
    echo "Updating yt-dlp..."
    pip install --user --no-cache-dir -q -U "yt-dlp[default]" || \
        echo "  (couldn't update yt-dlp — continuing with the installed version)"
fi

exec "$@"
