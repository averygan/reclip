# Task Plan: MP4 faststart + 可选 H.265 转码

## Goal
保存 MP4 时一次性完成 moov 前置（faststart）与可选 H.265 转码；默认不重编码，HEVC 由设置项开启。

## Phases
- [x] 1. 后端后处理：`moovBeforeMdat` 原子检查 + `postprocessArgs` + `runPostprocess`（copy 重封装 / HEVC 转码）
- [x] 2. 接线：settings.codec、j.codec、/api/settings GET/POST、handleDownload 校验
- [x] 3. 进度：转码阶段占进度条后 15% 并复用 pumpStderr
- [x] 4. 前端：设置区新增编码选择 + i18n（zh/en）
- [x] 5. Verify — go vet / go test（含真实 ffmpeg 端到端用例）全绿

## Open questions
- 默认编码 → 默认 copy（H.264），HEVC 作为可选项（浏览器/老设备兼容性更稳）
- HEVC 编码器 → libx265 CRF 26 preset medium（效率优于硬件编码器，符合省码率目标）

## Resume point
从 phase 1 开始。
