// ReClip Companion — background service worker.
// Right-click menu → open the local ReClip UI with the target URL pre-filled.

const DEFAULT_SERVER = 'http://127.0.0.1:8899';

async function getServer() {
  const { server } = await chrome.storage.sync.get({ server: DEFAULT_SERVER });
  return String(server || DEFAULT_SERVER).trim().replace(/\/+$/, '');
}

// Open the ReClip UI for a target URL. Reuses an already-open tab of this
// server if one exists (updates it to the fresh query + focuses it), instead of
// piling up new tabs on every open.
function hostPattern(server) {
  // Chrome match patterns forbid a port in the host, so strip it and match the
  // host on any port: `http://127.0.0.1:8899` -> `http://127.0.0.1/*`.
  // The port is filtered back in by sameOrigin — see openPanel.
  try {
    const u = new URL(server);
    return `${u.protocol}//${u.hostname}/*`;
  } catch {
    return server + '/*';
  }
}

// sameOrigin compares scheme + host + port. A host-only match is not enough:
// 127.0.0.1:8899 (ReClip) and 127.0.0.1:8898 (some other dashboard) share a
// hostname, and reusing that tab would navigate away — and destroy — an
// unrelated app's page. `URL.host` keeps an explicit port and drops a default
// one, so `http://x:80` and `http://x` compare equal.
function sameOrigin(tabUrl, server) {
  if (!tabUrl) return false;
  try {
    const a = new URL(tabUrl);
    const b = new URL(server);
    return a.protocol === b.protocol && a.host === b.host;
  } catch {
    return false;
  }
}

function openPanel(server, target) {
  return chrome.tabs.query({ url: hostPattern(server) }).then((tabs) => {
    // Only tabs on the exact same origin may be reused; anything else gets a
    // new tab instead of being navigated away from.
    const mine = tabs.filter((t) => sameOrigin(t.url, server));
    if (!mine.length) return chrome.tabs.create({ url: target });
    // Prefer a tab in the current focused window; otherwise reuse the first.
    const reuse = mine.find((t) => t.active) || mine[0];
    return chrome.tabs.update(reuse.id, { url: target, active: true })
      .then(() => chrome.windows.update(reuse.windowId, { focused: true }));
  });
}

function openReClip(url, format) {
  return getServer().then((server) => {
    const params = [];
    if (url) params.push(`url=${encodeURIComponent(url)}`);
    if (format) params.push(`format=${encodeURIComponent(format)}`);
    return openPanel(server, server + '/?' + params.join('&'));
  });
}

// Reused by the popup so the reuse logic lives in one place.
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.type === 'openReClip') {
    openReClip(msg.url, msg.format).then(() => sendResponse({ ok: true }));
    return true; // keep the message channel open for the async reply
  }
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'reclip-root',
      title: 'ReClip',
      contexts: ['link', 'page', 'video', 'audio'],
    });
    chrome.contextMenus.create({
      id: 'reclip-download',
      parentId: 'reclip-root',
      title: '用 ReClip 下载',
      contexts: ['link', 'page', 'video', 'audio'],
    });
    chrome.contextMenus.create({
      id: 'reclip-open',
      parentId: 'reclip-root',
      title: '打开 ReClip 面板',
      contexts: ['link', 'page', 'video', 'audio'],
    });
  });
});

chrome.contextMenus.onClicked.addListener((info) => {
  if (info.menuItemId === 'reclip-open') {
    openReClip('');
    return;
  }
  // Priority: link > media element > page.
  const target = info.linkUrl || info.srcUrl || info.pageUrl;
  if (!target || !/^https?:/i.test(target)) return;
  openReClip(target);
});
