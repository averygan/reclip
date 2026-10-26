package main

import (
	"bufio"
	"bytes"
	"encoding/binary"
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"net/http"
	"net/http/httptest"
	"os"
	"os/exec"
	"path/filepath"
	"reflect"
	"runtime"
	"strings"
	"testing"
	"time"
)

// --- sanitizeTitle ---

func TestSanitizeTitle(t *testing.T) {
	cases := []struct{ in, want string }{
		{"plain title", "plain title"},
		{`a/b\c:d*e?f"g<h>i|j`, "abcdefghij"}, // all illegal chars stripped on Windows/Linux
		{"   padded   ", "padded"},
		{"   ", ""},
		{"", ""},
		{"\t\n", ""},
	}
	for _, c := range cases {
		if got := sanitizeTitle(c.in); got != c.want {
			t.Errorf("sanitizeTitle(%q) = %q, want %q", c.in, got, c.want)
		}
	}
}

func TestSanitizeTitleTruncatesAt100Runes(t *testing.T) {
	long := strings.Repeat("界", 150)
	if got := sanitizeTitle(long); len([]rune(got)) != 100 {
		t.Errorf("expected 100 runes, got %d", len([]rune(got)))
	}
}

// --- resolveFinalName ---

func TestResolveFinalName(t *testing.T) {
	tests := []struct {
		name, custom, title, chosen, wantBase, wantExt string
	}{
		{"custom wins", "My Clip", "Some Video", "/tmp/x.mp4", "My Clip", ".mp4"},
		{"custom strips its own ext", "My.Clip.mp4", "Some", "/tmp/x.mp4", "My.Clip", ".mp4"},
		{"title fallback", "", "Nice Title", "/tmp/x.mp4", "Nice Title", ".mp4"},
		{"basename fallback", "", "", "/tmp/video.mp4", "video", ".mp4"},
		{"custom with illegal chars sanitized", `a/b\c`, "Some", "/tmp/x.mp3", "abc", ".mp3"},
	}
	for _, tt := range tests {
		base, ext := resolveFinalName(tt.custom, tt.title, tt.chosen)
		if base != tt.wantBase || ext != tt.wantExt {
			t.Errorf("%s: resolveFinalName(%q,%q,%q) = (%q,%q), want (%q,%q)",
				tt.name, tt.custom, tt.title, tt.chosen, base, ext, tt.wantBase, tt.wantExt)
		}
	}
}

// --- uniquePath ---

func TestUniquePath(t *testing.T) {
	dir := t.TempDir()
	// None exists yet.
	if p := uniquePath(dir, "clip", ".mp4"); p != filepath.Join(dir, "clip.mp4") {
		t.Errorf("uniquePath fresh = %q", p)
	}
	mustWrite(t, filepath.Join(dir, "clip.mp4"), "a")
	if p := uniquePath(dir, "clip", ".mp4"); p != filepath.Join(dir, "clip (2).mp4") {
		t.Errorf("uniquePath first collision = %q", p)
	}
	mustWrite(t, filepath.Join(dir, "clip (2).mp4"), "b")
	if p := uniquePath(dir, "clip", ".mp4"); p != filepath.Join(dir, "clip (3).mp4") {
		t.Errorf("uniquePath second collision = %q", p)
	}
}

func mustWrite(t *testing.T, path, content string) {
	t.Helper()
	if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
		t.Fatalf("write %s: %v", path, err)
	}
}

// --- pickFile ---

func TestPickFile(t *testing.T) {
	files := []string{"/d/job0.mp4", "/d/job0.webm", "/d/job0.part"}
	if got := pickFile(files, "video"); got != "/d/job0.mp4" {
		t.Errorf("pickFile video = %q", got)
	}

	audio := []string{"/d/job0.m4a", "/d/job0.mp3", "/d/job0.webm"}
	if got := pickFile(audio, "audio"); got != "/d/job0.mp3" {
		t.Errorf("pickFile audio = %q", got)
	}

	// No matching extension → first file.
	if got := pickFile([]string{"/d/a.webm", "/d/b.m4a"}, "video"); got != "/d/a.webm" {
		t.Errorf("pickFile fallback = %q", got)
	}
}

// --- parseDur / durString / sectionSpec / trimFloat ---

func TestParseDur(t *testing.T) {
	cases := []struct {
		in   string
		want float64
		ok   bool
	}{
		{"", 0, true},
		{"  ", 0, true},
		{"90", 90, true},
		{"1:30", 90, true},
		{"1:30.5", 90.5, true},
		{"00:01:30", 90, true},
		{"0:0:90", 90, true},
		{"abc", 0, false},
		{"1:x", 0, false},
	}
	for _, c := range cases {
		got, err := parseDur(c.in)
		if c.ok && err != nil {
			t.Errorf("parseDur(%q) error: %v", c.in, err)
		}
		if !c.ok && err == nil {
			t.Errorf("parseDur(%q) expected error", c.in)
		}
		if c.ok && got != c.want {
			t.Errorf("parseDur(%q) = %v, want %v", c.in, got, c.want)
		}
	}
}

func TestDurString(t *testing.T) {
	cases := []struct {
		in, want string
	}{
		{"", ""},
		{"   ", ""},
		{"90", "90"},
		{"1:30", "90"},
		{"1:30.5", "90.5"},
		{"garbage", ""},
	}
	for _, c := range cases {
		if got := durString(c.in); got != c.want {
			t.Errorf("durString(%q) = %q, want %q", c.in, got, c.want)
		}
	}
}

func TestSectionSpec(t *testing.T) {
	cases := []struct {
		start, end, want string
	}{
		{"", "", ""},
		{"90", "120", "*90-120"},
		{"1:30", "", "*90-"},
		{"", "60.5", "*-60.5"},
		{"bad", "", ""},
	}
	for _, c := range cases {
		if got := sectionSpec(c.start, c.end); got != c.want {
			t.Errorf("sectionSpec(%q,%q) = %q, want %q", c.start, c.end, got, c.want)
		}
	}
}

func TestTrimFloat(t *testing.T) {
	if got := trimFloat(90.5); got != "90.5" {
		t.Errorf("trimFloat(90.5) = %q", got)
	}
	if got := trimFloat(90); got != "90" {
		t.Errorf("trimFloat(90) = %q", got)
	}
}

// --- cmdError ---

func TestCmdError(t *testing.T) {
	sentinel := errors.New("boom")
	if got := cmdError("", sentinel); got != "boom" {
		t.Errorf("cmdError empty stderr = %q, want boom", got)
	}
	stderr := "  line one\nERROR: something bad\n"
	if got := cmdError(stderr, sentinel); got != "ERROR: something bad" {
		t.Errorf("cmdError = %q, want last line", got)
	}
}

// --- parseYtdlpJSON ---

func TestParseYtdlpJSON(t *testing.T) {
	// First valid line wins, blank/whitespace lines skipped.
	out := "\n  \n{\"title\":\"a\"}\n{\"title\":\"b\"}\n"
	raw, err := parseYtdlpJSON([]byte(out))
	if err != nil {
		t.Fatalf("parseYtdlpJSON error: %v", err)
	}
	var m map[string]string
	if err := json.Unmarshal(raw, &m); err != nil || m["title"] != "a" {
		t.Errorf("expected first entry title=a, got %v (err %v)", m, err)
	}

	if _, err := parseYtdlpJSON([]byte("\n  \n")); err == nil {
		t.Error("expected error on empty output")
	}
}

// --- scanNewlines (the \r/\n progress splitter) ---

func TestScanNewlines(t *testing.T) {
	feed := func(data string) []string {
		var toks []string
		sc := bufio.NewScanner(strings.NewReader(data))
		sc.Buffer(make([]byte, 64*1024), 1024*1024)
		sc.Split(scanNewlines)
		for sc.Scan() {
			toks = append(toks, sc.Text())
		}
		if err := sc.Err(); err != nil {
			t.Fatalf("scanner error: %v", err)
		}
		return toks
	}

	// LF-separated.
	if got := feed("[download]  10%\n[download]  20%\n"); !reflect.DeepEqual(got, []string{"[download]  10%", "[download]  20%"}) {
		t.Errorf("LF split = %q", got)
	}

	// CR-separated in-place rewrite (yt-dlp progress bar) plus a final LF.
	in := "[download] 10%\r[download] 20%\r[download] 30%\r[download] 100%\n"
	if got := feed(in); len(got) != 4 || got[2] != "[download] 30%" {
		t.Errorf("CR split = %q", got)
	}

	// CRLF.
	if got := feed("a\r\nb\r\n"); !reflect.DeepEqual(got, []string{"a", "b"}) {
		t.Errorf("CRLF split = %q", got)
	}

	// Empty input.
	if got := feed(""); len(got) != 0 {
		t.Errorf("empty split = %q", got)
	}
}

func TestScanNewlinesNeedsMoreData(t *testing.T) {
	// No delimiter yet and not atEOF → must request more data (advance 0, nil err).
	adv, tok, err := scanNewlines([]byte("partial"), false)
	if err != nil || adv != 0 || tok != nil {
		t.Errorf("partial input = advance %d tok %q err %v, want 0 nil nil", adv, tok, err)
	}
	// atEOF with remaining data returns it wholesale.
	adv, tok, err = scanNewlines([]byte("final-appended"), true)
	if err != nil || tok == nil || string(tok) != "final-appended" {
		t.Errorf("atEOF input = advance %d tok %q err %v", adv, tok, err)
	}
}

// --- secFromTime ---

func TestSecFromTime(t *testing.T) {
	if got := secFromTime("00", "00", "03.01"); got != 3.01 {
		t.Errorf("secFromTime(00:00:03.01) = %v", got)
	}
	if got := secFromTime("01", "30", "00"); got != 5400 {
		t.Errorf("secFromTime(01:30:00) = %v", got)
	}
}

// --- withCORS ---

func TestWithCORS(t *testing.T) {
	h := withCORS(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	rr := httptest.NewRecorder()
	h.ServeHTTP(rr, httptest.NewRequest(http.MethodGet, "/", nil))
	if got := rr.Header().Get("Access-Control-Allow-Origin"); got != "*" {
		t.Errorf("Origin header = %q", got)
	}
	if got := rr.Header().Get("Access-Control-Allow-Methods"); got != "GET, POST, OPTIONS" {
		t.Errorf("Methods header = %q", got)
	}

	// Preflight OPTIONS must short-circuit with 204 and no body.
	rr = httptest.NewRecorder()
	h.ServeHTTP(rr, httptest.NewRequest(http.MethodOptions, "/api/download", nil))
	if rr.Code != http.StatusNoContent {
		t.Errorf("OPTIONS status = %d, want 204", rr.Code)
	}
	if rr.Body.Len() != 0 {
		t.Errorf("OPTIONS had body: %q", rr.Body.String())
	}
}

// --- handlers (no network; validation paths only) ---

func TestHandleIndex(t *testing.T) {
	rr := httptest.NewRecorder()
	handleIndex(rr, httptest.NewRequest(http.MethodGet, "/", nil))
	if rr.Code != http.StatusOK {
		t.Fatalf("status = %d", rr.Code)
	}
	if !strings.Contains(rr.Body.String(), "ReClip") {
		t.Errorf("index body missing brand")
	}
}

func TestHandleInfoValidation(t *testing.T) {
	// Invalid JSON body.
	rr := httptest.NewRecorder()
	handleInfo(rr, httptest.NewRequest(http.MethodPost, "/api/info", strings.NewReader("not json")))
	if rr.Code != http.StatusBadRequest {
		t.Errorf("invalid JSON status = %d, want 400", rr.Code)
	}

	// Empty URL.
	rr = httptest.NewRecorder()
	body := strings.NewReader(`{"url": "   "}`)
	handleInfo(rr, httptest.NewRequest(http.MethodPost, "/api/info", body))
	if rr.Code != http.StatusBadRequest {
		t.Errorf("empty URL status = %d, want 400", rr.Code)
	}
}

func TestHandleDownloadValidation(t *testing.T) {
	// Missing URL must 400 before any yt-dlp invocation.
	rr := httptest.NewRecorder()
	handleDownload(rr, httptest.NewRequest(http.MethodPost, "/api/download", strings.NewReader(`{"format":"video"}`)))
	if rr.Code != http.StatusBadRequest {
		t.Errorf("missing URL status = %d, want 400", rr.Code)
	}
}

func TestHandleJobsEmpty(t *testing.T) {
	// Ensure a clean slate produced by other tests doesn't break this.
	rr := httptest.NewRecorder()
	handleJobs(rr, httptest.NewRequest(http.MethodGet, "/api/jobs", nil))
	if rr.Code != http.StatusOK {
		t.Fatalf("status = %d", rr.Code)
	}
	var resp struct {
		Jobs []any `json:"jobs"`
	}
	if err := json.Unmarshal(rr.Body.Bytes(), &resp); err != nil {
		t.Fatalf("jobs response not JSON: %v", err)
	}
}

// --- newJobID ---

func TestNewJobID(t *testing.T) {
	ids := map[string]bool{}
	for i := 0; i < 100; i++ {
		id := newJobID()
		if id == "" {
			t.Fatal("empty job id")
		}
		if ids[id] {
			t.Fatalf("duplicate job id %q", id)
		}
		ids[id] = true
	}
}

// --- progress reporting ---

func TestLineProgressUsesFFmpegReadPosition(t *testing.T) {
	// A 300s clip whose ffmpeg is 2:30 in is genuinely at 50%.
	line := "frame= 3600 fps=60 q=28.0 size=    1024kB time=00:02:30.00 bitrate=1024.0kbits/s speed=2x"
	if got := lineProgress(line, 300, 0); math.Abs(got-50) > 0.5 {
		t.Errorf("lineProgress = %v, want 50", got)
	}
	// Unknown total length → no time-based signal at all.
	if got := lineProgress(line, 0, 0); got != -1 {
		t.Errorf("lineProgress without total = %v, want -1", got)
	}
	// Past the end clamps to 100.
	if got := lineProgress("time=00:10:00.00 bitrate=1.0kbits/s", 300, 0); got != 100 {
		t.Errorf("lineProgress past end = %v, want 100", got)
	}
}

func TestLineProgressUsesYtdlpPercentage(t *testing.T) {
	line := "[download]  12.5% of ~8.00MiB at    1.00MiB/s ETA 00:07"
	if got := lineProgress(line, 0, 10); math.Abs(got-12.5) > 0.01 {
		t.Errorf("lineProgress = %v, want 12.5", got)
	}
	// Whichever source is further along wins.
	if got := lineProgress("[download]  12.5% ... ETA 00:07", 100, 10); got != 12.5 {
		t.Errorf("lineProgress = %v, want 12.5", got)
	}
}

func TestLineProgressETAFallback(t *testing.T) {
	// Neither percentage nor read position: elapsed / (elapsed + remaining).
	want := 10.0 / (10.0 + 11.0) * 100
	if got := lineProgress("[download] Downloading item 1 of 2 ETA 00:10", 0, 10); math.Abs(got-want) > 0.01 {
		t.Errorf("lineProgress = %v, want %v", got, want)
	}
	if got := lineProgress("Unrelated line without any numbers", 0, 10); got != -1 {
		t.Errorf("lineProgress = %v, want -1", got)
	}
}

// End-to-end: a stand-in yt-dlp that only emits ffmpeg read positions must
// still drive the bar from 0 to 100 (this is the excerpt/merge case, where
// yt-dlp prints no "[download] N%" at all).
func TestRunDownloadProgressFromReadPosition(t *testing.T) {
	dir := t.TempDir()
	script := filepath.Join(dir, "fake-yt-dlp.sh")
	body := `#!/bin/sh
out=""
prev=""
for a in "$@"; do
  if [ "$prev" = "-o" ]; then out=$a; fi
  prev=$a
done
out=$(printf '%s' "$out" | sed 's/%(ext)s/mp4/')
printf '[download] Destination: %s\n' "$out" >&2
printf 'frame=  100 fps=25 q=28.0 time=00:00:06.00 bitrate=100.0kbits/s speed=1x\r' >&2
printf 'frame= 1200 fps=25 q=28.0 time=00:00:30.00 bitrate=100.0kbits/s speed=1x\r' >&2
printf 'frame= 3000 fps=25 q=28.0 time=00:01:00.00 bitrate=100.0kbits/s speed=1x\r' >&2
: > "$out"
exit 0
`
	if err := os.WriteFile(script, []byte(body), 0o755); err != nil {
		t.Fatal(err)
	}

	oldYtdlp, oldDir := getYtdlpPath(), getDownloadDir()
	settingsMu.Lock()
	ytdlpPath, downloadDir = script, dir
	settingsMu.Unlock()
	defer func() {
		settingsMu.Lock()
		ytdlpPath, downloadDir = oldYtdlp, oldDir
		settingsMu.Unlock()
	}()

	j := &job{id: "progjob", status: "downloading", created: time.Now(), duration: 120}
	runDownload(j, "https://example.com/watch?v=x", "video", "", "", "", "")

	if j.status != "done" {
		t.Fatalf("status = %q (%v), want done", j.status, j.error)
	}
	if j.progress != 100 {
		t.Errorf("final progress = %v, want 100", j.progress)
	}
	if j.filename != "progjob.mp4" {
		t.Errorf("filename = %q, want progjob.mp4", j.filename)
	}

	// Same stderr, scored directly: 6s/30s/60s read positions over a 120s clip.
	stderrOut := strings.Join([]string{
		"frame=  100 fps=25 q=28.0 time=00:00:06.00 bitrate=100.0kbits/s speed=1x\r",
		"frame= 1200 fps=25 q=28.0 time=00:00:30.00 bitrate=100.0kbits/s speed=1x\r",
		"frame= 3000 fps=25 q=28.0 time=00:01:00.00 bitrate=100.0kbits/s speed=1x\r",
	}, "")
	var seen []float64
	pumpStderr(strings.NewReader(stderrOut), 120, func(p float64) { seen = append(seen, p) })
	want := []float64{5, 25, 50}
	if len(seen) != len(want) {
		t.Fatalf("progress sequence = %v, want %v", seen, want)
	}
	for i := range want {
		if math.Abs(seen[i]-want[i]) > 0.5 {
			t.Errorf("progress[%d] = %v, want %v (full: %v)", i, seen[i], want[i], seen)
		}
	}
}

func containsNear(vals []float64, want, tol float64) bool {
	for _, v := range vals {
		if math.Abs(v-want) <= tol {
			return true
		}
	}
	return false
}

// --- SSE ---

func TestSSEClientDeliversNewestSnapshot(t *testing.T) {
	c := newSSEClient()
	c.deliver([]byte("first"))
	c.deliver([]byte("second")) // overwrites: the last state must never be lost
	if got := string(c.take()); got != "second" {
		t.Errorf("take() = %q, want %q", got, "second")
	}
	if got := c.take(); got != nil {
		t.Errorf("take() after drain = %q, want nil", got)
	}
	select {
	case <-c.wake: // first delivery signalled
	default:
		t.Fatal("deliver did not wake the writer")
	}
}

func TestSetJobProgressNeverGoesBackwards(t *testing.T) {
	j := &job{id: "p", progress: 40}
	setJobProgress(j, 10) // audio track of a merge restarting at 0%
	if j.progress != 40 {
		t.Errorf("progress = %v, want 40 (no backwards jump)", j.progress)
	}
	setJobProgress(j, 42)
	if j.progress != 42 {
		t.Errorf("progress = %v, want 42", j.progress)
	}
}

// The regression this guards: a finished download used to set status=done
// without pushing a snapshot, leaving the bar frozen at its last percentage.
func TestEventsStreamPushesFinalState(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(handleEvents))
	defer srv.Close()

	j := &job{id: "ssejob", status: "downloading", progress: 1, created: time.Now()}
	jobsMu.Lock()
	jobs[j.id] = j
	jobsMu.Unlock()
	defer func() {
		jobsMu.Lock()
		delete(jobs, j.id)
		jobsMu.Unlock()
	}()

	result := make(chan string, 1)
	go func() {
		resp, err := http.Get(srv.URL)
		if err != nil {
			result <- "get failed: " + err.Error()
			return
		}
		defer resp.Body.Close()
		sc := bufio.NewScanner(resp.Body)
		started := false
		for sc.Scan() {
			line := sc.Text()
			if !strings.HasPrefix(line, "data: ") {
				continue
			}
			var payload struct {
				Jobs []struct {
					ID       string  `json:"id"`
					Status   string  `json:"status"`
					Progress float64 `json:"progress"`
				} `json:"jobs"`
			}
			if err := json.Unmarshal([]byte(strings.TrimPrefix(line, "data: ")), &payload); err != nil {
				continue
			}
			for _, e := range payload.Jobs {
				if e.ID == j.id && e.Status == "done" && e.Progress == 100 {
					result <- "done"
					return
				}
			}
			// Snapshot seen — the client is subscribed; now finish the job.
			if !started {
				started = true
				finishJob(j, "done", "", 100)
			}
		}
		result <- "stream ended without a done snapshot"
	}()

	select {
	case got := <-result:
		if got != "done" {
			t.Fatalf("SSE final state: %s", got)
		}
	case <-time.After(5 * time.Second):
		t.Fatal("timed out waiting for the final SSE snapshot")
	}
}

// --- black-box yt-dlp behaviour ---

// stubYtdlp installs script as the yt-dlp binary ReClip shells out to, points
// the download directory at the same temp dir, and restores everything after.
func stubYtdlp(t *testing.T, script string) string {
	t.Helper()
	dir := t.TempDir()
	path := filepath.Join(dir, "yt-dlp")
	if err := os.WriteFile(path, []byte(script), 0o755); err != nil {
		t.Fatal(err)
	}
	oldYtdlp, oldDir, oldRes, oldFF := getYtdlpPath(), getDownloadDir(), getResolution(), getFfmpegPath()
	settingsMu.Lock()
	ytdlpPath, downloadDir, ffmpegPath = path, dir, ""
	settingsMu.Unlock()
	t.Cleanup(func() {
		settingsMu.Lock()
		ytdlpPath, downloadDir, resolution, ffmpegPath = oldYtdlp, oldDir, oldRes, oldFF
		settingsMu.Unlock()
	})
	return dir
}

func setResolution(t *testing.T, v string) {
	t.Helper()
	settingsMu.Lock()
	resolution = v
	settingsMu.Unlock()
	t.Cleanup(func() { setResolutionRaw("") })
}

func setResolutionRaw(v string) {
	settingsMu.Lock()
	resolution = v
	settingsMu.Unlock()
}

// infoStub answers `-j` like yt-dlp would: one JSON object with four video
// streams, sharpest first.
const infoStub = `#!/bin/sh
printf '{"title":"Test Video","duration":60,"uploader":"Someone","thumbnail":"https://example.com/t.jpg","formats":[{"format_id":"f2160","height":2160,"vcodec":"avc1","tbr":20},{"format_id":"f1080","height":1080,"vcodec":"avc1","tbr":10},{"format_id":"f720","height":720,"vcodec":"avc1","tbr":6},{"format_id":"f480","height":480,"vcodec":"avc1","tbr":3}]}\n'
`

func getInfo(t *testing.T, url string) map[string]any {
	t.Helper()
	rr := httptest.NewRecorder()
	body := strings.NewReader(`{"url":"` + url + `"}`)
	handleInfo(rr, httptest.NewRequest(http.MethodPost, "/api/info", body))
	if rr.Code != http.StatusOK {
		t.Fatalf("/api/info status = %d, body %s", rr.Code, rr.Body.String())
	}
	var got map[string]any
	if err := json.Unmarshal(rr.Body.Bytes(), &got); err != nil {
		t.Fatalf("/api/info not JSON: %v", err)
	}
	return got
}

func TestHandleInfoSelectsDefaultResolution(t *testing.T) {
	stubYtdlp(t, infoStub)

	cases := []struct{ pref, want string }{
		{"1080p", "f1080"},
		{"720p", "f720"},
		{"480p", "f480"},
		{"360p", "f480"}, // nothing at or below → gentlest available
		{"", "f2160"},    // no preference → sharpest
	}
	for _, c := range cases {
		setResolution(t, c.pref)
		got := getInfo(t, "https://example.com/watch?v=abc")
		if id, _ := got["default_id"].(string); id != c.want {
			t.Errorf("resolution %q: default_id = %q, want %q", c.pref, id, c.want)
		}
		if n := len(got["formats"].([]any)); n != 4 {
			t.Errorf("formats len = %d, want 4", n)
		}
	}
}

func TestHandleInfoWithoutFormatsHasNoDefault(t *testing.T) {
	stubYtdlp(t, `#!/bin/sh
printf '{"title":"Audio only","formats":[]}\n'
`)
	setResolution(t, "720p")
	if got := getInfo(t, "https://example.com/watch?v=abc")["default_id"]; got != "" {
		t.Errorf("default_id = %v, want empty", got)
	}
}

// Several downloads at once: each one must reach done on its own, which is what
// regressed into "only the last card finishes, the rest sit at 1%".
func TestConcurrentDownloadsEachFinishIndependently(t *testing.T) {
	stubYtdlp(t, `#!/bin/sh
out=""
prev=""
for a in "$@"; do
  if [ "$prev" = "-o" ]; then out=$a; fi
  prev=$a
done
out=$(printf '%s' "$out" | sed 's/%(ext)s/mp4/')
i=1
while [ "$i" -le 9 ]; do
  sec=$((i*6))
  printf 'frame=%s fps=25 q=28.0 time=00:00:%02d.00 bitrate=100.0kbits/s speed=1x\r' "$i" "$sec" >&2
  sleep 0.08
  i=$((i+1))
done
: > "$out"
exit 0
`)
	const numJobs = 4
	ids := make([]string, numJobs)
	wanted := map[string]bool{}
	for i := range ids {
		rr := httptest.NewRecorder()
		body := strings.NewReader(fmt.Sprintf(`{"url":"https://example.com/v%d","format":"video","duration":60}`, i))
		handleDownload(rr, httptest.NewRequest(http.MethodPost, "/api/download", body))
		if rr.Code != http.StatusOK {
			t.Fatalf("/api/download status = %d: %s", rr.Code, rr.Body.String())
		}
		var res struct {
			JobID string `json:"job_id"`
		}
		if err := json.Unmarshal(rr.Body.Bytes(), &res); err != nil || res.JobID == "" {
			t.Fatalf("no job id in %s", rr.Body.String())
		}
		ids[i] = res.JobID
		wanted[res.JobID] = true
	}
	t.Cleanup(func() {
		jobsMu.Lock()
		for id := range wanted {
			delete(jobs, id)
		}
		jobsMu.Unlock()
	})

	// Watch exactly what a subscribed page would receive.
	c := newSSEClient()
	sseMu.Lock()
	sseClients[c] = struct{}{}
	sseMu.Unlock()
	defer func() {
		sseMu.Lock()
		delete(sseClients, c)
		sseMu.Unlock()
	}()

	type state struct {
		status   string
		progress float64
		filename string
	}
	final := map[string]state{}
	moving := map[string]bool{} // saw progress strictly between 0 and 100

	deadline := time.Now().Add(20 * time.Second)
	for time.Now().Before(deadline) {
		for {
			p := c.take()
			if p == nil {
				break
			}
			var payload struct {
				Jobs []struct {
					ID       string  `json:"id"`
					Status   string  `json:"status"`
					Progress float64 `json:"progress"`
					Filename string  `json:"filename"`
				} `json:"jobs"`
			}
			if err := json.Unmarshal(p, &payload); err != nil {
				continue
			}
			for _, e := range payload.Jobs {
				if !wanted[e.ID] {
					continue
				}
				final[e.ID] = state{e.Status, e.Progress, e.Filename}
				if e.Progress > 0 && e.Progress < 100 {
					moving[e.ID] = true
				}
			}
		}
		doneCount := 0
		for _, id := range ids {
			if final[id].status == "done" {
				doneCount++
			}
		}
		if doneCount == numJobs {
			break
		}
		time.Sleep(10 * time.Millisecond)
	}

	names := map[string]bool{}
	for _, id := range ids {
		st := final[id]
		if st.status != "done" {
			t.Errorf("job %s status = %q (progress %v), want done", id, st.status, st.progress)
			continue
		}
		if st.progress != 100 {
			t.Errorf("job %s progress = %v, want 100", id, st.progress)
		}
		if st.filename == "" {
			t.Errorf("job %s has no filename", id)
		}
		if names[st.filename] {
			t.Errorf("duplicate filename %q", st.filename)
		}
		names[st.filename] = true
		if !moving[id] {
			t.Errorf("job %s never reported intermediate progress", id)
		}
	}
}

// A yt-dlp failure must surface as a job error, not a silent hang.
func TestDownloadSurfacesYtdlpError(t *testing.T) {
	stubYtdlp(t, `#!/bin/sh
printf 'WARNING: falling back to generic information extractor\n' >&2
printf 'ERROR: Video unavailable\n' >&2
exit 1
`)
	rr := httptest.NewRecorder()
	body := strings.NewReader(`{"url":"https://example.com/gone","format":"video"}`)
	handleDownload(rr, httptest.NewRequest(http.MethodPost, "/api/download", body))
	var res struct {
		JobID string `json:"job_id"`
	}
	if err := json.Unmarshal(rr.Body.Bytes(), &res); err != nil || res.JobID == "" {
		t.Fatalf("no job id in %s", rr.Body.String())
	}
	defer func() {
		jobsMu.Lock()
		delete(jobs, res.JobID)
		jobsMu.Unlock()
	}()

	j, ok := getJob(res.JobID)
	if !ok {
		t.Fatal("job missing")
	}
	deadline := time.Now().Add(10 * time.Second)
	for time.Now().Before(deadline) {
		jobsMu.RLock()
		status, msg := j.status, j.error
		jobsMu.RUnlock()
		if status != "downloading" {
			if status != "error" {
				t.Fatalf("status = %q, want error", status)
			}
			if msg != "ERROR: Video unavailable" {
				t.Fatalf("error = %q, want the last stderr line %q", msg, "ERROR: Video unavailable")
			}
			return
		}
		time.Sleep(10 * time.Millisecond)
	}
	t.Fatal("job never left the downloading state")
}

// --- default resolution setting ---

func TestDefaultFormatIDCapsAtPreferredHeight(t *testing.T) {
	formats := []formatInfo{
		{ID: "f2160", Height: 2160},
		{ID: "f1080", Height: 1080},
		{ID: "f720", Height: 720},
		{ID: "f480", Height: 480},
	}
	cases := []struct {
		pref int
		want string
	}{
		{1080, "f1080"},
		{720, "f720"},
		{480, "f480"},
		{360, "f480"},
		{0, "f2160"},
	}
	for _, c := range cases {
		if got := defaultFormatID(formats, c.pref); got != c.want {
			t.Errorf("defaultFormatID(pref=%d) = %q, want %q", c.pref, got, c.want)
		}
	}
	if got := defaultFormatID(nil, 1080); got != "" {
		t.Errorf("defaultFormatID(no formats) = %q, want empty", got)
	}
}

func TestHandleSettingsPersistsResolution(t *testing.T) {
	oldFile, oldRes := settingsFile, getResolution()
	settingsFile = filepath.Join(t.TempDir(), "settings.json")
	t.Cleanup(func() {
		settingsFile = oldFile
		setResolutionRaw(oldRes)
	})

	post := func(v string) *httptest.ResponseRecorder {
		rr := httptest.NewRecorder()
		body := strings.NewReader(fmt.Sprintf(`{"resolution":%q}`, v))
		handleSettings(rr, httptest.NewRequest(http.MethodPost, "/api/settings", body))
		return rr
	}

	rr := post("480p")
	if rr.Code != http.StatusOK {
		t.Fatalf("POST valid resolution status = %d: %s", rr.Code, rr.Body.String())
	}
	var got map[string]any
	if err := json.Unmarshal(rr.Body.Bytes(), &got); err != nil {
		t.Fatalf("settings response not JSON: %v", err)
	}
	if got["resolution"] != "480p" {
		t.Errorf("response resolution = %v, want 480p", got["resolution"])
	}
	if getResolution() != "480p" {
		t.Errorf("active resolution = %q, want 480p", getResolution())
	}
	saved, err := loadSettings()
	if err != nil {
		t.Fatalf("loadSettings: %v", err)
	}
	if saved.Resolution != "480p" {
		t.Errorf("persisted resolution = %q, want 480p", saved.Resolution)
	}

	bad := post("4K")
	if bad.Code != http.StatusBadRequest {
		t.Fatalf("POST bad resolution status = %d, want 400", bad.Code)
	}
	if getResolution() != "480p" {
		t.Errorf("resolution changed by a rejected value: %q", getResolution())
	}

	get := httptest.NewRecorder()
	handleSettings(get, httptest.NewRequest(http.MethodGet, "/api/settings", nil))
	var view map[string]any
	if err := json.Unmarshal(get.Body.Bytes(), &view); err != nil {
		t.Fatalf("GET settings not JSON: %v", err)
	}
	if view["resolution"] != "480p" {
		t.Errorf("GET resolution = %v, want 480p", view["resolution"])
	}
	if view["dir"] == nil {
		t.Error("GET settings is missing dir")
	}
}

// --- ytdlpAsset ---

func TestYtdlpAsset(t *testing.T) {
	asset, ok := ytdlpAsset()
	if !ok {
		t.Logf("no prebuilt asset for %s/%s", runtime.GOOS, runtime.GOARCH)
	}
	if asset != "" && !strings.Contains(asset, "yt-dlp") {
		t.Errorf("unexpected asset %q", asset)
	}
	_ = fmt.Sprint(asset)
}

// --- MP4 finish pass: moov placement + HEVC ---

// box builds one MP4 atom: 4-byte size, 4-byte type, payload.
func box(typ string, payload []byte) []byte {
	b := make([]byte, 8, 8+len(payload))
	binary.BigEndian.PutUint32(b[0:4], uint32(8+len(payload)))
	copy(b[4:8], typ)
	return append(b, payload...)
}

func TestMoovBeforeMdat(t *testing.T) {
	ftyp := box("ftyp", []byte("isom\x00\x00\x02\x00"))
	moov := box("moov", []byte("index"))
	mdat := box("mdat", []byte("payloadpayload"))

	tests := []struct {
		name  string
		data  []byte
		first bool
	}{
		{"moov first", concat(ftyp, moov, mdat), true},
		{"mdat first", concat(ftyp, mdat, moov), false},
		{"no moov", concat(ftyp, mdat), false},
		{"empty file", nil, false},
		{"truncated header", []byte{0, 0, 0}, false},
	}
	for _, tt := range tests {
		p := filepath.Join(t.TempDir(), "a.mp4")
		if err := os.WriteFile(p, tt.data, 0o644); err != nil {
			t.Fatal(err)
		}
		if got := moovBeforeMdat(p); got != tt.first {
			t.Errorf("%s: moovBeforeMdat = %v, want %v", tt.name, got, tt.first)
		}
	}
	if moovBeforeMdat(filepath.Join(t.TempDir(), "missing.mp4")) {
		t.Error("missing file should not report faststart")
	}
}

func TestMoovBeforeMdat64BitSize(t *testing.T) {
	// 64-bit size form: size==1, then a 64-bit largesize after the type.
	moov := make([]byte, 16, 24)
	binary.BigEndian.PutUint32(moov[0:4], 1)
	copy(moov[4:8], "moov")
	binary.BigEndian.PutUint64(moov[8:16], 24)
	moov = append(moov, []byte("XXXX")...)
	p := filepath.Join(t.TempDir(), "big.mp4")
	if err := os.WriteFile(p, concat(moov, box("mdat", []byte("data"))), 0o644); err != nil {
		t.Fatal(err)
	}
	if !moovBeforeMdat(p) {
		t.Error("64-bit moov box not detected as leading index")
	}
}

func concat(parts ...[]byte) []byte {
	var out []byte
	for _, p := range parts {
		out = append(out, p...)
	}
	return out
}

func TestPostprocessArgs(t *testing.T) {
	copyArgs := strings.Join(postprocessArgs("in.mp4", "out.mp4", false), " ")
	for _, want := range []string{"-c copy", "-movflags +faststart", "-f mp4 out.mp4"} {
		if !strings.Contains(copyArgs, want) {
			t.Errorf("copy args missing %q: %s", want, copyArgs)
		}
	}
	if strings.Contains(copyArgs, "libx265") {
		t.Errorf("copy args must not re-encode: %s", copyArgs)
	}

	hevcArgs := strings.Join(postprocessArgs("in.mp4", "out.mp4", true), " ")
	for _, want := range []string{"-c:v libx265", "-crf 26", "-tag:v hvc1", "-movflags +faststart", "-c:a aac"} {
		if !strings.Contains(hevcArgs, want) {
			t.Errorf("hevc args missing %q: %s", want, hevcArgs)
		}
	}
}

func TestValidCodec(t *testing.T) {
	for _, s := range []string{"", codecCopy, codecH265} {
		if !validCodec(s) {
			t.Errorf("validCodec(%q) = false, want true", s)
		}
	}
	for _, s := range []string{"h264", "av1", "H265", "copy "} {
		if validCodec(s) {
			t.Errorf("validCodec(%q) = true, want false", s)
		}
	}
}

func TestPostDeadline(t *testing.T) {
	if got := postDeadline(0, true); got != postTimeout {
		t.Errorf("postDeadline(0, hevc) = %v, want floor %v", got, postTimeout)
	}
	if got := postDeadline(3600, true); got < time.Hour {
		t.Errorf("postDeadline(1h, hevc) = %v, want >= 1h", got)
	}
	if got := postDeadline(3600, false); got != postTimeout {
		t.Errorf("postDeadline(1h, copy) = %v, want floor %v", got, postTimeout)
	}
}

// TestRunPostprocessEndToEnd drives real ffmpeg: a source MP4 without faststart
// must come back with moov in front, and the H.265 mode must actually re-encode
// to hvc1. Skipped when ffmpeg (or its x265 encoder) is unavailable.
func TestRunPostprocessEndToEnd(t *testing.T) {
	ff, err := exec.LookPath("ffmpeg")
	if err != nil {
		t.Skip("ffmpeg not installed")
	}
	prevFfmpeg := ffmpegPath
	ffmpegPath = ff
	defer func() { ffmpegPath = prevFfmpeg }()

	dir := t.TempDir()
	src := filepath.Join(dir, "src.mp4")
	if out, err := exec.Command(ff, "-y", "-nostdin", "-hide_banner",
		"-f", "lavfi", "-i", "testsrc2=size=160x120:rate=10:duration=1",
		"-c:v", "mpeg4", "-q:v", "5", src).CombinedOutput(); err != nil {
		t.Skipf("cannot generate fixture: %v (%s)", err, out)
	}
	if moovBeforeMdat(src) {
		t.Fatal("fixture unexpectedly already faststart")
	}

	// copy: remux only, moov moves to the front, codec untouched.
	cp := filepath.Join(dir, "copy.mp4")
	if err := os.Rename(src, cp); err != nil {
		t.Fatal(err)
	}
	if _, err := runPostprocess(&job{id: "t1", codec: codecCopy}, cp, 1); err != nil {
		t.Fatalf("copy postprocess: %v", err)
	}
	if !moovBeforeMdat(cp) {
		t.Error("copy postprocess left moov at the tail")
	}

	// h265: real re-encode, tagged hvc1 so Apple players accept it.
	if !ffmpegHasEncoder(ff, "libx265") {
		t.Skip("ffmpeg built without libx265")
	}
	hp := filepath.Join(dir, "hevc.mp4")
	if err := os.Rename(cp, hp); err != nil {
		t.Fatal(err)
	}
	if _, err := runPostprocess(&job{id: "t2", codec: codecH265}, hp, 1); err != nil {
		t.Fatalf("hevc postprocess: %v", err)
	}
	if !moovBeforeMdat(hp) {
		t.Error("hevc postprocess left moov at the tail")
	}
	probe, err := exec.Command("ffprobe", "-v", "error", "-select_streams", "v:0",
		"-show_entries", "stream=codec_name,codec_tag_string", "-of", "csv=p=0", hp).Output()
	if err != nil {
		t.Skipf("ffprobe unavailable: %v", err)
	}
	got := strings.TrimSpace(string(probe))
	if !strings.Contains(got, "hevc") || !strings.Contains(got, "hvc1") {
		t.Errorf("stream = %q, want hevc + hvc1", got)
	}
}

func ffmpegHasEncoder(ff, name string) bool {
	out, err := exec.Command(ff, "-hide_banner", "-encoders").Output()
	return err == nil && bytes.Contains(out, []byte(name))
}

// --- settings: codec ---

func TestSettingsCodecRoundTrip(t *testing.T) {
	dir := t.TempDir()
	prevFile, prevCodec := settingsFile, codec
	settingsFile = filepath.Join(dir, "settings.json")
	defer func() { settingsFile, codec = prevFile, prevCodec }()

	codec = ""
	post := func(body string) *httptest.ResponseRecorder {
		w := httptest.NewRecorder()
		handleSettings(w, httptest.NewRequest(http.MethodPost, "/api/settings", strings.NewReader(body)))
		return w
	}

	if w := post(`{"codec":"h265"}`); w.Code != http.StatusOK {
		t.Fatalf("POST codec=h265 status = %d: %s", w.Code, w.Body)
	}
	if getCodec() != codecH265 {
		t.Errorf("codec = %q, want h265", getCodec())
	}
	saved, err := loadSettings()
	if err != nil {
		t.Fatalf("loadSettings: %v", err)
	}
	if saved.Codec != codecH265 {
		t.Errorf("persisted codec = %q, want h265", saved.Codec)
	}

	if w := post(`{"codec":"h264"}`); w.Code != http.StatusBadRequest {
		t.Fatalf("POST bad codec status = %d, want 400", w.Code)
	}
	if getCodec() != codecH265 {
		t.Errorf("codec changed by a rejected value: %q", getCodec())
	}
}

// TestProbeVideoCodecEndToEnd checks the ffprobe wrapper against real files.
func TestProbeVideoCodecEndToEnd(t *testing.T) {
	ff, err := exec.LookPath("ffmpeg")
	if err != nil {
		t.Skip("ffmpeg not installed")
	}
	prevFfmpeg := ffmpegPath
	ffmpegPath = ff
	defer func() { ffmpegPath = prevFfmpeg }()

	if ffprobePath() == "" {
		t.Skip("ffprobe not installed")
	}

	dir := t.TempDir()
	enc := func(name string, codecArgs ...string) string {
		p := filepath.Join(dir, name)
		args := []string{"-y", "-nostdin", "-hide_banner",
			"-f", "lavfi", "-i", "testsrc2=size=160x120:rate=10:duration=1"}
		args = append(args, codecArgs...)
		if out, err := exec.Command(ff, append(args, p)...).CombinedOutput(); err != nil {
			t.Skipf("cannot generate %s: %v (%s)", name, err, out)
		}
		return p
	}

	h264 := enc("h264.mp4", "-c:v", "libx264", "-preset", "ultrafast")
	if got := probeVideoCodec(h264); got != "h264" {
		t.Errorf("probeVideoCodec(h264) = %q, want h264", got)
	}
	if !ffmpegHasEncoder(ff, "libx265") {
		t.Skip("ffmpeg built without libx265")
	}
	hevc := enc("hevc.mp4", "-c:v", "libx265", "-crf", "10", "-tag:v", "hvc1")
	if got := probeVideoCodec(hevc); got != "hevc" {
		t.Errorf("probeVideoCodec(hevc) = %q, want hevc", got)
	}
	if got := probeVideoCodec(filepath.Join(dir, "missing.mp4")); got != "" {
		t.Errorf("probeVideoCodec(missing) = %q, want empty", got)
	}
}

// TestRunPostprocessSkipsReencodeForHEVC pins the "already HEVC" shortcut: an
// HEVC source asked to become HEVC must be remuxed, not re-encoded. A crf26
// re-encode of this crf10 fixture would shrink it dramatically, so a near
// unchanged file size is the proof that no encode ran.
func TestRunPostprocessSkipsReencodeForHEVC(t *testing.T) {
	ff, err := exec.LookPath("ffmpeg")
	if err != nil {
		t.Skip("ffmpeg not installed")
	}
	prevFfmpeg := ffmpegPath
	ffmpegPath = ff
	defer func() { ffmpegPath = prevFfmpeg }()
	if !ffmpegHasEncoder(ff, "libx265") || ffprobePath() == "" {
		t.Skip("needs libx265 + ffprobe")
	}

	src := filepath.Join(t.TempDir(), "hevc-src.mp4")
	if out, err := exec.Command(ff, "-y", "-nostdin", "-hide_banner",
		"-f", "lavfi", "-i", "testsrc2=size=320x240:rate=25:duration=2",
		"-c:v", "libx265", "-crf", "8", "-tag:v", "hvc1", src).CombinedOutput(); err != nil {
		t.Skipf("cannot generate fixture: %v (%s)", err, out)
	}
	before, err := os.Stat(src)
	if err != nil {
		t.Fatal(err)
	}
	if moovBeforeMdat(src) {
		t.Fatal("fixture unexpectedly already faststart")
	}

	if _, err := runPostprocess(&job{id: "t3", codec: codecH265}, src, 2); err != nil {
		t.Fatalf("postprocess: %v", err)
	}
	if !moovBeforeMdat(src) {
		t.Error("remux did not move moov to the front")
	}
	if got := probeVideoCodec(src); got != "hevc" {
		t.Errorf("codec = %q, want hevc", got)
	}
	after, err := os.Stat(src)
	if err != nil {
		t.Fatal(err)
	}
	if ratio := float64(after.Size()) / float64(before.Size()); ratio < 0.9 {
		t.Errorf("file shrank to %.0f%% of the source — the shortcut did not skip the encode", ratio*100)
	}
}
