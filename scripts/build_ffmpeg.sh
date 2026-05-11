#!/bin/bash
# build_ffmpeg.sh — Cross-compile static ffmpeg + ffprobe for Android
# Runs during GitHub Actions CI. Outputs binaries to app/src/main/jniLibs/<ABI>/
#
# Produces statically-linked executables (not shared libs) so they can
# be bundled as raw assets and executed directly on the device.

set -euo pipefail

FFMPEG_VERSION="7.1"
FFMPEG_URL="https://ffmpeg.org/releases/ffmpeg-${FFMPEG_VERSION}.tar.xz"

# Android NDK must be set
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

# Download ffmpeg source
if [ ! -d "ffmpeg-${FFMPEG_VERSION}" ]; then
  echo "==> Downloading FFmpeg ${FFMPEG_VERSION}..."
  curl -sL "$FFMPEG_URL" | tar xJ
fi

build_ffmpeg_for_arch() {
  local ARCH=$1
  local ABI=$2
  local TOOLCHAIN_PREFIX=$3
  local CC_PREFIX=$4
  local CPU_FLAGS=$5

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

  local BUILD_DIR="${WORKDIR}/build-${ABI}"
  local PREFIX="${WORKDIR}/install-${ABI}"

  rm -rf "$BUILD_DIR" "$PREFIX"
  mkdir -p "$BUILD_DIR" "$PREFIX"

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
    --disable-programs \
    --enable-ffmpeg \
    --enable-ffprobe \
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
    --extra-cflags="-O2 -fPIC" \
    --extra-ldflags="-Wl,-z,max-page-size=16384" \
    --pkg-config=false

  make -j$(nproc)
  make install

  # Copy the static binaries
  local OUT="${OUTPUT_DIR}/${ABI}"
  mkdir -p "$OUT"

  # ffmpeg and ffprobe are built as executables, copy them
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
  "aarch64-linux-android-" \
  "aarch64-linux-android" \
  "armv8-a"

# Build for x86_64 (emulators)
build_ffmpeg_for_arch \
  "x86_64" \
  "x86_64" \
  "x86_64-linux-android-" \
  "x86_64-linux-android" \
  "x86-64"

echo ""
echo "============================================"
echo "  FFmpeg build complete!"
echo "============================================"
echo ""
echo "Binaries:"
find "$OUTPUT_DIR" -name "lib*.so" -exec ls -lh {} \;
