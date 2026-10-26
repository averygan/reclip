# ReClip

一款支持自架设、开源的视频与音频下载器，配有简洁的网页界面。粘贴来自 YouTube、TikTok、Instagram、Twitter/X 等 1000+ 平台的链接即可下载为 MP4 或 MP3。

![Go](https://img.shields.io/badge/go-1.27+-blue)
![License](https://img.shields.io/badge/license-MIT-green)

https://github.com/user-attachments/assets/419d3e50-c933-444b-8cab-a9724986ba05

![ReClip 音频模式](assets/download.png)

## 功能特性

- 从 1000+ 受支持平台下载视频（基于 [yt-dlp](https://github.com/yt-dlp/yt-dlp)）
- 提取为 MP4 视频或 MP3 音频
- MP4 一律 faststart（moov 前置），起播只需一次 Range 请求
- 可选 H.265 转码（同观感码率约减半，适合弱网/路由器存储回放；源已是 HEVC 时自动只重封装，不做二次编码）
- 画质 / 分辨率选择器
- 批量下载——一次粘贴多个链接
- 自动去除重复 URL
- 干净、响应式的界面——无框架、无需构建步骤
- 单文件 Go 后端——仅依赖标准库，编译为单一可执行文件

## 快速开始

```bash
brew install go ffmpeg yt-dlp    # 或者 apt install golang ffmpeg
git clone https://github.com/azhai/reclip.git
cd reclip
make
./bin/reclip
```

> yt-dlp 无需手动安装：Go 服务会使用 `PATH` 中已有的版本，或者在首次启动时自动下载一个独立构建到 `./bin` 目录。它只在每次启动时自更新这个独立构建（可通过 `RECLIP_NO_UPDATE=1` 跳过）；对于系统安装的 yt-dlp（如 Homebrew），则交由相应的包管理器自行更新。

打开 **http://localhost:8899**。

## 使用方法

1. 在输入框中粘贴一个或多个视频链接
2. 选择 **MP4**（视频）或 **MP3**（音频）
3. 点击 **Fetch** 加载视频信息与缩略图
4. 如有需要，选择画质 / 分辨率
5. 对单个视频点击 **Download**，或点击 **Download All** 全部下载

## 支持的平台

凡是 [yt-dlp 支持的](https://github.com/yt-dlp/yt-dlp/blob/master/supportedsites.md)均可，包括：

YouTube、TikTok、Instagram、Twitter/X、Reddit、Facebook、Vimeo、Twitch、Dailymotion、SoundCloud、Loom、Streamable、Pinterest、Tumblr、Threads、LinkedIn 等等众多平台。

## Chrome 扩展（可选）

一个轻量级的配套扩展位于 [`extension/`](extension/)（Manifest V3、原生 JavaScript、无构建步骤）：

- **右键**任意视频链接、媒体元素或页面 → *ReClip → 用 ReClip 下载*，会打开面板并自动预填 URL、自动抓取信息
- **工具栏弹窗**——下载当前标签页、切换 MP4/MP3，并可设置服务器地址（默认 `http://127.0.0.1:8899`）
- 已打开的面板标签页会被复用，且**只复用同源（协议 + 主机 + 端口）的标签页**——同一台机器上 8898 端口的其他应用不会被顶掉

安装方式：打开 `chrome://extensions` → 开启**开发者模式** → **加载已解压的扩展程序** → 选择 `extension/` 目录。

## 技术栈

- **后端：** Go（标准库 `net/http`，单一可执行文件）
- **前端：** 原生 HTML/CSS/JS（单文件，无构建步骤）
- **下载引擎：** [yt-dlp](https://github.com/yt-dlp/yt-dlp)（自动下载的独立可执行文件，由 Go 管理） + [ffmpeg](https://ffmpeg.org/)
- **依赖：** 0 个 Go 依赖包——无需 Python；只有 ffmpeg 需要安装

## 免责声明

本工具仅供个人使用。请尊重版权法律以及所下载平台的服务条款。开发者不对任何滥用本工具的行为负责。

## 许可证

[MIT](LICENSE)
