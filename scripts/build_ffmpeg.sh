#!/bin/bash
# build_ffmpeg.sh — Cross-compile static ffmpeg + ffprobe for Android
# Runs during GitHub Actions CI. Outputs binaries to app/src/main/jniLibs/<ABI>/
#
# Now includes libmp3lame for MP3 audio extraction support.

set -euo pipefail

FFMPEG_VERSION="7.1"
FFMPEG_URL="https://ffmpeg.org/releases/ffmpeg-${FFMPEG_VERSION}.tar.xz"

LAME_VERSION="3.100"
LAME_URL="https://downloads.sourceforge.net/project/lame/lame/${LAME_VERSION}/lame-${LAME_VERSION}.tar.gz"

if [ -z "${ANDROID_NDK_HOME:-}" ] && [ -z "${ANDROID_NDK:-}" ]; then
  echo "ERROR: ANDROID_NDK_HOME or ANDROID_NDK must be set"
  exit 1
fi
NDK="${ANDROID_NDK_HOME:-$ANDROID_NDK}"

API_LEVEL=24
WORKDIR="$(pwd)/ffmpeg-build"
OUTPUT_DIR="$(pwd)/app/src/main/jniLibs"

mkdir -p "$WORKDIR"
cd "$WORKDIR"

# Download FFmpeg source
if [ ! -d "ffmpeg-${FFMPEG_VERSION}" ]; then
  echo "==> Downloading FFmpeg ${FFMPEG_VERSION}..."
  curl -sL "$FFMPEG_URL" | tar xJ
fi

# Download LAME source (MP3 encoder)
if [ ! -d "lame-${LAME_VERSION}" ]; then
  echo "==> Downloading LAME ${LAME_VERSION}..."
  curl -sL "$LAME_URL" | tar xz
fi

build_lame_for_arch() {
  local ABI=$1
  local HOST_TRIPLE=$2
  local CC_PREFIX=$3

  local TOOLCHAIN="${NDK}/toolchains/llvm/prebuilt/linux-x86_64"
  local PREFIX="${WORKDIR}/lame-install-${ABI}"

  echo ""
  echo "==> Building LAME for ${ABI}"
  echo ""

  rm -rf "$PREFIX"

  cd "${WORKDIR}/lame-${LAME_VERSION}"
  make distclean 2>/dev/null || true

  export CC="${TOOLCHAIN}/bin/${CC_PREFIX}${API_LEVEL}-clang"
  export AR="${TOOLCHAIN}/bin/llvm-ar"
  export RANLIB="${TOOLCHAIN}/bin/llvm-ranlib"
  export STRIP="${TOOLCHAIN}/bin/llvm-strip"
  export CFLAGS="-O2 -fPIC"

  ./configure \
    --prefix="$PREFIX" \
    --host="$HOST_TRIPLE" \
    --disable-shared \
    --enable-static \
    --disable-frontend \
    --disable-decoder

  make -j$(nproc)
  make install

  unset CC AR RANLIB STRIP CFLAGS

  cd "$WORKDIR"
}

build_ffmpeg_for_arch() {
  local ARCH=$1
  local ABI=$2
  local CC_PREFIX=$3
  local CPU_FLAGS=$4
  local HOST_TRIPLE=$5

  # Build LAME first
  build_lame_for_arch "$ABI" "$HOST_TRIPLE" "$CC_PREFIX"

  echo ""
  echo "============================================"
  echo "  Building FFmpeg for ${ABI}"
  echo "============================================"
  echo ""

  local TOOLCHAIN="${NDK}/toolchains/llvm/prebuilt/linux-x86_64"
  local SYSROOT="${TOOLCHAIN}/sysroot"
  local CC="${TOOLCHAIN}/bin/${CC_PREFIX}${API_LEVEL}-clang"
  local CXX="${TOOLCHAIN}/bin/${CC_PREFIX}${API_LEVEL}-clang++"
  local AR="${TOOLCHAIN}/bin/llvm-ar"
  local STRIP="${TOOLCHAIN}/bin/llvm-strip"
  local RANLIB="${TOOLCHAIN}/bin/llvm-ranlib"
  local NM="${TOOLCHAIN}/bin/llvm-nm"

  local LAME_PREFIX="${WORKDIR}/lame-install-${ABI}"
  local PREFIX="${WORKDIR}/install-${ABI}"

  rm -rf "$PREFIX"
  mkdir -p "$PREFIX"

  cd "${WORKDIR}/ffmpeg-${FFMPEG_VERSION}"
  make clean 2>/dev/null || true

  ./configure \
    --prefix="$PREFIX" \
    --target-os=android \
    --arch="$ARCH" \
    --cpu="$CPU_FLAGS" \
    --cc="$CC" \
    --cxx="$CXX" \
    --ar="$AR" \
    --strip="$STRIP" \
    --ranlib="$RANLIB" \
    --nm="$NM" \
    --sysroot="$SYSROOT" \
    --cross-prefix="${TOOLCHAIN}/bin/llvm-" \
    --enable-cross-compile \
    --enable-pic \
    --enable-small \
    --enable-static \
    --disable-shared \
    --disable-doc \
    --disable-htmlpages \
    --disable-manpages \
    --disable-podpages \
    --disable-txtpages \
    --disable-debug \
    --disable-ffplay \
    --disable-network \
    --disable-avdevice \
    --disable-postproc \
    --disable-symver \
    --enable-ffmpeg \
    --enable-ffprobe \
    --enable-libmp3lame \
    --enable-protocol=file \
    --enable-protocol=pipe \
    --enable-protocol=concat \
    --enable-demuxer=mov,matroska,webm,mp3,ogg,flac,wav,aac,avi,mpegts,mpegps,flv,hls \
    --enable-muxer=mp4,mp3,matroska,webm,ogg,flac,wav,ipod,adts,mov \
    --enable-encoder=aac,libmp3lame,pcm_s16le,png \
    --enable-decoder=aac,mp3,vorbis,opus,flac,h264,hevc,vp8,vp9,av1,pcm_s16le,png \
    --enable-parser=aac,h264,hevc,vp8,vp9,av1,mpegaudio,opus,vorbis,flac \
    --enable-filter=aresample,anull,atrim,volume,amerge,aformat \
    --enable-bsf=aac_adtstoasc,h264_mp4toannexb,hevc_mp4toannexb,extract_extradata \
    --enable-swresample \
    --enable-swscale \
    --enable-avformat \
    --enable-avcodec \
    --enable-avfilter \
    --enable-avutil \
    --enable-jni \
    --enable-mediacodec \
    --extra-cflags="-O2 -fPIC -I${LAME_PREFIX}/include" \
    --extra-ldflags="-Wl,-z,max-page-size=16384 -L${LAME_PREFIX}/lib" \
    --extra-libs="-lmp3lame" \
    --pkg-config=false

  make -j$(nproc)
  make install

  local OUT="${OUTPUT_DIR}/${ABI}"
  mkdir -p "$OUT"

  if [ -f "${PREFIX}/bin/ffmpeg" ]; then
    cp "${PREFIX}/bin/ffmpeg" "$OUT/libffmpeg.so"
    "$STRIP" "$OUT/libffmpeg.so"
    echo "  ✓ ffmpeg binary: $(du -h "$OUT/libffmpeg.so" | cut -f1)"
  fi

  if [ -f "${PREFIX}/bin/ffprobe" ]; then
    cp "${PREFIX}/bin/ffprobe" "$OUT/libffprobe.so"
    "$STRIP" "$OUT/libffprobe.so"
    echo "  ✓ ffprobe binary: $(du -h "$OUT/libffprobe.so" | cut -f1)"
  fi

  cd "$WORKDIR"
}

# Build for arm64-v8a (most Android phones)
build_ffmpeg_for_arch \
  "aarch64" \
  "arm64-v8a" \
  "aarch64-linux-android" \
  "armv8-a" \
  "aarch64-linux"

# Build for x86_64 (emulators)
build_ffmpeg_for_arch \
  "x86_64" \
  "x86_64" \
  "x86_64-linux-android" \
  "x86-64" \
  "x86_64-linux"

echo ""
echo "============================================"
echo "  FFmpeg build complete!"
echo "============================================"
echo ""
echo "Binaries (with libmp3lame for MP3 support):"
find "$OUTPUT_DIR" -name "lib*.so" -exec ls -lh {} \;
