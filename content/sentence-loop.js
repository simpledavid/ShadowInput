// SentenceLoopMode – loops over sentence cues for listening practice.
// Works with full cues (precise) or live captions (approximate).
// Exposed as window.ShadowInput.SentenceLoopMode

var ShadowInput = ShadowInput || {};

ShadowInput.SentenceLoopMode = (() => {
  const PC = () => ShadowInput.PlayerController;

  // ── Settings ──────────────────────────────────────────────────────────────
  let settings = {
    loopCount: 2,
    pauseAfterSentence: true,
  };

  // ── State ─────────────────────────────────────────────────────────────────
  let active = false;
  let cues = null;           // full cues array if available
  let currentCueIdx = -1;
  let loopRemaining = 0;
  let checkTimer = null;

  // Live-caption fallback state
  let liveSentences = [];    // [{text, startMs}]
  let liveCurrent = -1;
  let pendingLiveText = null;
  let pendingLiveMs = 0;

  // ── Panel DOM ─────────────────────────────────────────────────────────────
  let panelEl = null;

  function ensurePanel() {
    if (!panelEl) {
      panelEl = document.createElement('div');
      panelEl.className = 'si-loop-panel';
      panelEl.id = 'si-loop-panel';
      panelEl.innerHTML = `
        <div class="si-loop-info">
          <span class="si-loop-sentence"></span>
          <span class="si-loop-counter"></span>
        </div>
        <div class="si-loop-controls">
          <button class="si-btn si-loop-prev" title="Previous sentence">⏮ Prev</button>
          <button class="si-btn si-loop-replay" title="Replay current">↺ Replay</button>
          <button class="si-btn si-loop-next" title="Next sentence">Next ⏭</button>
        </div>
        <div class="si-loop-settings">
          <label>Loop <input type="number" class="si-loop-count-input" min="1" max="20" value="2"> ×</label>
          <label><input type="checkbox" class="si-loop-pause-check" checked> Pause after each</label>
        </div>
      `;

      panelEl.querySelector('.si-loop-prev').addEventListener('click', prevSentence);
      panelEl.querySelector('.si-loop-replay').addEventListener('click', replayCurrent);
      panelEl.querySelector('.si-loop-next').addEventListener('click', nextSentence);

      panelEl.querySelector('.si-loop-count-input').addEventListener('change', (e) => {
        settings.loopCount = Math.max(1, parseInt(e.target.value, 10) || 1);
        loopRemaining = settings.loopCount;
      });

      panelEl.querySelector('.si-loop-pause-check').addEventListener('change', (e) => {
        settings.pauseAfterSentence = e.target.checked;
      });

      const container = document.querySelector('#movie_player') || document.querySelector('.html5-video-player');
      if (container) container.appendChild(panelEl);
      else document.body.appendChild(panelEl);
    }
    return panelEl;
  }

  function updatePanelDisplay(text, loopNum) {
    if (!panelEl) return;
    panelEl.querySelector('.si-loop-sentence').textContent = text || '';
    const counter = panelEl.querySelector('.si-loop-counter');
    if (loopNum != null) {
      counter.textContent = `Loop ${settings.loopCount - loopNum + 1}/${settings.loopCount}`;
    }
  }

  // ── Full-Cue Mode ─────────────────────────────────────────────────────────
  function startCueMode() {
    stopCheck();
    const idx = ShadowInput.CaptionProvider.getCueIndex(PC().getCurrentTimeMs());
    currentCueIdx = idx >= 0 ? idx : 0;
    loopRemaining = settings.loopCount;
    playCue(currentCueIdx);
  }

  function playCue(idx) {
    if (!cues || idx < 0 || idx >= cues.length) return;
    const cue = cues[idx];
    currentCueIdx = idx;
    loopRemaining = settings.loopCount;
    updatePanelDisplay(cue.text, loopRemaining);
    PC().seekToMs(cue.startMs);
    PC().play();
    scheduleCueCheck(cue);
  }

  function scheduleCueCheck(cue) {
    stopCheck();
    const END_MARGIN_MS = 50;

    checkTimer = setInterval(() => {
      if (!active) { stopCheck(); return; }
      const nowMs = PC().getCurrentTimeMs();
      if (nowMs >= cue.endMs - END_MARGIN_MS) {
        // End of cue reached
        loopRemaining--;
        if (loopRemaining > 0) {
          // Loop: seek back to cue start
          updatePanelDisplay(cue.text, loopRemaining);
          PC().seekToMs(cue.startMs);
          PC().play();
        } else if (settings.pauseAfterSentence) {
          // Pause and wait for user
          stopCheck();
          PC().pause();
          updatePanelDisplay(cue.text + ' ✓', 0);
        } else {
          // Auto advance
          stopCheck();
          const nextIdx = currentCueIdx + 1;
          if (nextIdx < cues.length) {
            playCue(nextIdx);
          }
        }
      }
    }, 100);
  }

  // ── Live-Caption Fallback ─────────────────────────────────────────────────
  function onLiveCaption(text, tMs) {
    if (!active) return;

    // Find or create sentence entry
    const existing = liveSentences.findIndex((s) => s.text === text);
    if (existing === -1) {
      liveSentences.push({ text, startMs: tMs });
      const newIdx = liveSentences.length - 1;

      if (liveCurrent === -1) {
        liveCurrent = newIdx;
        loopRemaining = settings.loopCount;
        updatePanelDisplay(text, loopRemaining);
      } else if (!settings.pauseAfterSentence) {
        // Auto advance to new sentence
        pendingLiveText = text;
        pendingLiveMs = tMs;
        handleLiveSentenceEnd(newIdx);
      } else {
        // Pause mode: show pending
        pendingLiveText = text;
        pendingLiveMs = tMs;
        PC().pause();
        updatePanelDisplay(liveSentences[liveCurrent].text + ' ✓', 0);
      }
    }
  }

  function handleLiveSentenceEnd(nextIdx) {
    loopRemaining--;
    if (loopRemaining > 0 && liveSentences[liveCurrent]) {
      updatePanelDisplay(liveSentences[liveCurrent].text, loopRemaining);
      PC().seekToMs(liveSentences[liveCurrent].startMs);
      PC().play();
    } else {
      liveCurrent = nextIdx;
      loopRemaining = settings.loopCount;
      if (liveSentences[liveCurrent]) {
        updatePanelDisplay(liveSentences[liveCurrent].text, loopRemaining);
      }
    }
  }

  // ── Controls ──────────────────────────────────────────────────────────────
  function prevSentence() {
    if (cues) {
      const idx = Math.max(0, currentCueIdx - 1);
      playCue(idx);
    } else if (liveCurrent > 0) {
      liveCurrent--;
      loopRemaining = settings.loopCount;
      const s = liveSentences[liveCurrent];
      if (s) {
        updatePanelDisplay(s.text, loopRemaining);
        PC().seekToMs(s.startMs);
        PC().play();
      }
    }
  }

  function nextSentence() {
    if (cues) {
      const idx = Math.min(cues.length - 1, currentCueIdx + 1);
      playCue(idx);
    } else if (liveCurrent < liveSentences.length - 1) {
      liveCurrent++;
      loopRemaining = settings.loopCount;
      const s = liveSentences[liveCurrent];
      if (s) {
        updatePanelDisplay(s.text, loopRemaining);
        PC().seekToMs(s.startMs);
        PC().play();
      }
    }
  }

  function replayCurrent() {
    if (cues && cues[currentCueIdx]) {
      playCue(currentCueIdx);
    } else if (liveSentences[liveCurrent]) {
      const s = liveSentences[liveCurrent];
      loopRemaining = settings.loopCount;
      updatePanelDisplay(s.text, loopRemaining);
      PC().seekToMs(s.startMs);
      PC().play();
    }
  }

  function stopCheck() {
    if (checkTimer) { clearInterval(checkTimer); checkTimer = null; }
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  function activate(opts = {}) {
    settings = { ...settings, ...opts };
    active = true;
    liveSentences = [];
    liveCurrent = -1;
    pendingLiveText = null;

    ensurePanel();
    panelEl.style.display = 'flex';

    cues = ShadowInput.CaptionProvider.getFullCues();
    if (cues && cues.length > 0) {
      startCueMode();
    } else {
      updatePanelDisplay('Waiting for captions…', null);
    }
  }

  function deactivate() {
    active = false;
    stopCheck();
    if (panelEl) panelEl.style.display = 'none';
    cues = null;
    liveSentences = [];
    liveCurrent = -1;
  }

  function destroy() {
    deactivate();
    if (panelEl) { panelEl.remove(); panelEl = null; }
  }

  function onCaption(text, tMs) {
    if (!active) return;
    if (!cues) {
      onLiveCaption(text, tMs);
    }
  }

  return { activate, deactivate, destroy, onCaption };
})();
