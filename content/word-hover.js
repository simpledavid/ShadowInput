// WordHoverMode - caption overlay with hover lookup and flashcards.
// State machine: IDLE -> DWELLING -> PAUSED
// Exposed as window.ShadowInput.WordHoverMode

var ShadowInput = ShadowInput || {};

ShadowInput.WordHoverMode = (() => {
  const PC = () => ShadowInput.PlayerController;
  const FS = () => ShadowInput.FlashcardStore;

  let settings = { dwellMs: 80, resumeDelayMs: 150 };

  const S = { IDLE: 'IDLE', DWELLING: 'DWELLING', PAUSED: 'PAUSED' };
  let state = S.IDLE;
  let dwellTimer = null;
  let resumeTimer = null;
  let activeWord = null;
  let isMouseInPopover = false;
  let isMouseInWord = false;
  let pausedByHover = false;
  let lastMouseX = 0;
  let lastMouseY = 0;
  let hasMousePos = false;

  let overlayEl = null;
  let popoverEl = null;
  let currentSentence = '';

  const lookupCache = new Map();
  const lookupPending = new Map();
  const sentenceCache = new Map();
  const sentencePending = new Map();
  const savedWords = new Set();

  const prefetchSeen = new Set();
  const prefetchQueue = [];
  let prefetchTimer = null;
  let prefetchWorking = false;

  const WORD_RE = /[A-Za-z]+(?:'[A-Za-z]+)?/g;

  async function loadSavedWords() {
    const cards = await FS().getAll();
    savedWords.clear();
    for (const card of cards) savedWords.add(card.word.toLowerCase());
  }

  function unique(list) {
    return [...new Set((list || []).filter(Boolean))];
  }

  function lookupWordViaBackground(word) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: 'LOOKUP_WORD', word }, (resp) => {
        if (chrome.runtime.lastError || !resp) {
          resolve(null);
          return;
        }
        resolve(resp);
      });
    });
  }

  async function lookupWord(word) {
    const key = String(word || '').toLowerCase();
    if (!key) return { translation: '', definition: '', phonetic: '', source: 'none' };
    if (lookupCache.has(key)) return lookupCache.get(key);
    if (lookupPending.has(key)) return lookupPending.get(key);

    const pending = (async () => {
      const lookupResp = await lookupWordViaBackground(key);
      const result =
        lookupResp && lookupResp.translation
          ? {
              translation: lookupResp.translation || '',
              definition: lookupResp.definition || '',
              phonetic: lookupResp.phonetic || '',
              source: lookupResp.source || 'online',
            }
          : {
              translation: '',
              definition: '',
              phonetic: '',
              source: 'none',
            };

      lookupCache.set(key, result);
      return result;
    })();

    lookupPending.set(key, pending);
    try {
      return await pending;
    } finally {
      lookupPending.delete(key);
    }
  }

  function normalizeSentenceKey(text) {
    return String(text || '').replace(/\s+/g, ' ').trim();
  }

  function translateSentenceOnline(text) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: 'TRANSLATE_SENTENCE', text }, (resp) => {
        if (chrome.runtime.lastError || !resp) {
          resolve('');
          return;
        }
        resolve(String(resp.translation || '').trim());
      });
    });
  }

  function setCaptionTranslation(sentenceKey, translation) {
    if (!overlayEl) return;
    if (normalizeSentenceKey(currentSentence) !== sentenceKey) return;

    const zhLine = overlayEl.querySelector('.si-caption-zh');
    if (!zhLine) return;

    zhLine.classList.remove('si-loading');
    zhLine.textContent = translation || '';
  }

  async function requestSentenceTranslation(text, sentenceKey) {
    if (!sentenceKey || sentencePending.has(sentenceKey) || sentenceCache.has(sentenceKey)) return;
    if (!/[A-Za-z]/.test(sentenceKey)) {
      sentenceCache.set(sentenceKey, '');
      setCaptionTranslation(sentenceKey, '');
      return;
    }

    const pending = (async () => {
      let translated = '';
      try {
        translated = await translateSentenceOnline(text);
      } catch (_) {}

      sentenceCache.set(sentenceKey, translated || '');
      setCaptionTranslation(sentenceKey, translated || '');
      return translated;
    })();

    sentencePending.set(sentenceKey, pending);
    try {
      await pending;
    } finally {
      sentencePending.delete(sentenceKey);
    }
  }

  function enqueuePrefetchFromCaption(text) {
    if (!text) return;

    const words = unique((text.match(WORD_RE) || []).map((w) => w.toLowerCase()))
      .filter((w) => w.length >= 3)
      .slice(0, 12);

    words.forEach((w) => {
      if (lookupCache.has(w) || lookupPending.has(w) || prefetchSeen.has(w)) return;
      prefetchSeen.add(w);
      prefetchQueue.push(w);
    });

    if (!prefetchTimer) runPrefetchQueue();
  }

  function runPrefetchQueue() {
    if (prefetchTimer) return;
    prefetchTimer = setInterval(async () => {
      if (prefetchWorking) return;
      if (!prefetchQueue.length) {
        clearInterval(prefetchTimer);
        prefetchTimer = null;
        return;
      }

      const word = prefetchQueue.shift();
      if (!word || lookupCache.has(word) || lookupPending.has(word)) return;

      prefetchWorking = true;
      try {
        await lookupWord(word);
      } catch (_) {}
      finally {
        prefetchWorking = false;
      }
    }, 220);
  }

  function ensureOverlay() {
    if (!overlayEl) {
      overlayEl = document.createElement('div');
      overlayEl.className = 'si-caption-overlay';
      overlayEl.id = 'si-caption-overlay';
      const container =
        document.querySelector('#movie_player') || document.querySelector('.html5-video-player');
      (container || document.body).appendChild(overlayEl);
    }
    return overlayEl;
  }

  function renderCaption(text) {
    if (!text) return;
    if (state === S.PAUSED) return; // freeze overlay while paused to avoid hover state loss
    if (text === currentSentence) return;

    currentSentence = text;
    const overlay = ensureOverlay();
    overlay.innerHTML = '';

    const enDiv = document.createElement('div');
    enDiv.className = 'si-caption-en';

    let lastIndex = 0;
    const re = new RegExp(WORD_RE.source, 'g');
    let match;

    while ((match = re.exec(text)) !== null) {
      if (match.index > lastIndex) {
        enDiv.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
      }

      const span = document.createElement('span');
      span.className = 'si-word';
      span.textContent = match[0];
      span.dataset.word = match[0];
      if (savedWords.has(match[0].toLowerCase())) span.classList.add('si-word-saved');
      span.addEventListener('mouseenter', () => onWordEnter(span.dataset.word, span));
      span.addEventListener('mouseleave', onWordLeave);
      enDiv.appendChild(span);

      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
      enDiv.appendChild(document.createTextNode(text.slice(lastIndex)));
    }

    const sentenceKey = normalizeSentenceKey(text);
    const zhDiv = document.createElement('div');
    zhDiv.className = 'si-caption-zh';
    if (sentenceKey && sentenceCache.has(sentenceKey)) {
      zhDiv.textContent = sentenceCache.get(sentenceKey) || '';
    } else {
      zhDiv.textContent = '';
      if (sentenceKey) {
        zhDiv.classList.add('si-loading');
        requestSentenceTranslation(text, sentenceKey);
      }
    }

    overlay.appendChild(enDiv);
    overlay.appendChild(zhDiv);
  }

  function ensurePopover() {
    if (!popoverEl) {
      popoverEl = document.createElement('div');
      popoverEl.className = 'si-popover';
      popoverEl.id = 'si-word-popover';
      popoverEl.setAttribute('role', 'tooltip');

      popoverEl.addEventListener('mouseenter', () => {
        isMouseInPopover = true;
        cancelResume();
      });

      popoverEl.addEventListener('mouseleave', () => {
        isMouseInPopover = false;
        if (!isMouseInWord) scheduleResume();
      });

      document.body.appendChild(popoverEl);
    }
    return popoverEl;
  }

  function heartIconSvg(filled) {
    return `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 20.6l-1.1-1C6.2 15.3 3 12.4 3 8.9 3 6.2 5.1 4 7.8 4c1.6 0 3.2.8 4.2 2.1C13 4.8 14.6 4 16.2 4 18.9 4 21 6.2 21 8.9c0 3.5-3.2 6.4-7.9 10.7l-1.1 1z"
          ${filled ? 'fill="currentColor"' : 'fill="none"'}
          stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    `;
  }

  function positionPopover(span) {
    if (!popoverEl || !span) return;
    const spanRect = span.getBoundingClientRect();

    popoverEl.style.visibility = 'hidden';
    popoverEl.style.display = 'flex';
    const popRect = popoverEl.getBoundingClientRect();
    popoverEl.style.visibility = '';

    let top = spanRect.top - popRect.height - 10;
    let left = spanRect.left + spanRect.width / 2 - popRect.width / 2;

    if (top < 8) top = spanRect.bottom + 10;
    top = Math.max(8, Math.min(top, window.innerHeight - popRect.height - 8));
    left = Math.max(8, Math.min(left, window.innerWidth - popRect.width - 8));

    popoverEl.style.top = top + 'px';
    popoverEl.style.left = left + 'px';
  }

  function updateOverlayWordState(word, saved) {
    if (!overlayEl) return;
    const lw = word.toLowerCase();
    overlayEl.querySelectorAll('.si-word').forEach((s) => {
      if ((s.dataset.word || '').toLowerCase() === lw) {
        s.classList.toggle('si-word-saved', saved);
      }
    });
  }

  async function showPopover(word, span) {
    const sentence = currentSentence;
    const popover = ensurePopover();
    const isSaved = savedWords.has(word.toLowerCase());
    let currentTranslation = '';

    popover.innerHTML = `
      <span class="si-popover-translation si-loading">Querying...</span>
      <button class="si-save-btn${isSaved ? ' si-saved' : ''}"
              title="${isSaved ? 'Remove word' : 'Add word'}"
              aria-label="${isSaved ? 'Remove word' : 'Add word'}">
        ${heartIconSvg(isSaved)}
      </button>
    `;

    popover.removeAttribute('title');
    positionPopover(span);

    const saveBtn = popover.querySelector('.si-save-btn');
    saveBtn.addEventListener('click', async () => {
      const lw = word.toLowerCase();
      if (savedWords.has(lw)) {
        await FS().removeByWord(word);
        savedWords.delete(lw);
        saveBtn.className = 'si-save-btn';
        saveBtn.title = 'Add word';
        saveBtn.setAttribute('aria-label', 'Add word');
        saveBtn.innerHTML = heartIconSvg(false);
        updateOverlayWordState(word, false);
      } else {
        await FS().add({
          word,
          translation: currentTranslation || '',
          sentence,
          videoId: PC().getVideoId(),
          tMs: PC().getCurrentTimeMs(),
        });
        savedWords.add(lw);
        saveBtn.className = 'si-save-btn si-saved';
        saveBtn.title = 'Remove word';
        saveBtn.setAttribute('aria-label', 'Remove word');
        saveBtn.innerHTML = heartIconSvg(true);
        updateOverlayWordState(word, true);
      }
    });

    const lookup = await lookupWord(word);

    if (!activeWord || activeWord.word !== word || state !== S.PAUSED || !popoverEl) return;

    const transEl = popover.querySelector('.si-popover-translation');
    currentTranslation = lookup.translation || 'No translation found';
    if (transEl) {
      transEl.classList.remove('si-loading');
      transEl.textContent = currentTranslation;
    }

    const details = [lookup.phonetic, lookup.definition].filter(Boolean).join('  ');
    if (details) popover.title = details;
    else popover.removeAttribute('title');

    if (activeWord?.span) positionPopover(activeWord.span);
  }

  function hidePopover() {
    if (popoverEl) popoverEl.style.display = 'none';
    isMouseInPopover = false;
  }

  function scheduleResume() {
    cancelResume();
    resumeTimer = setTimeout(() => {
      refreshHoverFlagsFromPointer();
      if (isMouseInWord || isMouseInPopover) {
        scheduleResume(); // keep retrying until cursor fully leaves
        return;
      }

      state = S.IDLE;
      activeWord = null;
      hidePopover();

      const shouldResume = pausedByHover;
      pausedByHover = false;
      if (shouldResume && PC().isPaused()) PC().play();
    }, settings.resumeDelayMs);
  }

  function cancelResume() {
    if (resumeTimer) {
      clearTimeout(resumeTimer);
      resumeTimer = null;
    }
  }

  function onWordEnter(word, span) {
    isMouseInWord = true;
    cancelResume();

    if (state === S.PAUSED && activeWord?.word === word) return;

    if (state === S.DWELLING) clearTimeout(dwellTimer);

    state = S.DWELLING;
    activeWord = { word, span };

    dwellTimer = setTimeout(() => {
      if (state !== S.DWELLING) return;
      if (!activeWord || activeWord.word !== word) return;

      state = S.PAUSED;
      if (!PC().isPaused()) {
        PC().pause();
        pausedByHover = true;
      }
      showPopover(word, span);
    }, settings.dwellMs);
  }

  function onWordLeave() {
    isMouseInWord = false;

    if (state === S.DWELLING) {
      clearTimeout(dwellTimer);
      state = S.IDLE;
      activeWord = null;
      return;
    }

    if (state === S.PAUSED) scheduleResume();
  }

  function onDocumentMouseMove(e) {
    if (state !== S.PAUSED) return;
    hasMousePos = true;
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;

    const rawTarget = e.target;
    const target =
      rawTarget && rawTarget.nodeType === Node.TEXT_NODE ? rawTarget.parentElement : rawTarget;
    updateHoverFlagsFromElement(target && target.nodeType === Node.ELEMENT_NODE ? target : null);

    if (!isMouseInWord && !isMouseInPopover) scheduleResume();
  }

  function updateHoverFlagsFromElement(element) {
    if (!element) {
      isMouseInWord = false;
      isMouseInPopover = false;
      return;
    }
    isMouseInWord = !!element.closest('.si-word');
    isMouseInPopover = !!(popoverEl && popoverEl.contains(element));
  }

  function refreshHoverFlagsFromPointer() {
    if (!hasMousePos) return;
    const element = document.elementFromPoint(lastMouseX, lastMouseY);
    updateHoverFlagsFromElement(element);
  }

  function onDocumentMouseLeave() {
    if (state !== S.PAUSED) return;
    hasMousePos = false;
    isMouseInWord = false;
    isMouseInPopover = false;
    scheduleResume();
  }

  function onWindowBlur() {
    if (state !== S.PAUSED) return;
    hasMousePos = false;
    isMouseInWord = false;
    isMouseInPopover = false;
    scheduleResume();
  }

  function activate(opts = {}) {
    settings = { ...settings, ...opts };
    state = S.IDLE;
    pausedByHover = false;
    loadSavedWords(); // async, non-blocking
    ensureOverlay();
    if (overlayEl) overlayEl.style.display = 'flex';
    document.addEventListener('mousemove', onDocumentMouseMove, true);
    document.addEventListener('mouseleave', onDocumentMouseLeave, true);
    window.addEventListener('blur', onWindowBlur, true);
  }

  function deactivate() {
    cancelResume();
    clearTimeout(dwellTimer);
    hidePopover();

    if (overlayEl) {
      overlayEl.style.display = 'none';
      overlayEl.innerHTML = '';
    }

    document.removeEventListener('mousemove', onDocumentMouseMove, true);
    document.removeEventListener('mouseleave', onDocumentMouseLeave, true);
    window.removeEventListener('blur', onWindowBlur, true);

    state = S.IDLE;
    activeWord = null;
    isMouseInWord = false;
    isMouseInPopover = false;
    pausedByHover = false;
    hasMousePos = false;
    currentSentence = '';

    prefetchQueue.length = 0;
    if (prefetchTimer) {
      clearInterval(prefetchTimer);
      prefetchTimer = null;
    }
    prefetchWorking = false;
  }

  function destroy() {
    deactivate();

    if (overlayEl) {
      overlayEl.remove();
      overlayEl = null;
    }
    if (popoverEl) {
      popoverEl.remove();
      popoverEl = null;
    }

    lookupCache.clear();
    lookupPending.clear();
    sentenceCache.clear();
    sentencePending.clear();
    savedWords.clear();
    prefetchSeen.clear();
    prefetchQueue.length = 0;

    if (prefetchTimer) {
      clearInterval(prefetchTimer);
      prefetchTimer = null;
    }
    prefetchWorking = false;
  }

  // Backward-compatible no-op.
  function setCaptionMode() {}

  function onCaption(text) {
    renderCaption(text);
    enqueuePrefetchFromCaption(text);
  }

  return { activate, deactivate, destroy, onCaption, setCaptionMode };
})();
