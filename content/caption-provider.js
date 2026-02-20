// CaptionProvider - live caption observer + full timedtext fetch (preferred).
// Exposed as window.ShadowInput.CaptionProvider

var ShadowInput = ShadowInput || {};

ShadowInput.CaptionProvider = (() => {
  const CAPTION_CONTAINER_SELECTORS = [
    '.ytp-caption-window-container',
    '#ytp-caption-window-container',
  ];
  const CAPTION_SEGMENT_SELECTOR = '.ytp-caption-segment';
  const FULL_CUE_FETCH_RETRY_MS = [0, 250, 700, 1400];
  const LIVE_CUE_LIMIT = 1800;
  const TIMELINE_TICK_MS = 120;

  let observer = null;
  let containerWatcherTimer = null;
  let domWatcher = null;

  let liveListeners = []; // fn(text, tMs)
  let cuesListeners = []; // fn(cues)
  let recentHashes = [];
  const DEDUP_WINDOW = 12;

  let fullCues = null; // preferred: full timedtext cues
  let liveCues = []; // fallback: seen-so-far live cues
  let fullFetchToken = 0;
  let timelineTimer = null;
  let lastTimelineCueIndex = -2;

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
    const cues = getFullCues();
    cuesListeners.forEach((fn) => {
      try {
        fn(cues);
      } catch (e) {
        console.error('[SI] cuesListener error', e);
      }
    });
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

  function appendLiveCue(text, tMs) {
    const startMs = Math.max(0, Number(tMs) || 0);
    const last = liveCues[liveCues.length - 1];

    if (last) {
      if (last.text === text && Math.abs(last.startMs - startMs) < 1800) return;
      last.endMs = Math.max(last.startMs + 120, startMs - 20);
    }

    liveCues.push({
      text,
      startMs,
      endMs: startMs + 2200,
      source: 'live',
    });

    if (liveCues.length > LIVE_CUE_LIMIT) {
      liveCues = liveCues.slice(liveCues.length - LIVE_CUE_LIMIT);
    }

    if (!fullCues || !fullCues.length) {
      notifyCues();
    }
  }

  function emitTimelineCue() {
    if (!Array.isArray(fullCues) || !fullCues.length) return;

    const idx = getCueIndex(getCurrentTimeMs());
    if (idx === lastTimelineCueIndex) return;
    lastTimelineCueIndex = idx;

    if (idx < 0 || idx >= fullCues.length) return;
    const cue = fullCues[idx];
    notifyLive(cue.text, cue.startMs);
  }

  function startTimelineEmitter() {
    stopTimelineEmitter();
    lastTimelineCueIndex = -2;
    timelineTimer = setInterval(() => {
      emitTimelineCue();
    }, TIMELINE_TICK_MS);
  }

  function stopTimelineEmitter() {
    if (!timelineTimer) return;
    clearInterval(timelineTimer);
    timelineTimer = null;
  }

  function emitCurrentCaption() {
    if (Array.isArray(fullCues) && fullCues.length) return;
    const text = readCaptionText();
    if (!text || isDuplicate(text)) return;
    const tMs = getCurrentTimeMs();
    appendLiveCue(text, tMs);
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

  function getPlayerResponseFromPlayerApi() {
    try {
      const player = document.querySelector('#movie_player');
      if (player && typeof player.getPlayerResponse === 'function') {
        const response = player.getPlayerResponse();
        if (response && typeof response === 'object') return response;
      }
    } catch {}
    return null;
  }

  function extractBracketBlock(text, startIndex, openCh, closeCh) {
    if (startIndex < 0 || startIndex >= text.length) return '';
    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let i = startIndex; i < text.length; i++) {
      const ch = text[i];

      if (inString) {
        if (escaped) {
          escaped = false;
          continue;
        }
        if (ch === '\\') {
          escaped = true;
          continue;
        }
        if (ch === '"') {
          inString = false;
        }
        continue;
      }

      if (ch === '"') {
        inString = true;
        continue;
      }

      if (ch === openCh) depth += 1;
      if (ch === closeCh) {
        depth -= 1;
        if (depth === 0) return text.slice(startIndex, i + 1);
      }
    }
    return '';
  }

  function getTracksFromInlineScripts() {
    const scripts = document.querySelectorAll('script');
    for (const script of scripts) {
      const txt = script.textContent || '';
      if (!txt || txt.length < 1000 || txt.indexOf('"captionTracks"') < 0) continue;

      const keyIndex = txt.indexOf('"captionTracks"');
      if (keyIndex < 0) continue;
      const arrStart = txt.indexOf('[', keyIndex);
      if (arrStart < 0) continue;

      const arrJson = extractBracketBlock(txt, arrStart, '[', ']');
      if (!arrJson) continue;

      try {
        const tracks = JSON.parse(arrJson);
        if (Array.isArray(tracks) && tracks.length) return tracks;
      } catch {}
    }
    return [];
  }

  function getCaptionTracks() {
    const fromPlayer = getPlayerResponseFromPlayerApi();
    const tracksFromPlayer =
      fromPlayer?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
    if (Array.isArray(tracksFromPlayer) && tracksFromPlayer.length) return tracksFromPlayer;

    const fromWindow = window.ytInitialPlayerResponse;
    const tracksFromWindow =
      fromWindow?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
    if (Array.isArray(tracksFromWindow) && tracksFromWindow.length) return tracksFromWindow;

    return getTracksFromInlineScripts();
  }

  function scoreTrack(track) {
    const lang = String(track?.languageCode || '').toLowerCase();
    const vssId = String(track?.vssId || '').toLowerCase();
    const kind = String(track?.kind || '').toLowerCase();
    const name = String(track?.name?.simpleText || '').toLowerCase();
    let score = 0;

    if (lang === 'en') score += 140;
    else if (lang.startsWith('en-')) score += 120;
    if (/(^|[._-])en($|[._-])/.test(vssId)) score += 80;
    if (name.indexOf('english') >= 0) score += 60;
    if (kind !== 'asr') score += 25;
    if (track?.isTranslatable) score += 5;

    return score;
  }

  function pickBestTrack(tracks) {
    if (!Array.isArray(tracks) || !tracks.length) return null;
    const sorted = [...tracks].sort((a, b) => scoreTrack(b) - scoreTrack(a));
    return sorted[0] || null;
  }

  function normalizeCueText(raw) {
    return String(raw || '')
      .replace(/\u200b/g, '')
      .replace(/\n/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function countWords(text) {
    if (!text) return 0;
    return text.split(/\s+/).filter(Boolean).length;
  }

  function squashProgressiveCues(cues) {
    if (!Array.isArray(cues) || cues.length < 2) return cues || [];
    const out = [];

    for (const cue of cues) {
      const prev = out[out.length - 1];
      if (!prev) {
        out.push({ ...cue });
        continue;
      }

      if (cue.text === prev.text) {
        prev.endMs = Math.max(prev.endMs, cue.endMs);
        continue;
      }

      const almostSameStart = Math.abs(cue.startMs - prev.startMs) <= 350;
      if (almostSameStart && cue.text.startsWith(prev.text)) {
        prev.text = cue.text;
        prev.endMs = Math.max(prev.endMs, cue.endMs);
        continue;
      }

      out.push({ ...cue });
    }

    return out;
  }

  function shouldCoalesceWordLikeCues(cues) {
    if (!Array.isArray(cues) || cues.length < 8) return false;
    const n = Math.min(cues.length, 140);
    let shortCount = 0;
    let fastCount = 0;

    for (let i = 0; i < n; i++) {
      const cue = cues[i];
      const words = countWords(cue.text);
      const dur = Math.max(0, Number(cue.endMs || 0) - Number(cue.startMs || 0));
      if (words <= 2) shortCount += 1;
      if (dur > 0 && dur <= 900) fastCount += 1;
    }

    return shortCount / n >= 0.58 || fastCount / n >= 0.62;
  }

  function appendCueText(base, piece) {
    const left = String(base || '').trim();
    const right = String(piece || '').trim();
    if (!left) return right;
    if (!right) return left;

    if (/^[,.;!?%:)\]}]/.test(right)) return left + right;
    if (/[(\[{'"`]/.test(left.slice(-1))) return left + right;
    return `${left} ${right}`;
  }

  function coalesceShortCues(cues) {
    if (!Array.isArray(cues) || !cues.length) return [];
    const merged = [];
    let buf = null;

    const flush = () => {
      if (!buf || !buf.text) return;
      merged.push(buf);
      buf = null;
    };

    for (let i = 0; i < cues.length; i++) {
      const cue = cues[i];
      const next = cues[i + 1] || null;
      const gapToNext = next ? Math.max(0, next.startMs - cue.endMs) : 9999;

      if (!buf) {
        buf = { ...cue };
      } else {
        buf.text = appendCueText(buf.text, cue.text);
        buf.endMs = Math.max(buf.endMs, cue.endMs);
      }

      const text = buf.text || '';
      const words = countWords(text);
      const dur = Math.max(0, buf.endMs - buf.startMs);
      const endsSentence = /[.!?。！？]$/.test(text);
      const shouldFlush =
        endsSentence || gapToNext > 620 || words >= 14 || dur >= 3600 || !next;

      if (shouldFlush) flush();
    }

    flush();
    return merged;
  }

  function parseJson3Events(events) {
    if (!Array.isArray(events)) return [];
    const raw = [];

    for (const ev of events) {
      if (!Array.isArray(ev?.segs) || !ev.segs.length) continue;
      const text = normalizeCueText(ev.segs.map((seg) => seg?.utf8 || '').join(''));
      if (!text) continue;

      const startMs = Math.max(0, Number(ev.tStartMs || 0));
      const durationMs = Math.max(0, Number(ev.dDurationMs || 0));
      const endMs = startMs + (durationMs > 0 ? durationMs : 1800);

      const prev = raw[raw.length - 1];
      if (prev && prev.text === text && Math.abs(prev.startMs - startMs) < 1200) {
        prev.endMs = Math.max(prev.endMs, endMs);
        continue;
      }

      raw.push({
        text,
        startMs,
        endMs,
        source: 'full',
      });
    }

    let cues = squashProgressiveCues(raw);
    if (shouldCoalesceWordLikeCues(cues)) {
      cues = coalesceShortCues(cues);
    }

    for (let i = 0; i < cues.length - 1; i++) {
      const nextStart = cues[i + 1].startMs;
      const minEnd = cues[i].startMs + 120;
      cues[i].endMs = Math.max(minEnd, Math.min(cues[i].endMs, nextStart - 10));
    }

    return cues;
  }

  async function fetchTimedtextJson3(baseUrl) {
    if (!baseUrl) return [];
    const url = new URL(baseUrl);
    url.searchParams.set('fmt', 'json3');
    const resp = await fetch(url.toString(), { method: 'GET', credentials: 'include' });
    if (!resp.ok) return [];
    const data = await resp.json();
    return parseJson3Events(data?.events || []);
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function loadFullTrackCues() {
    const token = ++fullFetchToken;

    for (const waitMs of FULL_CUE_FETCH_RETRY_MS) {
      if (token !== fullFetchToken) return;
      if (waitMs > 0) await sleep(waitMs);

      const tracks = getCaptionTracks();
      const track = pickBestTrack(tracks);
      if (!track?.baseUrl) continue;

      try {
        const cues = await fetchTimedtextJson3(track.baseUrl);
        if (token !== fullFetchToken) return;
        if (!cues.length) continue;
        fullCues = cues;
        notifyCues();
        lastTimelineCueIndex = -2;
        emitTimelineCue();
        return;
      } catch {}
    }
  }

  function onLiveCaption(fn) {
    liveListeners.push(fn);
    return () => {
      liveListeners = liveListeners.filter((f) => f !== fn);
    };
  }

  function onFullCues(fn) {
    cuesListeners.push(fn);
    const cues = getFullCues();
    if (cues) {
      try {
        fn(cues);
      } catch {}
    }
    return () => {
      cuesListeners = cuesListeners.filter((f) => f !== fn);
    };
  }

  function getFullCues() {
    if (Array.isArray(fullCues) && fullCues.length) return fullCues;
    if (Array.isArray(liveCues) && liveCues.length) return liveCues;
    return null;
  }

  function start() {
    recentHashes = [];
    fullCues = null;
    liveCues = [];
    lastTimelineCueIndex = -2;
    startTimelineEmitter();
    emitCurrentCaption();
    watchForContainer();
    loadFullTrackCues();
  }

  function stop() {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
    clearContainerWatchers();
    stopTimelineEmitter();
    fullFetchToken += 1;
    liveListeners = [];
    cuesListeners = [];
    recentHashes = [];
    fullCues = null;
    liveCues = [];
    lastTimelineCueIndex = -2;
  }

  function getCueIndex(atMs = getCurrentTimeMs()) {
    const cues = getFullCues();
    if (!Array.isArray(cues) || !cues.length) return -1;
    const target = Math.max(0, Number(atMs) || 0);

    let lo = 0;
    let hi = cues.length - 1;
    let best = -1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (cues[mid].startMs <= target) {
        best = mid;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
    return best;
  }

  function findCueAt(atMs = getCurrentTimeMs()) {
    const cues = getFullCues();
    const idx = getCueIndex(atMs);
    if (!Array.isArray(cues) || idx < 0 || idx >= cues.length) return null;
    return cues[idx];
  }

  return { start, stop, onLiveCaption, onFullCues, getFullCues, findCueAt, getCueIndex };
})();
