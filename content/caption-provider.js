// CaptionProvider - fast MutationObserver-based YouTube caption detector.
// Exposed as window.ShadowInput.CaptionProvider

var ShadowInput = ShadowInput || {};

ShadowInput.CaptionProvider = (() => {
  const CAPTION_CONTAINER_SELECTORS = [
    '.ytp-caption-window-container',
    '#ytp-caption-window-container',
  ];
  const CAPTION_SEGMENT_SELECTOR = '.ytp-caption-segment';

  let observer = null;
  let containerWatcherTimer = null;
  let domWatcher = null;

  let liveListeners = []; // fn(text, tMs)
  let cuesListeners = []; // fn(cues)
  let recentHashes = [];
  const DEDUP_WINDOW = 12;
  const MAX_CUES = 1800;

  // Live cues history (approximate timing, good enough for prev/next navigation).
  let fullCues = [];

  function simpleHash(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
      h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
    }
    return h;
  }

  function isDuplicate(text) {
    const h = simpleHash(text);
    if (recentHashes.includes(h)) return true;
    recentHashes.push(h);
    if (recentHashes.length > DEDUP_WINDOW) recentHashes.shift();
    return false;
  }

  function getCaptionContainer() {
    for (const sel of CAPTION_CONTAINER_SELECTORS) {
      const el = document.querySelector(sel);
      if (el) return el;
    }
    return null;
  }

  function readCaptionText() {
    for (const sel of CAPTION_CONTAINER_SELECTORS) {
      const el = document.querySelector(sel);
      if (el) {
        const text = (el.innerText || '').replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
        if (text) return text;
      }
    }

    const segments = document.querySelectorAll(CAPTION_SEGMENT_SELECTOR);
    return Array.from(segments)
      .map((s) => (s.innerText || s.textContent || '').trim())
      .filter(Boolean)
      .join(' ')
      .trim();
  }

  function getVideoElement() {
    return document.querySelector('video');
  }

  function getCurrentTimeMs() {
    const v = getVideoElement();
    return v ? Math.round(v.currentTime * 1000) : 0;
  }

  function notifyLive(text, tMs) {
    liveListeners.forEach((fn) => {
      try {
        fn(text, tMs);
      } catch (e) {
        console.error('[SI] liveListener error', e);
      }
    });
  }

  function notifyCues() {
    const snapshot = fullCues.slice();
    cuesListeners.forEach((fn) => {
      try {
        fn(snapshot);
      } catch (e) {
        console.error('[SI] cuesListener error', e);
      }
    });
  }

  function pushCue(text, tMs) {
    if (!text) return;

    const cue = {
      text,
      startMs: Math.max(0, Number(tMs) || 0),
      endMs: Math.max(0, Number(tMs) || 0) + 2600,
    };

    const last = fullCues[fullCues.length - 1];
    if (last) {
      const safeEnd = Math.max(last.startMs + 120, cue.startMs - 40);
      last.endMs = Math.max(last.endMs || 0, safeEnd);
    }

    fullCues.push(cue);

    if (fullCues.length > MAX_CUES) {
      fullCues = fullCues.slice(fullCues.length - MAX_CUES);
    }

    notifyCues();
  }

  function clearContainerWatchers() {
    if (containerWatcherTimer) {
      clearInterval(containerWatcherTimer);
      containerWatcherTimer = null;
    }
    if (domWatcher) {
      domWatcher.disconnect();
      domWatcher = null;
    }
  }

  function emitCurrentCaption() {
    const text = readCaptionText();
    if (!text || isDuplicate(text)) return;
    const tMs = getCurrentTimeMs();
    pushCue(text, tMs);
    notifyLive(text, tMs);
  }

  function startObserver(container) {
    if (!container) return;
    if (observer) observer.disconnect();

    observer = new MutationObserver(() => {
      if (!container.isConnected) {
        watchForContainer();
        return;
      }
      emitCurrentCaption();
    });

    observer.observe(container, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    // Emit immediately so we do not wait for the next mutation tick.
    emitCurrentCaption();
  }

  function watchForContainer() {
    clearContainerWatchers();

    const tryAttach = () => {
      const container = getCaptionContainer();
      if (!container) return false;
      startObserver(container);
      clearContainerWatchers();
      return true;
    };

    if (tryAttach()) return;

    const root = document.documentElement || document.body;
    if (root) {
      domWatcher = new MutationObserver(() => {
        tryAttach();
      });
      domWatcher.observe(root, { childList: true, subtree: true });
    }

    // Fast startup polling to reduce first-caption wait after mode entry.
    containerWatcherTimer = setInterval(() => {
      tryAttach();
    }, 120);
  }

  function onLiveCaption(fn) {
    liveListeners.push(fn);
    return () => {
      liveListeners = liveListeners.filter((f) => f !== fn);
    };
  }

  function onFullCues(fn) {
    cuesListeners.push(fn);
    if (fullCues.length) {
      try {
        fn(fullCues.slice());
      } catch (_) {}
    }
    return () => {
      cuesListeners = cuesListeners.filter((f) => f !== fn);
    };
  }

  function getFullCues() {
    return fullCues.slice();
  }

  function start() {
    recentHashes = [];
    fullCues = [];
    emitCurrentCaption();
    watchForContainer();
  }

  function stop() {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
    clearContainerWatchers();
    liveListeners = [];
    cuesListeners = [];
    recentHashes = [];
    fullCues = [];
  }

  function getCueIndex(atMs = getCurrentTimeMs()) {
    if (!fullCues.length) return -1;
    const target = Number(atMs) || 0;

    let lo = 0;
    let hi = fullCues.length - 1;
    let best = -1;

    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (fullCues[mid].startMs <= target) {
        best = mid;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }

    if (best < 0) return -1;
    return best;
  }

  function findCueAt(atMs = getCurrentTimeMs()) {
    const idx = getCueIndex(atMs);
    if (idx < 0 || idx >= fullCues.length) return null;
    return fullCues[idx];
  }

  return { start, stop, onLiveCaption, onFullCues, getFullCues, findCueAt, getCueIndex };
})();
