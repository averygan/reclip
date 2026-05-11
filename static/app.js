let currentFormat = 'video';
let cardData = [];
let pollIntervals = {};

function setFormat(btn) {
  document.querySelectorAll('.pill').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  currentFormat = btn.dataset.format;
}

function parseUrls(text) {
  return [...new Set(text.split(/[\s,]+/).map(u => u.trim()).filter(u => u.startsWith('http')))];
}

function fmtDur(s) {
  if (!s) return '';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

function esc(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

function friendlyError(err) {
  if (!err) return 'Download failed';
  if (err.includes('Unsupported URL')) return 'This URL is not supported';
  if (err.includes('Video unavailable')) return 'Video is unavailable or private';
  if (err.includes('Private video')) return 'This video is private';
  if (err.includes('HTTP Error 403')) return 'Access denied by the platform';
  if (err.includes('HTTP Error 404')) return 'Video not found';
  if (err.includes('copyright')) return 'Video blocked due to copyright';
  if (err.includes('geo')) return 'Video not available in your region';
  if (err.includes('timed out') || err.includes('Timed out')) return 'Request timed out — try again';
  if (err.includes('network') || err.includes('Network')) return 'Network error — check your connection';
  if (err.includes('cancelled')) return 'Download cancelled by user';
  return err.length > 80 ? err.slice(0, 80) + '...' : err;
}

function fmtSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Load existing jobs and files on page load
async function loadExistingJobs() {
  try {
    const [jobsRes, filesRes] = await Promise.all([
      fetch('/api/jobs'),
      fetch('/api/files')
    ]);
    
    const jobs = await jobsRes.json();
    const files = await filesRes.json();
    
    // Display files in downloads section
    renderDownloads(files);
    
    // Restore job cards for active or recently completed jobs
    const container = document.getElementById('cards');
    
    jobs.forEach(job => {
      if (job.status === 'downloading' || job.status === 'done' || job.status === 'error') {
        const idx = cardData.length;
        cardData.push({
          jobId: job.job_id,
          url: job.url,
          title: job.title || 'Untitled',
          status: job.status,
          thumbnail: '',
          uploader: '',
          duration: null,
          progress: job.progress || 0,
          totalSize: job.total_size,
          filename: job.filename,
          error: job.error,
          selectedFormatId: null,
          formats: []
        });
        renderCard(idx);
        
        if (job.status === 'downloading') {
          pollCard(idx);
        }
      }
    });
  } catch (err) {
    console.error('Failed to load existing jobs:', err);
  }
}

function renderDownloads(files) {
  const section = document.getElementById('downloads-section');
  const list = document.getElementById('downloads-list');
  
  if (!files || files.length === 0) {
    section.style.display = 'none';
    return;
  }
  
  section.style.display = 'block';
  list.innerHTML = files.map(f => `
    <div class="download-item">
      <span class="name" title="${esc(f.name)}">${esc(f.name)}</span>
      <span class="size">${fmtSize(f.size)}</span>
    </div>
  `).join('');
}

async function refreshDownloads() {
  try {
    const res = await fetch('/api/files');
    const files = await res.json();
    renderDownloads(files);
  } catch (err) {
    console.error('Failed to refresh downloads:', err);
  }
}

document.getElementById('urls').addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); go(); }
});

async function go() {
  const urls = parseUrls(document.getElementById('urls').value);
  if (!urls.length) return;

  const btn = document.getElementById('goBtn');
  const container = document.getElementById('cards');
  btn.disabled = true;
  btn.textContent = 'Loading...';
  
  // Don't clear cards - append new ones
  
  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    const idx = cardData.length;
    cardData.push({ url, status: 'loading' });
    renderCard(idx);

    try {
      const res = await fetch('/api/info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (data.error) {
        cardData[idx] = { ...cardData[idx], status: 'info-error', error: data.error };
      } else {
        cardData[idx] = {
          ...cardData[idx],
          status: 'ready',
          title: data.title || '',
          thumbnail: data.thumbnail || '',
          duration: data.duration,
          uploader: data.uploader || '',
          formats: data.formats || [],
          selectedFormatId: data.formats?.[0]?.id || null,
        };
      }
    } catch (err) {
      cardData[idx] = { ...cardData[idx], status: 'info-error', error: err.message };
    }
    renderCard(idx);
  }

  btn.disabled = false;
  btn.textContent = 'Fetch';
}

function renderCard(idx) {
  const c = cardData[idx];
  let el = document.getElementById(`card-${idx}`);
  if (!el) {
    el = document.createElement('div');
    el.id = `card-${idx}`;
    el.className = 'card';
    document.getElementById('cards').appendChild(el);
  }

  // Loading skeleton
  if (c.status === 'loading') {
    el.className = 'card';
    el.innerHTML = `
      <div class="card-thumb loading"></div>
      <div class="card-body">
        <div class="skeleton-line medium"></div>
        <div class="skeleton-line short"></div>
      </div>
    `;
    return;
  }

  // Error state
  if (c.status === 'info-error') {
    el.className = 'card card-error';
    el.innerHTML = `
      <div class="card-thumb">
        <div class="card-error-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
        </div>
      </div>
      <div class="card-body">
        <div class="card-title" style="color:var(--error)">Could not fetch video</div>
        <div class="card-error-msg">${esc(friendlyError(c.error || ''))}</div>
        <div class="card-error-url">${esc(c.url)}</div>
      </div>
    `;
    return;
  }

  // Ready / downloading / done / error states
  el.className = 'card';
  const isAudio = currentFormat === 'audio';

  let thumbHtml;
  if (isAudio) {
    thumbHtml = `<div class="no-thumb" style="color:var(--accent)"><svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="5 3 19 12 5 21 5 3"/></svg></div>`;
  } else if (c.thumbnail) {
    thumbHtml = `<img src="${c.thumbnail}" alt="">`;
  } else {
    thumbHtml = `<div class="no-thumb"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="2"/><circle cx="8" cy="8" r="1.5"/><path d="m21 15-5-5L5 21"/></svg></div>`;
  }

  let qualityChips = '';
  if (!isAudio && c.formats && c.formats.length > 1) {
    qualityChips = c.formats.map(f =>
      `<button class="q-chip${f.id === c.selectedFormatId ? ' active' : ''}" onclick="pickFormat(${idx}, '${f.id}')">${f.label}</button>`
    ).join('');
  }

  let actionHtml = '';
  if (c.status === 'ready') {
    actionHtml = `<button class="card-dl-btn" onclick="dlCard(${idx})">Download</button>${qualityChips}`;
  } else if (c.status === 'downloading') {
    const progress = c.progress || 0;
    const sizeInfo = c.totalSize ? ` ${c.totalSize}` : '';
    actionHtml = `
      <div style="flex:1;min-width:0;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
          <span class="card-status downloading"><span class="spin"></span> Downloading${sizeInfo}</span>
          <button class="card-dl-btn cancel" onclick="cancelCard(${idx})">Cancel</button>
        </div>
        <div class="progress-bar"><div class="progress-fill" style="width:${progress}%"></div></div>
        <div style="font-size:0.65rem;color:var(--muted);text-align:right;">${progress.toFixed(1)}%</div>
      </div>
    `;
  } else if (c.status === 'done') {
    actionHtml = `
      <span class="card-status done">Saved: ${esc(c.filename || '')}</span>
    `;
  } else if (c.status === 'error') {
    actionHtml = `<button class="card-dl-btn" onclick="dlCard(${idx})">Retry</button>
      <span class="card-status error">${esc(friendlyError(c.error || 'Download failed'))}</span>`;
  }

  el.innerHTML = `
    <div class="card-thumb">${thumbHtml}</div>
    <div class="card-body">
      <div class="card-title">${esc(c.title || 'Untitled')}</div>
      <div class="card-meta">${esc(c.uploader)}${c.duration ? ' · ' + fmtDur(c.duration) : ''}</div>
      <div class="card-actions">${actionHtml}</div>
    </div>
  `;
}

function pickFormat(idx, formatId) {
  cardData[idx].selectedFormatId = formatId;
  renderCard(idx);
}

async function dlCard(idx) {
  const c = cardData[idx];
  c.status = 'downloading';
  c.progress = 0;
  c.error = null;
  renderCard(idx);

  try {
    const res = await fetch('/api/download', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: c.url,
        format: currentFormat,
        format_id: c.selectedFormatId,
        title: c.title || '',
      }),
    });
    const data = await res.json();
    if (data.error) {
      c.status = 'error';
      c.error = data.error;
      renderCard(idx);
      return;
    }
    c.jobId = data.job_id;
    pollCard(idx);
  } catch (err) {
    c.status = 'error';
    c.error = err.message;
    renderCard(idx);
  }
}

function pollCard(idx) {
  const c = cardData[idx];
  if (pollIntervals[idx]) clearInterval(pollIntervals[idx]);
  
  pollIntervals[idx] = setInterval(async () => {
    try {
      const res = await fetch(`/api/status/${c.jobId}`);
      const data = await res.json();
      
      if (data.progress !== undefined) {
        c.progress = data.progress;
        c.totalSize = data.total_size;
        if (c.status === 'downloading') {
          renderCard(idx);
        }
      }
      
      if (data.status === 'done') {
        clearInterval(pollIntervals[idx]);
        delete pollIntervals[idx];
        c.status = 'done';
        c.filename = data.filename;
        renderCard(idx);
        refreshDownloads();
      } else if (data.status === 'error') {
        clearInterval(pollIntervals[idx]);
        delete pollIntervals[idx];
        c.status = 'error';
        c.error = data.error;
        renderCard(idx);
      } else if (data.status === 'cancelled') {
        clearInterval(pollIntervals[idx]);
        delete pollIntervals[idx];
        c.status = 'error';
        c.error = 'Download cancelled';
        renderCard(idx);
      }
    } catch {
      clearInterval(pollIntervals[idx]);
      delete pollIntervals[idx];
      c.status = 'error';
      c.error = 'Lost connection to server';
      renderCard(idx);
    }
  }, 1000);
}

async function cancelCard(idx) {
  const c = cardData[idx];
  if (!c.jobId) return;
  
  try {
    await fetch(`/api/cancel/${c.jobId}`, { method: 'POST' });
  } catch (err) {
    console.error('Failed to cancel:', err);
  }
  
  if (pollIntervals[idx]) {
    clearInterval(pollIntervals[idx]);
    delete pollIntervals[idx];
  }
  c.status = 'error';
  c.error = 'Download cancelled';
  renderCard(idx);
}

// Load existing jobs when page loads
loadExistingJobs();
