# Findings

## 2026-10-27 — 现状
- 下载走 yt-dlp `--merge-output-format mp4`（main.go:1217/1225），合并后没有任何后处理 → moov 在尾部。
- `/api/file/{id}` 用 `http.ServeFile`（main.go:1538），支持 Range，所以 faststart 只影响「首个 Range 请求能否拿到索引」，不影响能否播放。
- 下载响应头是 `Content-Disposition: attachment`（main.go:1536），浏览器不会内联播放 → H.265 兼容性只取决于最终播放器，不取决于浏览器。
- 本机 ffmpeg 9.0.2 同时具备 libx265 与 hevc_videotoolbox（`ffmpeg -encoders`）。
- 已有的 `ffmpegTimeR` + `lineProgress` 可直接复用给转码阶段的进度。

## 2026-10-27 — 决策
- 后处理放在 yt-dlp 之后、重命名之前，一次 ffmpeg 调用同时完成 faststart（+ HEVC）。
- copy 路径先做原子检查，已是 faststart 则跳过，避免无谓读写 GB 级文件。
- HEVC 路径音频统一 `-c:a aac -b:a 160k`，避免 opus-in-mp4 兼容坑；copy 路径保持 `-c copy`。
- `-tag:v hvc1` 必备，Apple 生态只认 hvc1（hev1 会黑屏/不识别）。
