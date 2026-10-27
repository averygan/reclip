// ReClip Companion — popup.
const DEFAULT_SERVER = 'http://127.0.0.1:8899';

const $ = (id) => document.getElementById(id);
let format = 'video';

function normalizeServer(s) {
  return String(s || DEFAULT_SERVER).trim().replace(/\/+$/, '');
}

async function loadServer() {
  const { server } = await chrome.storage.sync.get({ server: DEFAULT_SERVER });
  $('server').value = normalizeServer(server);
}

async function currentTabUrl() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const u = tab && tab.url;
  return u && /^https?:/i.test(u) ? u : '';
}

async function checkServer() {
  const dot = $('statusDot');
  dot.className = 'dot';
  try {
    const res = await fetch(normalizeServer($('server').value), { method: 'HEAD' });
    dot.className = 'dot ' + (res.ok ? 'ok' : 'bad');
  } catch {
    dot.className = 'dot bad';
  }
}

async function fetchVideos() {
  const server = normalizeServer($('server').value);
  const url = $('url').value.trim();
  if (!url) {
    $('msg').textContent = '请输入视频链接';
    return;
  }
  await chrome.storage.sync.set({ server });
  const formatArg = format !== 'video' ? format : undefined;
  // Reuse an already-open panel tab (background handles tab reuse).
  chrome.runtime.sendMessage({ type: 'openReClip', url, format: formatArg });
  window.close();
}

document.addEventListener('DOMContentLoaded', async () => {
  await loadServer();

  const tabUrl = await currentTabUrl();
  $('url').placeholder = tabUrl ? '留空则使用当前标签页' : '请输入视频链接';
  $('url').value = tabUrl;

  checkServer();
  $('server').addEventListener('change', checkServer);

  document.querySelectorAll('.pill').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.pill').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      format = btn.dataset.fmt;
    });
  });

  $('fetchBtn').addEventListener('click', fetchVideos);
  $('url').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') fetchVideos();
  });
});
