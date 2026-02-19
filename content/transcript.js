// TranscriptMode – shows a scrollable transcript panel.
// Uses full cues when available; otherwise accumulates live captions.
// Exposed as window.ShadowInput.TranscriptMode

var ShadowInput = ShadowInput || {};

ShadowInput.TranscriptMode = (() => {
  const PC = () => ShadowInput.PlayerController;
  const CP = () => ShadowInput.CaptionProvider;

  // ── State ─────────────────────────────────────────────────────────────────
  let active = false;
  let cues = null;
  let liveItems = [];    // [{text, startMs}] accumulated from live captions
  let highlightTimer = null;
  let currentHighlight = -1;

  // ── DOM ───────────────────────────────────────────────────────────────────
  let panelEl = null;
  let listEl = null;
  let itemEls = [];      // span elements for each cue/item

  function ensurePanel() {
    if (panelEl) return panelEl;

    panelEl = document.createElement('div');
    panelEl.className = 'si-transcript-panel';
    panelEl.id = 'si-transcript-panel';

    panelEl.innerHTML = `
      <div class="si-transcript-header">
        <span class="si-transcript-title">Transcript</span>
        <button class="si-btn si-transcript-close" title="Close transcript">✕</button>
      </div>
      <div class="si-transcript-list" id="si-transcript-list"></div>
    `;

    panelEl.querySelector('.si-transcript-close').addEventListener('click', () => {
      // Signal to parent that we want to close this panel but stay in transcript mode
      deactivate();
    });

    document.body.appendChild(panelEl);
    listEl = panelEl.querySelector('#si-transcript-list');
    return panelEl;
  }

  // ── Rendering ─────────────────────────────────────────────────────────────
  function renderItems(items) {
    if (!listEl) return;
    listEl.innerHTML = '';
    itemEls = [];

    items.forEach((item, idx) => {
      const el = document.createElement('div');
      el.className = 'si-transcript-item';
      el.dataset.idx = idx;

      const timeEl = document.createElement('span');
      timeEl.className = 'si-transcript-time';
      timeEl.textContent = formatTime(item.startMs);

      const textEl = document.createElement('span');
      textEl.className = 'si-transcript-text';
      textEl.textContent = item.text;

      el.appendChild(timeEl);
      el.appendChild(textEl);

      el.addEventListener('click', () => {
        PC().seekToMs(item.startMs);
      });

      listEl.appendChild(el);
      itemEls.push(el);
    });
  }

  function appendLiveItem(text, startMs) {
    if (!listEl) return;

    const idx = itemEls.length;
    const el = document.createElement('div');
    el.className = 'si-transcript-item';
    el.dataset.idx = idx;

    const timeEl = document.createElement('span');
    timeEl.className = 'si-transcript-time';
    timeEl.textContent = formatTime(startMs);

    const textEl = document.createElement('span');
    textEl.className = 'si-transcript-text';
    textEl.textContent = text;

    el.appendChild(timeEl);
    el.appendChild(textEl);

    el.addEventListener('click', () => {
      PC().seekToMs(startMs);
    });

    listEl.appendChild(el);
    itemEls.push(el);

    // Auto-scroll to bottom for new live items
    listEl.scrollTop = listEl.scrollHeight;
  }

  // ── Highlight ─────────────────────────────────────────────────────────────
  function startHighlighting() {
    stopHighlighting();
    highlightTimer = setInterval(updateHighlight, 200);
  }

  function stopHighlighting() {
    if (highlightTimer) { clearInterval(highlightTimer); highlightTimer = null; }
  }

  function updateHighlight() {
    if (!active) return;

    let newIdx = -1;

    if (cues) {
      newIdx = CP().getCueIndex(PC().getCurrentTimeMs());
    } else {
      // Live mode: match by text or nearest time
      const nowMs = PC().getCurrentTimeMs();
      for (let i = liveItems.length - 1; i >= 0; i--) {
        if (liveItems[i].startMs <= nowMs) {
          newIdx = i;
          break;
        }
      }
    }

    if (newIdx === currentHighlight) return;

    // Remove old highlight
    if (currentHighlight >= 0 && itemEls[currentHighlight]) {
      itemEls[currentHighlight].classList.remove('si-transcript-active');
    }

    currentHighlight = newIdx;

    if (newIdx >= 0 && itemEls[newIdx]) {
      const el = itemEls[newIdx];
      el.classList.add('si-transcript-active');
      // Scroll into view smoothly
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }

  // ── Util ──────────────────────────────────────────────────────────────────
  function formatTime(ms) {
    const totalSec = Math.floor(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    if (h > 0) {
      return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  function activate() {
    active = true;
    ensurePanel();
    panelEl.style.display = 'flex';
    itemEls = [];
    currentHighlight = -1;

    cues = CP().getFullCues();

    if (cues && cues.length > 0) {
      renderItems(cues.map((c) => ({ text: c.text, startMs: c.startMs })));
    } else {
      // Live mode: render accumulated items
      liveItems.forEach((item) => appendLiveItem(item.text, item.startMs));
    }

    startHighlighting();
  }

  function deactivate() {
    active = false;
    stopHighlighting();
    if (panelEl) panelEl.style.display = 'none';
    currentHighlight = -1;
  }

  function destroy() {
    deactivate();
    if (panelEl) { panelEl.remove(); panelEl = null; listEl = null; itemEls = []; }
  }

  function onCaption(text, tMs) {
    if (!cues) {
      // Accumulate live captions
      const exists = liveItems.some((i) => i.text === text);
      if (!exists) {
        liveItems.push({ text, startMs: tMs });
        if (active) {
          appendLiveItem(text, tMs);
        }
      }
    }
  }

  function reset() {
    liveItems = [];
    itemEls = [];
    currentHighlight = -1;
    cues = null;
    if (listEl) listEl.innerHTML = '';
  }

  return { activate, deactivate, destroy, onCaption, reset };
})();
