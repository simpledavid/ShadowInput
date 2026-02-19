// ShadowInput Popup Script

const KEY = 'si_flashcards';
let allCards = [];

async function loadCards() {
  return new Promise((resolve) => {
    chrome.storage.local.get(KEY, (data) => {
      allCards = data[KEY] || [];
      resolve(allCards);
    });
  });
}

function saveCards(cards) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [KEY]: cards }, resolve);
  });
}

function getFilterState() {
  return {
    video: document.getElementById('video-filter').value,
    date: document.getElementById('date-filter').value,
  };
}

function getDateThreshold(dateFilter) {
  const now = Date.now();
  if (dateFilter === 'today') {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }
  if (dateFilter === '7d') return now - 7 * 24 * 60 * 60 * 1000;
  if (dateFilter === '30d') return now - 30 * 24 * 60 * 60 * 1000;
  return 0;
}

function applyFilters(cards) {
  const f = getFilterState();
  const threshold = getDateThreshold(f.date);

  return cards.filter((card) => {
    if (f.video !== 'all' && (card.videoId || '') !== f.video) return false;
    if (threshold > 0 && Number(card.createdAt || 0) < threshold) return false;
    return true;
  });
}

function renderVideoFilter(cards) {
  const select = document.getElementById('video-filter');
  const prev = select.value || 'all';

  const ids = [...new Set(cards.map((c) => c.videoId).filter(Boolean))].sort();
  select.innerHTML = '<option value="all">全部视频</option>';

  ids.forEach((id) => {
    const opt = document.createElement('option');
    opt.value = id;
    opt.textContent = id.length > 10 ? `${id.slice(0, 10)}...` : id;
    select.appendChild(opt);
  });

  if ([...select.options].some((o) => o.value === prev)) select.value = prev;
  else select.value = 'all';
}

function renderCards() {
  const list = document.getElementById('card-list');
  const filtered = applyFilters(allCards);

  document.getElementById('card-count').textContent = allCards.length;
  document.getElementById('filtered-count').textContent = filtered.length;

  if (!filtered.length) {
    list.innerHTML = '<div class="empty-state">当前筛选下没有生词。</div>';
    return;
  }

  const recent = [...filtered]
    .sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0))
    .slice(0, 50);

  list.innerHTML = '';
  recent.forEach((card) => {
    const item = document.createElement('div');
    item.className = 'card-item';

    const created = Number(card.createdAt || 0);
    const dateText = created ? new Date(created).toLocaleDateString() : '-';
    const vid = card.videoId ? `video:${card.videoId.slice(0, 8)}` : 'no-video';
    const meta = `${dateText} | ${vid}`;

    item.innerHTML = `
      <div>
        <div class="card-word">${escHtml(card.word)}</div>
        <div class="card-meta">${escHtml(meta)}</div>
      </div>
      <button class="card-delete" data-id="${escHtml(card.id)}" title="Remove">X</button>
    `;

    item.querySelector('.card-delete').addEventListener('click', async (e) => {
      const id = e.target.dataset.id;
      allCards = allCards.filter((c) => c.id !== id);
      await saveCards(allCards);
      renderVideoFilter(allCards);
      renderCards();
    });

    list.appendChild(item);
  });
}

function showStatus(msg, color = '#4ade80') {
  const el = document.getElementById('status-msg');
  el.textContent = msg;
  el.style.color = color;
  el.classList.add('visible');
  setTimeout(() => el.classList.remove('visible'), 1800);
}

function downloadFile(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function getCardsByScope(scope) {
  if (scope === 'all') return [...allCards];
  return applyFilters(allCards);
}

function formatDateForFile(ts = Date.now()) {
  const d = new Date(ts);
  const p2 = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p2(d.getMonth() + 1)}${p2(d.getDate())}-${p2(d.getHours())}${p2(d.getMinutes())}`;
}

function buildFilename(ext, scope, count) {
  const label = scope === 'all' ? 'all' : 'filtered';
  return `shadowinput-flashcards-${label}-${count}-${formatDateForFile()}.${ext}`;
}

function exportJSON(cards, scope) {
  downloadFile(
    JSON.stringify(cards, null, 2),
    buildFilename('json', scope, cards.length),
    'application/json'
  );
}

function exportCSV(cards, scope) {
  const esc = (s) => `"${String(s || '').replace(/"/g, '""')}"`;
  const header = 'word,translation,sentence,videoId,tMs,createdAt';
  const rows = cards.map((c) =>
    [esc(c.word), esc(c.translation), esc(c.sentence), esc(c.videoId), c.tMs || '', c.createdAt].join(',')
  );
  downloadFile(
    [header, ...rows].join('\n'),
    buildFilename('csv', scope, cards.length),
    'text/csv'
  );
}

function exportTXT(cards, scope) {
  const rows = cards.map((c) => {
    const word = String(c.word || '').trim();
    const trans = String(c.translation || '').replace(/\s+/g, ' ').trim();
    const sentence = String(c.sentence || '').replace(/\s+/g, ' ').trim();
    return [word, trans, sentence].join('\t');
  });
  downloadFile(
    rows.join('\n'),
    buildFilename('txt', scope, cards.length),
    'text/plain'
  );
}

function handleExport() {
  const scope = document.getElementById('export-scope').value;
  const format = document.getElementById('export-format').value;
  const cards = getCardsByScope(scope);
  if (!cards.length) {
    showStatus('没有可导出的生词', '#f87171');
    return;
  }

  if (format === 'json') exportJSON(cards, scope);
  else if (format === 'csv') exportCSV(cards, scope);
  else exportTXT(cards, scope);

  const scopeText = scope === 'all' ? '全部' : '筛选';
  showStatus(`已导出${scopeText} ${cards.length} 条`);
}

async function mergeDuplicates() {
  if (!allCards.length) return;

  const byKey = new Map();
  const sorted = [...allCards].sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));

  for (const c of sorted) {
    const word = String(c.word || '').trim().toLowerCase();
    if (!word) continue;
    const key = `${word}::${c.videoId || ''}`;
    if (!byKey.has(key)) {
      byKey.set(key, { ...c });
      continue;
    }

    // Merge details into the already-kept newest item.
    const keep = byKey.get(key);
    if (!keep.translation && c.translation) keep.translation = c.translation;
    if (!keep.sentence && c.sentence) keep.sentence = c.sentence;
    if (!keep.tMs && c.tMs) keep.tMs = c.tMs;
  }

  const merged = [...byKey.values()].sort((a, b) => Number(a.createdAt || 0) - Number(b.createdAt || 0));
  const removed = allCards.length - merged.length;

  if (removed <= 0) {
    showStatus('没有重复项');
    return;
  }

  allCards = merged;
  await saveCards(allCards);
  renderVideoFilter(allCards);
  renderCards();
  showStatus(`已合并 ${removed} 条重复项`);
}

async function clearAll() {
  if (!allCards.length) return;
  if (!confirm(`确认清空全部 ${allCards.length} 条生词吗？`)) return;
  allCards = [];
  await saveCards(allCards);
  renderVideoFilter(allCards);
  renderCards();
  showStatus('已清空');
}

function escHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

document.getElementById('video-filter').addEventListener('change', renderCards);
document.getElementById('date-filter').addEventListener('change', renderCards);
document.getElementById('export-btn').addEventListener('click', handleExport);
document.getElementById('merge-btn').addEventListener('click', mergeDuplicates);
document.getElementById('clear-btn').addEventListener('click', clearAll);
document.getElementById('options-link').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

loadCards().then((cards) => {
  renderVideoFilter(cards);
  renderCards();
});
