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
  select.innerHTML = '<option value="all">All videos</option>';

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
    list.innerHTML = '<div class="empty-state">No flashcards match current filters.</div>';
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

function exportJSON() {
  const filtered = applyFilters(allCards);
  if (!filtered.length) {
    showStatus('No cards to export', '#f87171');
    return;
  }
  downloadFile(JSON.stringify(filtered, null, 2), 'shadowinput-flashcards.json', 'application/json');
  showStatus('JSON exported');
}

function exportCSV() {
  const filtered = applyFilters(allCards);
  if (!filtered.length) {
    showStatus('No cards to export', '#f87171');
    return;
  }
  const esc = (s) => `"${String(s || '').replace(/"/g, '""')}"`;
  const header = 'word,sentence,videoId,tMs,createdAt';
  const rows = filtered.map((c) =>
    [esc(c.word), esc(c.sentence), esc(c.videoId), c.tMs || '', c.createdAt].join(',')
  );
  downloadFile([header, ...rows].join('\n'), 'shadowinput-flashcards.csv', 'text/csv');
  showStatus('CSV exported');
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
    showStatus('No duplicates found');
    return;
  }

  allCards = merged;
  await saveCards(allCards);
  renderVideoFilter(allCards);
  renderCards();
  showStatus(`Merged ${removed}`);
}

async function clearAll() {
  if (!allCards.length) return;
  if (!confirm(`Delete all ${allCards.length} flashcards?`)) return;
  allCards = [];
  await saveCards(allCards);
  renderVideoFilter(allCards);
  renderCards();
  showStatus('Cleared');
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
document.getElementById('export-json-btn').addEventListener('click', exportJSON);
document.getElementById('export-csv-btn').addEventListener('click', exportCSV);
document.getElementById('merge-btn').addEventListener('click', mergeDuplicates);
document.getElementById('clear-btn').addEventListener('click', clearAll);
document.getElementById('options-link').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

loadCards().then((cards) => {
  renderVideoFilter(cards);
  renderCards();
});
