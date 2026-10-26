package main

import (
	"bufio"
	"bytes"
	"context"
	"crypto/rand"
	"crypto/sha256"
	"embed"
	"encoding/binary"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"image"
	"image/color"
	"image/jpeg"
	"io"
	"io/fs"
	"log"
	"math"
	"mime"
	"net"
	"net/http"
	"net/url"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"runtime"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"
)

//go:embed templates static
var content embed.FS

const (
	infoTimeout     = 60 * time.Second
	downloadTimeout = 5 * time.Minute
	// postTimeout is the floor for the re-encode pass; the real limit scales
	// with media length (see postDeadline), because a 2 h 1080p HEVC encode on
	// x265 medium can legitimately run longer than the download did.
	postTimeout = 15 * time.Minute
)

// Video codec policy for the finished file. The router only relays bytes, so
// the choice is purely about bandwidth vs. player compatibility.
const (
	codecCopy = "copy" // remux only: keep the source codec (usually H.264)
	codecH265 = "h265" // re-encode video to HEVC (hvc1) for ~40-50% less bitrate
)

// transcodeShare is the fraction of the progress bar the download gets when a
// re-encode follows; the remaining 15% belongs to the transcode pass.
const transcodeShare = 0.85

// Preferred playback heights offered as the "default resolution" setting. Keys
// are the accepted wire values.
var defaultHeights = map[string]int{
	"1080p": 1080,
	"720p":  720,
	"480p":  480,
	"360p":  360,
}

// settingsFile sits next to the binary. A var (not a const) so tests can point
// it somewhere disposable.
var settingsFile = "settings.json"

var (
	downloadDir string
	ytdlpPath   string
	ffmpegPath  string
	resolution  string // preferred height for the auto-selected quality, e.g. "720p"
	codec       string // video codec policy: copy | h265

	settingsMu sync.RWMutex

	jobsMu sync.RWMutex
	jobs   = map[string]*job{}

	// Server-Sent Events: subscribed pages get pushed job snapshots instead of
	// polling /api/jobs. Each client holds only the *newest* snapshot (see
	// sseClient), so a backlog can delay updates but never drop the last one —
	// dropping it is what left finished downloads stuck at their final percent.
	sseMu      sync.Mutex
	sseClients = map[*sseClient]struct{}{}
)

// sseClient is one subscribed browser. `queued` is replaced (not appended) on
// every update, so a client that is slow to read always sees the latest state;
// `wake` only signals "there is something to write".
type sseClient struct {
	mu     sync.Mutex
	queued []byte
	wake   chan struct{}
}

func newSSEClient() *sseClient { return &sseClient{wake: make(chan struct{}, 1)} }

// deliver stores payload as the pending snapshot and wakes the writer.
func (c *sseClient) deliver(payload []byte) {
	c.mu.Lock()
	c.queued = payload
	c.mu.Unlock()
	select {
	case c.wake <- struct{}{}:
	default: // already signalled — the writer will pick the newest payload up
	}
}

// take returns the pending snapshot, or nil when there is nothing new.
func (c *sseClient) take() []byte {
	c.mu.Lock()
	defer c.mu.Unlock()
	p := c.queued
	c.queued = nil
	return p
}

func getDownloadDir() string {
	settingsMu.RLock()
	defer settingsMu.RUnlock()
	return downloadDir
}

func getYtdlpPath() string {
	settingsMu.RLock()
	defer settingsMu.RUnlock()
	return ytdlpPath
}

func getFfmpegPath() string {
	settingsMu.RLock()
	defer settingsMu.RUnlock()
	return ffmpegPath
}

func getResolution() string {
	settingsMu.RLock()
	defer settingsMu.RUnlock()
	return resolution
}

// getResolutionHeight returns the preferred pixel height, or 0 when there is no
// preference ("best available").
func getResolutionHeight() int {
	settingsMu.RLock()
	defer settingsMu.RUnlock()
	return defaultHeights[resolution]
}

// getCodec returns the configured video codec policy (codecCopy when unset).
func getCodec() string {
	settingsMu.RLock()
	defer settingsMu.RUnlock()
	if codec == "" {
		return codecCopy
	}
	return codec
}

// validCodec reports whether s is an accepted codec policy value; "" means
// "use the configured default".
func validCodec(s string) bool {
	return s == "" || s == codecCopy || s == codecH265
}

// isExecutable reports whether path points to an executable regular file.
func isExecutable(path string) bool {
	if path == "" {
		return false
	}
	info, err := os.Stat(path)
	if err != nil || info.IsDir() {
		return false
	}
	return runtime.GOOS == "windows" || info.Mode()&0o111 != 0
}

type settings struct {
	Dir        string `json:"dir"`
	Ytdlp      string `json:"ytdlp"`
	Ffmpeg     string `json:"ffmpeg"`
	Resolution string `json:"resolution"`
	Codec      string `json:"codec"` // copy | h265
}

type job struct {
	id       string
	url      string
	format   string // video | audio
	codec    string // copy | h265 — snapshot of the policy for this job
	status   string // downloading | done | error
	progress float64
	title    string
	file     string
	filename string
	error    string
	duration float64 // media length in seconds, when the client knew it
	created  time.Time
	cancel   context.CancelFunc
}

type formatInfo struct {
	ID     string `json:"id"`
	Label  string `json:"label"`
	Height int    `json:"height"`
}

type ytdlpFormat struct {
	FormatID string  `json:"format_id"`
	Height   int     `json:"height"`
	Vcodec   string  `json:"vcodec"`
	TBR      float64 `json:"tbr"`
}

type ytdlpInfo struct {
	Title     string        `json:"title"`
	Thumbnail string        `json:"thumbnail"`
	Duration  any           `json:"duration"`
	Uploader  string        `json:"uploader"`
	Formats   []ytdlpFormat `json:"formats"`
}

type playlistResponse struct {
	URLs []string `json:"urls"`
}

type downloadRequest struct {
	URL      string `json:"url"`
	Format   string `json:"format"`
	FormatID string `json:"format_id"`
	Title    string `json:"title"`
	Filename string `json:"filename"`
	Start    string `json:"start"`
	End      string `json:"end"`
	// Codec overrides the configured video codec policy for this one download
	// ("copy" | "h265"); empty means "use the setting".
	Codec string `json:"codec"`
	// Duration is the media length in seconds reported by /api/info. It lets
	// us turn ffmpeg's read position into a real percentage.
	Duration float64 `json:"duration"`
}

func init() {
	_ = mime.AddExtensionType(".svg", "image/svg+xml")
}

func main() {
	dir, err := os.Getwd()
	if err != nil {
		log.Fatal(err)
	}
	var s settings
	if loaded, err := loadSettings(); err == nil {
		s = loaded
	}
	// Resolve the save directory: DOWNLOAD_DIR env > settings.json > ./downloads.
	downloadDir = os.Getenv("DOWNLOAD_DIR")
	if downloadDir == "" && s.Dir != "" {
		downloadDir = s.Dir
	}
	if downloadDir == "" {
		downloadDir = filepath.Join(dir, "downloads")
	}
	if err := os.MkdirAll(downloadDir, 0o755); err != nil {
		log.Fatal(err)
	}

	// Resolve yt-dlp: a path set in settings.json wins; else the one on PATH,
	// else an auto-downloaded standalone build (no Python needed).
	// `=` (not `:=`) assigns the package-level ytdlpPath used by runCmd/download.
	// `:=` would shadow it with a main-local copy and leave the global "" (that
	// bug surfaced as "exec: no command").
	var managed bool
	if s.Ytdlp != "" && isExecutable(s.Ytdlp) {
		ytdlpPath = s.Ytdlp
		managed = false // user-configured path — not self-updated
	} else {
		ytdlpPath, managed = resolveYtdlp()
	}
	if ytdlpPath == "" {
		log.Printf("WARNING: yt-dlp unavailable — downloads will fail. Install it or let ReClip download it (needs network).")
	} else if os.Getenv("RECLIP_NO_UPDATE") == "" && managed {
		// Only self-update the standalone build ReClip owns. A system yt-dlp
		// (Homebrew, OS package) is owned by its package manager — running
		// `yt-dlp -U` on it refuses with exit code 100.
		go func() {
			log.Printf("Updating yt-dlp...")
			ctx, cancel := context.WithTimeout(context.Background(), 90*time.Second)
			defer cancel()
			if err := exec.CommandContext(ctx, ytdlpPath, "-U").Run(); err != nil {
				log.Printf("couldn't update yt-dlp: %v", err)
			}
		}()
	} else if !managed && os.Getenv("RECLIP_NO_UPDATE") == "" {
		log.Printf("Using yt-dlp (%s).", ytdlpPath)
	}

	// Resolve ffmpeg: a path set in settings.json wins, else the one on PATH.
	if s.Ffmpeg != "" && isExecutable(s.Ffmpeg) {
		ffmpegPath = s.Ffmpeg
	} else if p, err := exec.LookPath("ffmpeg"); err == nil {
		ffmpegPath = p
	}
	if ffmpegPath == "" {
		log.Printf("WARNING: ffmpeg not found — MP4 merging and time-range excerpts will fail. Install ffmpeg.")
	}

	// Restore the default-resolution preference; anything unknown falls back to
	// no preference (best available).
	if _, ok := defaultHeights[s.Resolution]; ok {
		resolution = s.Resolution
	}
	if s.Codec == codecH265 {
		codec = codecH265
	} else {
		codec = codecCopy
	}

	// Write the resolved settings back into settings.json so the config file
	// records exactly which binaries and preferences are in use.
	_ = saveSettings(settings{Dir: getDownloadDir(), Ytdlp: ytdlpPath, Ffmpeg: ffmpegPath,
		Resolution: resolution, Codec: getCodec()})

	mux := http.NewServeMux()
	mux.HandleFunc("/", handleIndex)
	mux.HandleFunc("/static/", handleStatic)
	mux.HandleFunc("/privacy", handlePrivacy)
	mux.HandleFunc("/api/thumb", handleThumb)
	mux.HandleFunc("/api/info", handleInfo)
	mux.HandleFunc("/api/playlist", handlePlaylist)
	mux.HandleFunc("/api/download", handleDownload)
	mux.HandleFunc("/api/status/", handleStatus)
	mux.HandleFunc("/api/file/", handleFile)
	mux.HandleFunc("/api/jobs", handleJobs)
	mux.HandleFunc("/api/events", handleEvents)
	mux.HandleFunc("/api/job/", handleJobDelete)
	mux.HandleFunc("/api/settings", handleSettings)

	host := os.Getenv("HOST")
	if host == "" {
		host = "127.0.0.1"
	}
	port := os.Getenv("PORT")
	if port == "" {
		port = "8899"
	}

	addr := host + ":" + port
	log.Printf("ReClip is running at http://%s", addr)
	log.Fatal(http.ListenAndServe(addr, withCORS(mux)))
}

// withCORS allows cross-origin callers — e.g. the Chrome companion extension
// fetching from a non-matching server address (LAN IP, remote host). The
// frontend itself is same-origin, so the permissive `*` is harmless.
func withCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

// --- helpers ---

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func readJSON(r *http.Request, v any) error {
	defer r.Body.Close()
	return json.NewDecoder(r.Body).Decode(v)
}

func runCmd(ctx context.Context, args ...string) ([]byte, string, error) {
	cmd := exec.CommandContext(ctx, getYtdlpPath(), args...)
	var out, errBuf bytes.Buffer
	cmd.Stdout = &out
	cmd.Stderr = &errBuf
	err := cmd.Run()
	return out.Bytes(), errBuf.String(), err
}

// cmdError mirrors the Python backend: surface the last stderr line.
func cmdError(stderr string, err error) string {
	if stderr = strings.TrimSpace(stderr); stderr != "" {
		lines := strings.Split(stderr, "\n")
		return strings.TrimSpace(lines[len(lines)-1])
	}
	return err.Error()
}

// --- yt-dlp management ---

// ytdlpDownloadURL is the base for fetching the standalone build and its
// checksums. A var (not const) so tests can point it at a local server.
var ytdlpDownloadURL = "https://github.com/yt-dlp/yt-dlp/releases/latest/download"

// resolveYtdlp returns a usable yt-dlp executable and whether ReClip manages it.
// When a system yt-dlp is on PATH (e.g. Homebrew), it's returned un-managed
// (autoUpdate=false): that install is owned by a package manager, so `-U` is not
// the right updater and can fail with exit code 100. Otherwise ReClip
// downloads/owns a standalone build and self-updates it.
func resolveYtdlp() (path string, autoUpdate bool) {
	if p, err := exec.LookPath("yt-dlp"); err == nil {
		return p, false
	}

	binDir := os.Getenv("RECLIP_BIN_DIR")
	if binDir == "" {
		dir, err := os.Getwd()
		if err != nil {
			return "", false
		}
		binDir = filepath.Join(dir, "bin")
	}
	local := filepath.Join(binDir, "yt-dlp")
	if runtime.GOOS == "windows" {
		local += ".exe"
	}
	if info, err := os.Stat(local); err == nil && !info.IsDir() {
		return local, true
	}

	asset, ok := ytdlpAsset()
	if !ok {
		return "", false
	}
	if err := os.MkdirAll(binDir, 0o755); err != nil {
		log.Printf("could not create bin dir %s: %v", binDir, err)
		return "", false
	}

	url := ytdlpDownloadURL + "/" + asset
	log.Printf("yt-dlp not found — downloading %s ...", url)
	if err := downloadBinary(url, local, asset); err != nil {
		log.Printf("failed to download yt-dlp: %v", err)
		return "", false
	}
	return local, true
}

// ytdlpAsset maps the current platform to a release asset name.
func ytdlpAsset() (string, bool) {
	switch runtime.GOOS {
	case "linux":
		switch runtime.GOARCH {
		case "amd64":
			return "yt-dlp", true
		case "arm64":
			return "yt-dlp_linux_aarch64", true
		}
	case "darwin":
		return "yt-dlp_macos", true // universal2: covers amd64 + arm64
	case "windows":
		if runtime.GOARCH == "arm64" {
			return "yt-dlp_arm64.exe", true
		}
		return "yt-dlp.exe", true
	}
	log.Printf("no prebuilt yt-dlp for %s/%s — install yt-dlp manually", runtime.GOOS, runtime.GOARCH)
	return "", false
}

func downloadBinary(url, dest, asset string) error {
	tmp := dest + ".part"
	if err := downloadFile(url, tmp); err != nil {
		return err
	}
	defer os.Remove(tmp)
	if err := verifyChecksum(tmp, asset); err != nil {
		return err
	}
	if runtime.GOOS != "windows" {
		if err := os.Chmod(tmp, 0o755); err != nil {
			return err
		}
	}
	return os.Rename(tmp, dest)
}

func downloadFile(url, dest string) error {
	resp, err := http.Get(url)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("unexpected HTTP status %d for %s", resp.StatusCode, url)
	}
	f, err := os.Create(dest)
	if err != nil {
		return err
	}
	_, cerr := io.Copy(f, resp.Body)
	if cerr == nil {
		cerr = f.Sync()
	}
	if err := f.Close(); err != nil {
		cerr = err
	}
	return cerr
}

// verifyChecksum cross-checks the downloaded binary against the official
// SHA2-256SUMS file, so we never execute a tampered build.
func verifyChecksum(path, asset string) error {
	resp, err := http.Get(ytdlpDownloadURL + "/SHA2-256SUMS")
	if err != nil {
		return fmt.Errorf("fetching checksums: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("unexpected HTTP status %d for checksums", resp.StatusCode)
	}
	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return err
	}

	want := ""
	for _, line := range bytes.Split(data, []byte("\n")) {
		fields := bytes.Fields(line)
		if len(fields) != 2 || string(fields[1]) != asset {
			continue
		}
		want = strings.TrimPrefix(string(fields[0]), "sha256:")
		break
	}
	if want == "" {
		return fmt.Errorf("checksum for %s not found", asset)
	}

	f, err := os.Open(path)
	if err != nil {
		return err
	}
	defer f.Close()
	h := sha256.New()
	if _, err := io.Copy(h, f); err != nil {
		return err
	}
	if got := hex.EncodeToString(h.Sum(nil)); !strings.EqualFold(got, want) {
		return fmt.Errorf("checksum mismatch for %s", asset)
	}
	return nil
}

// parseYtdlpJSON returns the first valid JSON object on stdout. With -j yt-dlp
// prints one object per line; some extractors emit several videos even with
// --no-playlist, so a plain json.Unmarshal would hit "extra data".
func parseYtdlpJSON(stdout []byte) (json.RawMessage, error) {
	for _, line := range bytes.Split(stdout, []byte("\n")) {
		line = bytes.TrimSpace(line)
		if len(line) == 0 {
			continue
		}
		return json.RawMessage(line), nil
	}
	return nil, fmt.Errorf("yt-dlp returned no data")
}

func getJob(id string) (*job, bool) {
	jobsMu.RLock()
	defer jobsMu.RUnlock()
	j, ok := jobs[id]
	return j, ok
}

func setJobStatus(j *job, status, errMsg string) {
	jobsMu.Lock()
	j.status = status
	j.error = errMsg
	jobsMu.Unlock()
	broadcastJobs()
}

// finishJob is the single terminal transition (done/error). It always pushes a
// snapshot: setting j.status directly without one left the page showing the
// last streamed percentage forever.
func finishJob(j *job, status, errMsg string, progress float64) {
	jobsMu.Lock()
	j.status = status
	j.error = errMsg
	j.progress = progress
	jobsMu.Unlock()
	broadcastJobs()
}

func setJobProgress(j *job, p float64) {
	jobsMu.Lock()
	// Never move backwards: yt-dlp restarts at 0% for the audio track of a
	// video+audio merge, which would yank the bar back to the start.
	if p <= j.progress {
		jobsMu.Unlock()
		return
	}
	// Throttle: yt-dlp emits a progress line per fragment (dozens per second).
	// Only push when the rendered percentage actually moves.
	notify := p >= 100 || p-j.progress >= 0.5
	j.progress = p
	jobsMu.Unlock()
	if notify {
		broadcastJobs()
	}
}

func newJobID() string {
	b := make([]byte, 5)
	if _, err := rand.Read(b); err != nil {
		return fmt.Sprintf("%x", time.Now().UnixNano())
	}
	return hex.EncodeToString(b)
}

func sanitizeTitle(title string) string {
	var b strings.Builder
	for _, r := range title {
		if !strings.ContainsRune(`\/:*?"<>|`, r) {
			b.WriteRune(r)
		}
	}
	s := strings.TrimSpace(b.String())
	if s == "" {
		return ""
	}
	runes := []rune(s)
	if len(runes) > 100 {
		s = string(runes[:100])
	}
	return strings.TrimSpace(s)
}

// resolveFinalName returns (base, ext) for the finished file: a user-supplied
// custom name wins over the resolved title; falls back to the temp file's name.
func resolveFinalName(custom, title, chosen string) (string, string) {
	ext := filepath.Ext(chosen)
	base := ""
	if custom != "" {
		base = strings.TrimSpace(sanitizeTitle(custom))
		base = strings.TrimSuffix(base, filepath.Ext(base))
	}
	if base == "" {
		base = sanitizeTitle(title)
	}
	if base == "" {
		base = strings.TrimSuffix(filepath.Base(chosen), ext)
	}
	return base, ext
}

// uniquePath picks a non-colliding path under dir, appending " (n)" when the
// target already exists (e.g. two downloads given the same custom filename).
func uniquePath(dir, base, ext string) string {
	p := filepath.Join(dir, base+ext)
	if _, err := os.Stat(p); os.IsNotExist(err) {
		return p
	}
	for n := 2; ; n++ {
		q := filepath.Join(dir, fmt.Sprintf("%s (%d)%s", base, n, ext))
		if _, err := os.Stat(q); os.IsNotExist(err) {
			return q
		}
	}
}

// defaultFormatID picks what a freshly fetched card should start on: the
// sharpest format at or below the preferred height, so 720p lands on 720p even
// when the video also offers 1080p. When every format is taller than the
// preference (a 4K-only video with 360p wanted), the gentlest one wins.
// formats must be sorted sharpest-first; "" means there is nothing to pick.
func defaultFormatID(formats []formatInfo, prefHeight int) string {
	if len(formats) == 0 {
		return ""
	}
	if prefHeight <= 0 {
		return formats[0].ID // no preference → best available
	}
	var withinID string
	gentlest := formats[0]
	for _, f := range formats {
		if f.Height <= prefHeight && withinID == "" {
			withinID = f.ID // sorted desc, so the first match is the sharpest
		}
		if f.Height < gentlest.Height {
			gentlest = f
		}
	}
	if withinID != "" {
		return withinID
	}
	return gentlest.ID
}

func pickFile(files []string, formatChoice string) string {
	ext := ".mp4"
	if formatChoice == "audio" {
		ext = ".mp3"
	}
	for _, f := range files {
		if strings.EqualFold(filepath.Ext(f), ext) {
			return f
		}
	}
	return files[0]
}

func loadSettings() (settings, error) {
	var s settings
	data, err := os.ReadFile(settingsFile)
	if err != nil {
		return s, err
	}
	err = json.Unmarshal(data, &s)
	return s, err
}

func saveSettings(s settings) error {
	data, err := json.Marshal(s)
	if err != nil {
		return err
	}
	return os.WriteFile(settingsFile, data, 0o644)
}

// --- handlers ---

func handleIndex(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path != "/" {
		http.NotFound(w, r)
		return
	}
	data, err := content.ReadFile("templates/index.html")
	if err != nil {
		http.Error(w, "index not found", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	_, _ = w.Write(data)
}

// handlePrivacy serves the static privacy-policy page. It lives under
// templates/ (embedded) like index.html, but is its own route rather than a
// sub-path of "/", so it never collides with handleIndex's "/" guard.
func handlePrivacy(w http.ResponseWriter, r *http.Request) {
	data, err := content.ReadFile("templates/privacy.html")
	if err != nil {
		http.Error(w, "privacy policy not found", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	_, _ = w.Write(data)
}

// --- thumbnail compression proxy ---
//
// Cards used to point <img> straight at the source CDN. That cost bandwidth
// (full-size originals) and broke on hotlink protection (the page sent a
// Referer the CDN rejected, while a direct tab had none). This endpoint fetches
// the thumbnail server-side, downscales it to a 2x display bound, and re-encodes
// as JPEG — so the browser pulls a small same-origin image. Formats the stdlib
// can't decode (e.g. WebP) are proxied through untouched.

const (
	thumbMaxW        = 240              // 2x of the 120px display width
	thumbMaxH        = 160              // 2x of the 80px display height
	thumbQuality     = 80               // JPEG quality: small, still sharp
	thumbFetchTo     = 15 * time.Second // upstream fetch deadline
	thumbMaxBytes    = 8 << 20          // cap the fetched original at 8 MiB
	thumbMaxSide     = 5000             // reject absurdly large bitmaps
	thumbCacheMaxAge = 24 * time.Hour   // thumbnails are effectively immutable
)

// isSafeHost blocks URLs whose host is (or resolves to) a private, loopback, or
// link-local address, so the proxy can't be steered at internal services (SSRF).
func isSafeHost(u *url.URL) bool {
	host := u.Hostname()
	if ip := net.ParseIP(host); ip != nil {
		return !ip.IsPrivate() && !ip.IsLoopback() &&
			!ip.IsLinkLocalUnicast() && !ip.IsLinkLocalMulticast()
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	ips, err := net.DefaultResolver.LookupIPAddr(ctx, host)
	if err != nil {
		return false
	}
	for _, a := range ips {
		ip := a.IP
		if ip.IsPrivate() || ip.IsLoopback() ||
			ip.IsLinkLocalUnicast() || ip.IsLinkLocalMulticast() {
			return false
		}
	}
	return true
}

// fitBounds scales (w,h) down to fit within (maxW,maxH), preserving aspect.
func fitBounds(w, h, maxW, maxH int) (dw, dh int) {
	if w <= 0 || h <= 0 {
		return maxW, maxH
	}
	scale := math.Min(float64(maxW)/float64(w), float64(maxH)/float64(h))
	if scale >= 1 {
		return w, h
	}
	return int(math.Round(float64(w) * scale)), int(math.Round(float64(h) * scale))
}

// downscale averages source blocks into each destination pixel (box filter) — a
// dependency-free stand-in for a real resampler, good enough for thumbnails.
func downscale(src image.Image, dw, dh int) *image.RGBA {
	sb := src.Bounds()
	sw, sh := sb.Dx(), sb.Dy()
	dst := image.NewRGBA(image.Rect(0, 0, dw, dh))
	for y := 0; y < dh; y++ {
		y0, y1 := y*sh/dh, (y+1)*sh/dh
		if y1 <= y0 {
			y1 = y0 + 1
		}
		for x := 0; x < dw; x++ {
			x0, x1 := x*sw/dw, (x+1)*sw/dw
			if x1 <= x0 {
				x1 = x0 + 1
			}
			var r, g, b, a uint64
			var n int
			for sy := y0; sy < y1; sy++ {
				for sx := x0; sx < x1; sx++ {
					pr, pg, pb, pa := src.At(sb.Min.X+sx, sb.Min.Y+sy).RGBA()
					r += uint64(pr)
					g += uint64(pg)
					b += uint64(pb)
					a += uint64(pa)
					n++
				}
			}
			dst.Set(x, y, color.RGBA{
				R: uint8((r / uint64(n)) >> 8),
				G: uint8((g / uint64(n)) >> 8),
				B: uint8((b / uint64(n)) >> 8),
				A: uint8((a / uint64(n)) >> 8),
			})
		}
	}
	return dst
}

// handleThumb fetches, downscales, and re-encodes a remote thumbnail. On any
// decode/resize failure it falls back to streaming the original bytes as-is.
func handleThumb(w http.ResponseWriter, r *http.Request) {
	raw := strings.TrimSpace(r.URL.Query().Get("u"))
	if raw == "" {
		http.Error(w, "missing u", http.StatusBadRequest)
		return
	}
	u, err := url.Parse(raw)
	if err != nil || (u.Scheme != "http" && u.Scheme != "https") {
		http.Error(w, "invalid url", http.StatusBadRequest)
		return
	}
	if !isSafeHost(u) {
		http.Error(w, "forbidden host", http.StatusForbidden)
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), thumbFetchTo)
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, u.String(), nil)
	if err != nil {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		http.Error(w, "fetch failed", http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		http.Error(w, "upstream error", http.StatusBadGateway)
		return
	}

	data, err := io.ReadAll(io.LimitReader(resp.Body, thumbMaxBytes))
	if err != nil {
		http.Error(w, "read failed", http.StatusBadGateway)
		return
	}

	if img, format, derr := image.Decode(bytes.NewReader(data)); derr == nil {
		b := img.Bounds()
		if b.Dx() <= thumbMaxSide && b.Dy() <= thumbMaxSide {
			dw, dh := fitBounds(b.Dx(), b.Dy(), thumbMaxW, thumbMaxH)
			if dw < b.Dx() || dh < b.Dy() {
				img = downscale(img, dw, dh)
			}
			buf := &bytes.Buffer{}
			if jpeg.Encode(buf, img, &jpeg.Options{Quality: thumbQuality}) == nil {
				w.Header().Set("Content-Type", "image/jpeg")
				w.Header().Set("Cache-Control", "public, max-age="+strconv.Itoa(int(thumbCacheMaxAge.Seconds())))
				w.Header().Set("X-Reclip-Thumb", format)
				_, _ = w.Write(buf.Bytes())
				return
			}
		}
	}

	// Unsupported/oversized format: pass the original through (still same-origin,
	// so it also dodges the hotlink-Referer 404).
	w.Header().Set("Content-Type", resp.Header.Get("Content-Type"))
	w.Header().Set("Cache-Control", "public, max-age="+strconv.Itoa(int(thumbCacheMaxAge.Seconds())))
	_, _ = w.Write(data)
}

func handleStatic(w http.ResponseWriter, r *http.Request) {
	sub, err := fs.Sub(content, "static")
	if err != nil {
		http.NotFound(w, r)
		return
	}
	http.StripPrefix("/static/", http.FileServer(http.FS(sub))).ServeHTTP(w, r)
}

func handleInfo(w http.ResponseWriter, r *http.Request) {
	var req struct {
		URL string `json:"url"`
	}
	if err := readJSON(r, &req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid request"})
		return
	}
	req.URL = strings.TrimSpace(req.URL)
	if req.URL == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "No URL provided"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), infoTimeout)
	defer cancel()

	stdout, stderr, err := runCmd(ctx, "--no-playlist", "-j", req.URL)
	if err != nil {
		if ctx.Err() == context.DeadlineExceeded {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Timed out fetching video info"})
			return
		}
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": cmdError(stderr, err)})
		return
	}

	raw, err := parseYtdlpJSON(stdout)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}

	var info ytdlpInfo
	if err := json.Unmarshal(raw, &info); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}

	// Keep the best format (highest bitrate) per resolution.
	best := map[int]ytdlpFormat{}
	for _, f := range info.Formats {
		if f.Height <= 0 || f.Vcodec == "none" {
			continue
		}
		cur, ok := best[f.Height]
		if !ok || f.TBR > cur.TBR {
			best[f.Height] = f
		}
	}

	formats := make([]formatInfo, 0, len(best))
	for h, f := range best {
		formats = append(formats, formatInfo{ID: f.FormatID, Label: fmt.Sprintf("%dp", h), Height: h})
	}
	sort.Slice(formats, func(i, j int) bool { return formats[i].Height > formats[j].Height })

	writeJSON(w, http.StatusOK, map[string]any{
		"title":     info.Title,
		"thumbnail": info.Thumbnail,
		"duration":  info.Duration,
		"uploader":  info.Uploader,
		"formats":   formats,
		// Which one the selected default resolution maps to, so the card can
		// highlight it without knowing the rule.
		"default_id": defaultFormatID(formats, getResolutionHeight()),
	})
}

func handlePlaylist(w http.ResponseWriter, r *http.Request) {
	var req struct {
		URL string `json:"url"`
	}
	if err := readJSON(r, &req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid request"})
		return
	}
	req.URL = strings.TrimSpace(req.URL)
	if req.URL == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "No URL provided"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), infoTimeout)
	defer cancel()

	stdout, stderr, err := runCmd(ctx, "--flat-playlist", "-J", req.URL)
	if err != nil {
		if ctx.Err() == context.DeadlineExceeded {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Timed out fetching playlist info"})
			return
		}
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": cmdError(stderr, err)})
		return
	}

	var info struct {
		Entries []struct {
			URL string `json:"url"`
		} `json:"entries"`
	}
	if err := json.Unmarshal(stdout, &info); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}

	urls := make([]string, 0, len(info.Entries))
	for _, e := range info.Entries {
		if e.URL != "" {
			urls = append(urls, e.URL)
		}
	}
	writeJSON(w, http.StatusOK, playlistResponse{URLs: urls})
}

func handleDownload(w http.ResponseWriter, r *http.Request) {
	var req downloadRequest
	if err := readJSON(r, &req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid request"})
		return
	}
	req.URL = strings.TrimSpace(req.URL)
	if req.URL == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "No URL provided"})
		return
	}
	req.Codec = strings.TrimSpace(req.Codec)
	if !validCodec(req.Codec) {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Unsupported codec: " + req.Codec})
		return
	}
	if req.Codec == "" {
		req.Codec = getCodec()
	}
	// MP3 output has no faststart/HEVC story; the audio path ignores codec.

	id := newJobID()
	j := &job{id: id, status: "downloading", url: req.URL, title: req.Title,
		format: req.Format, codec: req.Codec, progress: 0, duration: req.Duration, created: time.Now()}
	jobsMu.Lock()
	jobs[id] = j
	jobsMu.Unlock()
	broadcastJobs()

	go runDownload(j, req.URL, req.Format, req.FormatID, req.Filename, req.Start, req.End)

	writeJSON(w, http.StatusOK, map[string]string{"job_id": id})
}

// parseDur turns a user time string ("90", "1:30", "1:30.5", "00:01:30")
// into seconds.
func parseDur(s string) (float64, error) {
	s = strings.TrimSpace(s)
	if s == "" {
		return 0, nil
	}
	parts := strings.Split(s, ":")
	if len(parts) == 1 {
		return strconv.ParseFloat(s, 64)
	}
	var sec float64
	for _, p := range parts {
		v, err := strconv.ParseFloat(strings.TrimSpace(p), 64)
		if err != nil {
			return 0, err
		}
		sec = sec*60 + v
	}
	return sec, nil
}

func trimFloat(v float64) string {
	return strconv.FormatFloat(v, 'f', -1, 64)
}

// durString trims a user time string ("", "90", "1:30", "1:30.5") into a
// plain seconds string usable in a yt-dlp section spec. Returns "" on empty or
// unparseable input.
func durString(s string) string {
	if s = strings.TrimSpace(s); s == "" {
		return ""
	}
	v, err := parseDur(s)
	if err != nil {
		return ""
	}
	return trimFloat(v)
}

// sectionSpec maps a (start, end) range to a yt-dlp --download-sections
// time-range spec: "*S-E", "*S-" (to end) or "*-E" (from 0). yt-dlp streams
// only that interval natively (handles per-site headers/CDNs, unlike passing a
// raw direct URL to ffmpeg), so fetching stops at the end time.
func sectionSpec(start, end string) string {
	s, e := durString(start), durString(end)
	switch {
	case s != "" && e != "":
		return "*" + s + "-" + e
	case s != "":
		return "*" + s + "-"
	case e != "":
		return "*-" + e
	}
	return ""
}

// scanNewlines splits stderr into tokens on both \r and \n. yt-dlp rewrites its
// progress bar in place with \r and only emits \n at the end, so a plain
// line split would swallow every intermediate percentage into one giant token.
func scanNewlines(data []byte, atEOF bool) (advance int, token []byte, err error) {
	if atEOF && len(data) == 0 {
		return 0, nil, nil
	}
	for i := 0; i < len(data); i++ {
		if data[i] == '\n' || data[i] == '\r' {
			next := i + 1
			for next < len(data) && (data[next] == '\n' || data[next] == '\r') {
				next++
			}
			return next, data[:i], nil
		}
	}
	if atEOF {
		return len(data), data, nil
	}
	return 0, nil, nil
}

// Progress signals found in yt-dlp's and ffmpeg's stderr.
var (
	ytdlpPctRe  = regexp.MustCompile(`\[download\]\s+(\d+(?:\.\d+)?)%`)
	ffmpegTimeR = regexp.MustCompile(`time=(\d{1,2}):(\d{1,2}):([\d.]+)`)
	ytdlpETAR   = regexp.MustCompile(`\bETA\s+(?:(\d{1,2}):)?(\d{1,2}):(\d{1,2})`)
)

// secFromTime converts ffmpeg's "HH:MM:SS.xx" fields into total seconds.
func secFromTime(h, m, s string) float64 {
	hh, _ := strconv.Atoi(h)
	mm, _ := strconv.Atoi(m)
	ss, _ := strconv.ParseFloat(s, 64)
	return float64(hh*3600+mm*60) + ss
}

// lineProgress maps one stderr line onto a 0–100 percentage, or -1 when the
// line carries no usable progress signal. Three independent sources cover the
// stages of a job: ffmpeg's read position (the only signal during excerpts and
// during merging/audio extraction), yt-dlp's own byte percentage, and finally
// yt-dlp's ETA when neither reports anything.
//
// endSec is the end position in source time of what we are producing, so
// position/endSec is the real completion ratio; elapsed is seconds since the
// process started, used by the ETA fallback.
func lineProgress(line string, endSec, elapsed float64) float64 {
	pct := -1.0
	if endSec > 0 {
		if tm := ffmpegTimeR.FindStringSubmatch(line); tm != nil {
			pct = secFromTime(tm[1], tm[2], tm[3]) / endSec * 100
		}
	}
	if m := ytdlpPctRe.FindStringSubmatch(line); m != nil {
		if p, err := strconv.ParseFloat(m[1], 64); err == nil && p > pct {
			pct = p
		}
	}
	if pct < 0 {
		if em := ytdlpETAR.FindStringSubmatch(line); em != nil {
			h, _ := strconv.Atoi(em[1])
			mi, _ := strconv.Atoi(em[2])
			se, _ := strconv.Atoi(em[3])
			eta := float64(h*3600+mi*60+se) + 1
			pct = elapsed / (elapsed + eta) * 100
			if pct > 95 { // only real completion reaches 100
				pct = 95
			}
		}
	}
	if pct > 100 {
		pct = 100
	}
	return pct
}

// pumpStderr consumes yt-dlp's stderr: every line is scored for progress and a
// bounded tail is kept for surfaced error messages. Only yt-dlp "[download] N%"
// lines count as byte progress; ffmpeg's own summary also prints percentages
// ("muxing overhead: 2.2%") which would otherwise pin the bar near a few percent.
func pumpStderr(r io.Reader, endSec float64, onProgress func(float64)) string {
	var errTail strings.Builder
	startedAt := time.Now()
	scanner := bufio.NewScanner(r)
	scanner.Buffer(make([]byte, 64*1024), 1024*1024)
	scanner.Split(scanNewlines) // yt-dlp updates progress in-place with \r
	for scanner.Scan() {
		line := scanner.Text()
		if errTail.Len() < 8000 {
			errTail.WriteString(line)
			errTail.WriteByte('\n')
		}
		if pct := lineProgress(line, endSec, time.Since(startedAt).Seconds()); pct > 0 {
			onProgress(pct)
		}
	}
	return errTail.String()
}

func runDownload(j *job, url, formatChoice, formatID, customName, start, end string) {
	dir := getDownloadDir()

	ctx, cancel := context.WithTimeout(context.Background(), downloadTimeout)
	defer cancel()
	jobsMu.Lock()
	j.cancel = cancel
	jobsMu.Unlock()

	// Time-range excerpts use yt-dlp's native --download-sections, which streams
	// only the requested [start,end] interval (per-site headers/CDNs handled by
	// yt-dlp itself), so fetching stops at the end time instead of pulling the
	// whole media first and slicing afterwards.
	var cmd *exec.Cmd
	outTemplate := filepath.Join(dir, j.id+".%(ext)s")
	args := []string{"--no-playlist", "-o", outTemplate}
	if start != "" || end != "" {
		args = append(args, "--download-sections", sectionSpec(start, end))
	}
	// Point yt-dlp at the configured ffmpeg for merging/audio extraction.
	if ff := getFfmpegPath(); ff != "" {
		args = append(args, "--ffmpeg-location", filepath.Dir(ff))
	}
	switch {
	case formatChoice == "audio":
		args = append(args, "-x", "--audio-format", "mp3")
	case formatID != "":
		args = append(args, "-f", formatID+"+bestaudio/best", "--merge-output-format", "mp4")
	default:
		// No explicit pick (extension launch, API caller): keep the standing
		// resolution preference instead of grabbing the sharpest stream.
		sel := "bestvideo+bestaudio/best"
		if h := getResolutionHeight(); h > 0 {
			sel = fmt.Sprintf("bestvideo[height<=%d]+bestaudio/best", h)
		}
		args = append(args, "-f", sel, "--merge-output-format", "mp4")
	}
	args = append(args, url)
	cmd = exec.CommandContext(ctx, getYtdlpPath(), args...)

	// Denominator for time-based progress: the end position, in source
	// seconds, of whatever we are producing. ffmpeg reports the position it
	// has read up to, so position/endSec is the true progress — this is the
	// only signal that exists during excerpts and during merging/audio
	// extraction, where yt-dlp prints no "[download] N%" at all.
	endSec := j.duration
	if e0, err := parseDur(end); err == nil && e0 > 0 {
		if endSec <= 0 || e0 < endSec {
			endSec = e0
		}
	}

	stderr, err := cmd.StderrPipe()
	if err != nil {
		setJobStatus(j, "error", err.Error())
		return
	}
	if err := cmd.Start(); err != nil {
		setJobStatus(j, "error", err.Error())
		return
	}

	// Every line is scored for progress; setJobProgress keeps the bar
	// monotonic, so a source that resets (audio track after video, merge after
	// download) cannot drag it backwards. When a re-encode follows, the
	// download only owns the first 85% of the bar.
	dlScale := 1.0
	if j.codec == codecH265 && formatChoice != "audio" {
		dlScale = transcodeShare
	}
	errTail := pumpStderr(stderr, endSec, func(p float64) { setJobProgress(j, p*dlScale) })
	waitErr := cmd.Wait()

	if waitErr != nil {
		msg := cmdError(errTail, waitErr)
		if ctx.Err() == context.DeadlineExceeded {
			msg = "Download timed out (5 min limit)"
		}
		finishJob(j, "error", msg, 0)
		return
	}

	files, err := filepath.Glob(filepath.Join(dir, j.id+".*"))
	if err != nil || len(files) == 0 {
		finishJob(j, "error", "Download completed but no file was found", 0)
		return
	}

	chosen := pickFile(files, formatChoice)
	for _, f := range files {
		if f != chosen {
			_ = os.Remove(f)
		}
	}

	// MP4 finish: put moov at the front (one Range request instead of two per
	// playback start) and, when asked, re-encode to HEVC for half the bitrate.
	if filepath.Ext(chosen) == ".mp4" {
		if out, err := runPostprocess(j, chosen, endSec); err != nil {
			finishJob(j, "error", cmdError(out, err), j.progress)
			return
		}
	}

	base, ext := resolveFinalName(customName, j.title, chosen)
	finalPath := filepath.Join(dir, base+ext)
	// uniquePath would otherwise count `chosen` itself as taken and rename the
	// file to "name (2)" whenever the title is unknown.
	if finalPath != chosen {
		finalPath = uniquePath(dir, base, ext)
		if err := os.Rename(chosen, finalPath); err != nil {
			finishJob(j, "error", err.Error(), j.progress)
			return
		}
	}

	jobsMu.Lock()
	j.file = finalPath
	j.filename = filepath.Base(finalPath)
	jobsMu.Unlock()
	finishJob(j, "done", "", 100)
}

// --- MP4 finish pass: faststart + optional HEVC -------------------------

// moovBeforeMdat reports whether path is an MP4/QuickTime file whose index
// (moov) already precedes the media data (mdat) — i.e. it is faststart-ready
// and a client can start playing from byte 0 without a second Range request to
// find the index at the tail.
func moovBeforeMdat(path string) bool {
	f, err := os.Open(path)
	if err != nil {
		return false
	}
	defer f.Close()
	st, err := f.Stat()
	if err != nil {
		return false
	}
	size := st.Size()
	var hdr [16]byte
	for off := int64(0); off+8 <= size; {
		if _, err := f.ReadAt(hdr[:8], off); err != nil {
			return false
		}
		sz := int64(binary.BigEndian.Uint32(hdr[:4]))
		typ := string(hdr[4:8])
		switch sz {
		case 1: // 64-bit size follows the type
			if _, err := f.ReadAt(hdr[8:16], off+8); err != nil {
				return false
			}
			sz = int64(binary.BigEndian.Uint64(hdr[8:16]))
		case 0: // extends to end of file
			sz = size - off
		}
		if sz < 8 {
			return false
		}
		switch typ {
		case "moov":
			return true
		case "mdat":
			return false
		}
		off += sz
	}
	return false
}

// postprocessArgs builds the ffmpeg finish pass. Both modes write a fresh file
// (moov relocation and re-encoding are not in-place operations).
//   - copy: stream copy, so the only cost is I/O — the file keeps its source
//     codec (usually H.264) and just gains a front-loaded index.
//   - h265: real re-encode. `-tag:v hvc1` matters: Apple players only recognise
//     hvc1, not the hev1 tag ffmpeg writes by default. Audio is normalised to
//     AAC because HEVC + Opus in MP4 is poorly supported by TVs and Safari.
func postprocessArgs(src, dst string, hevc bool) []string {
	args := []string{"-y", "-nostdin", "-hide_banner", "-i", src}
	if hevc {
		args = append(args,
			"-map", "0:v:0", "-map", "0:a?",
			"-c:v", "libx265", "-crf", "26", "-preset", "medium",
			"-tag:v", "hvc1",
			"-c:a", "aac", "-b:a", "160k",
		)
	} else {
		args = append(args, "-c", "copy")
	}
	return append(args, "-movflags", "+faststart", "-f", "mp4", dst)
}

// exeSuffix is ".exe" on Windows, "" elsewhere — ffprobe sits next to ffmpeg.
func exeSuffix() string {
	if runtime.GOOS == "windows" {
		return ".exe"
	}
	return ""
}

// ffprobePath locates ffprobe: the sibling of the configured ffmpeg wins
// (Homebrew and static builds ship both), then whatever is on PATH.
func ffprobePath() string {
	if ff := getFfmpegPath(); ff != "" {
		cand := filepath.Join(filepath.Dir(ff), "ffprobe"+exeSuffix())
		if isExecutable(cand) {
			return cand
		}
	}
	if p, err := exec.LookPath("ffprobe"); err == nil {
		return p
	}
	return ""
}

// probeVideoCodec returns the first video stream's codec name ("h264", "hevc",
// "vp9", …), or "" when ffprobe is missing or the file cannot be probed.
func probeVideoCodec(path string) string {
	probe := ffprobePath()
	if probe == "" {
		return ""
	}
	out, err := exec.Command(probe, "-v", "error", "-select_streams", "v:0",
		"-show_entries", "stream=codec_name", "-of", "csv=p=0", path).Output()
	if err != nil {
		return ""
	}
	return strings.TrimSpace(string(out))
}

// postDeadline scales the re-encode budget with media length: x265 medium runs
// at roughly 1-2x realtime, so allow 3x plus the floor.
func postDeadline(durSec float64, hevc bool) time.Duration {
	d := postTimeout
	if hevc && durSec > 0 {
		if est := time.Duration(durSec*3*float64(time.Second)); est > d {
			d = est
		}
	}
	return d
}

// runPostprocess makes the finished MP4 stream-friendly. On success src is
// replaced in place, so the caller's path stays valid. The returned string is
// the ffmpeg stderr tail for error reporting.
func runPostprocess(j *job, src string, durSec float64) (string, error) {
	hevc := j.codec == codecH265
	if hevc && probeVideoCodec(src) == "hevc" {
		// Some sites already serve HEVC (and yt-dlp may have picked it). Encoding
		// HEVC to HEVC buys nothing and costs a generation of quality, so fall
		// back to a plain remux — the faststart work still happens.
		log.Printf("postprocess: %s is already HEVC — remux only, skipping re-encode", filepath.Base(src))
		hevc = false
	}
	if !hevc && moovBeforeMdat(src) {
		return "", nil // already faststart-ready, and no re-encode was asked for
	}
	ff := getFfmpegPath()
	if ff == "" {
		if hevc {
			return "", fmt.Errorf("ffmpeg is required to re-encode to H.265")
		}
		// Without ffmpeg the file still plays; it only costs an extra Range
		// request per playback start. Not worth failing the job over.
		return "", nil
	}

	dst := strings.TrimSuffix(src, filepath.Ext(src)) + ".pp.mp4"
	ctx, cancel := context.WithTimeout(context.Background(), postDeadline(durSec, hevc))
	defer cancel()
	jobsMu.Lock()
	j.cancel = cancel // deleting the job now also aborts the encode
	jobsMu.Unlock()

	cmd := exec.CommandContext(ctx, ff, postprocessArgs(src, dst, hevc)...)
	stderr, err := cmd.StderrPipe()
	if err != nil {
		return "", err
	}
	if err := cmd.Start(); err != nil {
		return "", err
	}

	base := 0.0
	if hevc {
		base = transcodeShare * 100
	}
	tail := pumpStderr(stderr, durSec, func(p float64) {
		setJobProgress(j, base+(100-base)*p/100)
	})
	if err := cmd.Wait(); err != nil {
		_ = os.Remove(dst)
		if ctx.Err() == context.DeadlineExceeded {
			return tail, fmt.Errorf("post-processing timed out")
		}
		return tail, err
	}

	if err := os.Remove(src); err != nil {
		_ = os.Remove(dst)
		return tail, err
	}
	if err := os.Rename(dst, src); err != nil {
		return tail, err
	}
	return tail, nil
}

func handleStatus(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimPrefix(r.URL.Path, "/api/status/")
	j, ok := getJob(id)
	if !ok {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "Job not found"})
		return
	}
	jobsMu.RLock()
	snapshot := map[string]any{
		"status":   j.status,
		"error":    j.error,
		"filename": j.filename,
		"progress": j.progress,
	}
	jobsMu.RUnlock()
	writeJSON(w, http.StatusOK, snapshot)
}

func handleJobs(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{"jobs": jobsList()})
}

// jobsList snapshots all jobs sorted newest-first, as the API payload array.
func jobsList() []map[string]any {
	type entry struct {
		created time.Time
		m       map[string]any
	}
	jobsMu.RLock()
	entries := make([]entry, 0, len(jobs))
	for id, j := range jobs {
		entries = append(entries, entry{j.created, map[string]any{
			"id":       id,
			"url":      j.url,
			"format":   j.format,
			"status":   j.status,
			"progress": j.progress,
			"title":    j.title,
			"filename": j.filename,
			"error":    j.error,
		}})
	}
	jobsMu.RUnlock()
	// Stable sort: newest download first.
	sort.SliceStable(entries, func(a, b int) bool {
		return entries[a].created.After(entries[b].created)
	})
	list := make([]map[string]any, 0, len(entries))
	for _, e := range entries {
		list = append(list, e.m)
	}
	return list
}

// jobsPayload returns the wire-encoded job snapshot for an SSE event.
func jobsPayload() []byte {
	data, _ := json.Marshal(map[string]any{"jobs": jobsList()})
	return data
}

// broadcastJobs pushes a fresh snapshot to every subscribed SSE client.
func broadcastJobs() {
	payload := jobsPayload()
	sseMu.Lock()
	defer sseMu.Unlock()
	for c := range sseClients {
		c.deliver(payload)
	}
}

// handleEvents streams job updates to the page via Server-Sent Events, removing
// the need for front-end polling.
func handleEvents(w http.ResponseWriter, r *http.Request) {
	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "streaming unsupported", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("X-Accel-Buffering", "no") // never let a proxy buffer the stream

	c := newSSEClient()
	sseMu.Lock()
	sseClients[c] = struct{}{}
	sseMu.Unlock()
	defer func() {
		sseMu.Lock()
		delete(sseClients, c)
		sseMu.Unlock()
	}()

	// Reconnect hint, then the initial snapshot; updates follow on change.
	fmt.Fprint(w, "retry: 3000\n\n")
	fmt.Fprintf(w, "data: %s\n\n", jobsPayload())
	flusher.Flush()

	// Heartbeat: an idle stream looks dead to proxies and some browsers, which
	// is what made long downloads "lose" the connection. 15s stays well under
	// the common 30–60s idle timeouts.
	ticker := time.NewTicker(15 * time.Second)
	defer ticker.Stop()
	for {
		select {
		case <-r.Context().Done():
			return
		case <-ticker.C:
			if _, err := fmt.Fprint(w, ": keepalive\n\n"); err != nil {
				return
			}
			flusher.Flush()
		case <-c.wake:
			payload := c.take()
			if payload == nil {
				continue
			}
			if _, err := fmt.Fprintf(w, "data: %s\n\n", payload); err != nil {
				return
			}
			flusher.Flush()
		}
	}
}

func handleJobDelete(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimPrefix(r.URL.Path, "/api/job/")
	jobsMu.Lock()
	j, ok := jobs[id]
	delete(jobs, id)
	jobsMu.Unlock()
	if ok && j != nil && j.cancel != nil {
		j.cancel() // aborts the running yt-dlp process via context
	}
	broadcastJobs()
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

func handleSettings(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		writeJSON(w, http.StatusOK, map[string]any{
			"dir":        getDownloadDir(),
			"ytdlp":      getYtdlpPath(),
			"ffmpeg":     getFfmpegPath(),
			"resolution": getResolution(),
			"codec":      getCodec(),
		})
	case http.MethodPost, http.MethodPut:
		var req struct {
			Dir        string `json:"dir"`
			Ytdlp      string `json:"ytdlp"`
			Ffmpeg     string `json:"ffmpeg"`
			Resolution string `json:"resolution"`
			Codec      string `json:"codec"`
		}
		if err := readJSON(r, &req); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid request"})
			return
		}
		req.Dir = strings.TrimSpace(req.Dir)
		req.Ytdlp = strings.TrimSpace(req.Ytdlp)
		req.Ffmpeg = strings.TrimSpace(req.Ffmpeg)
		req.Resolution = strings.TrimSpace(req.Resolution)
		req.Codec = strings.TrimSpace(req.Codec)
		if req.Dir == "" && req.Ytdlp == "" && req.Ffmpeg == "" && req.Resolution == "" && req.Codec == "" {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Nothing to update: dir/ytdlp/ffmpeg/resolution/codec are all empty"})
			return
		}
		if req.Codec != "" && !validCodec(req.Codec) {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Unsupported codec: " + req.Codec})
			return
		}
		if req.Resolution != "" {
			if _, ok := defaultHeights[req.Resolution]; !ok {
				writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Unsupported resolution: " + req.Resolution})
				return
			}
		}

		settingsMu.Lock()
		resp := map[string]any{}
		// Read `codec` directly: getCodec() would take the read lock while the
		// write lock is already held (RWMutex is not reentrant → deadlock).
		curCodec := codec
		if curCodec == "" {
			curCodec = codecCopy
		}
		persist := settings{Dir: downloadDir, Ytdlp: ytdlpPath, Ffmpeg: ffmpegPath,
			Resolution: resolution, Codec: curCodec}
		if req.Dir != "" {
			abs, err := filepath.Abs(req.Dir)
			if err != nil || os.MkdirAll(abs, 0o755) != nil {
				settingsMu.Unlock()
				writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid or non-writable directory"})
				return
			}
			downloadDir = abs
			persist.Dir = abs
			resp["dir"] = abs
		}
		if req.Ytdlp != "" {
			if !isExecutable(req.Ytdlp) {
				settingsMu.Unlock()
				writeJSON(w, http.StatusBadRequest, map[string]string{"error": "ytdlp path is not an executable: " + req.Ytdlp})
				return
			}
			ytdlpPath = req.Ytdlp
			persist.Ytdlp = req.Ytdlp
			resp["ytdlp"] = req.Ytdlp
		}
		if req.Ffmpeg != "" {
			if !isExecutable(req.Ffmpeg) {
				settingsMu.Unlock()
				writeJSON(w, http.StatusBadRequest, map[string]string{"error": "ffmpeg path is not an executable: " + req.Ffmpeg})
				return
			}
			ffmpegPath = req.Ffmpeg
			persist.Ffmpeg = req.Ffmpeg
			resp["ffmpeg"] = req.Ffmpeg
		}
		if req.Resolution != "" {
			resolution = req.Resolution
			persist.Resolution = req.Resolution
			resp["resolution"] = req.Resolution
		}
		if req.Codec != "" {
			codec = req.Codec
			persist.Codec = req.Codec
			resp["codec"] = req.Codec
		}
		settingsMu.Unlock()
		_ = saveSettings(persist) // persist; failures are non-fatal
		if resp["dir"] == nil {
			resp["dir"] = getDownloadDir()
		}
		if resp["resolution"] == nil {
			resp["resolution"] = getResolution()
		}
		if resp["codec"] == nil {
			resp["codec"] = getCodec()
		}
		writeJSON(w, http.StatusOK, resp)
	default:
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "Method not allowed"})
	}
}

func handleFile(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimPrefix(r.URL.Path, "/api/file/")
	j, ok := getJob(id)
	if !ok || j.status != "done" {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "File not ready"})
		return
	}
	name := j.filename
	if name == "" {
		name = filepath.Base(j.file)
	}
	w.Header().Set("Content-Disposition",
		fmt.Sprintf("attachment; filename*=UTF-8''%s", url.PathEscape(name)))
	http.ServeFile(w, r, j.file)
}
