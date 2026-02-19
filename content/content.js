// ShadowInput - Main content script.
// Single mode: Word Hover + theater mode on entry.

(function () {
  'use strict';

  if (window.__shadowInputLoaded) return;
  window.__shadowInputLoaded = true;

  const CP = ShadowInput.CaptionProvider;
  const PC = ShadowInput.PlayerController;
  const WH = ShadowInput.WordHoverMode;
  const UI = ShadowInput.UIInjector;

  let settings = {
    dwellMs: 80,
    resumeDelayMs: 150,
  };

  let isLearningMode = false;
  let captionReceived = false;
  let captionTimeoutId = null;
  let unsubLive = null;

  async function init() {
    await loadSettings();
    cleanupLegacyUi();
    waitForPlayer(() => {
      UI.injectToggleButton({ onToggleLearning: toggleLearningMode });
    });
  }

  // Remove leftover UI from older builds (panel/loop/transcript).
  function cleanupLegacyUi() {
    [
      '#si-settings-panel',
      '#si-control-bar',
      '#si-loop-panel',
      '#si-transcript-panel',
    ].forEach((sel) => {
      const el = document.querySelector(sel);
      if (el) el.remove();
    });
  }

  function waitForPlayer(cb) {
    const check = () => {
      if (document.querySelector('#movie_player') || document.querySelector('video')) {
        cb();
      } else {
        setTimeout(check, 300);
      }
    };
    check();
  }

  async function loadSettings() {
    return new Promise((resolve) => {
      chrome.storage.local.get('si_settings', (data) => {
        if (data.si_settings) settings = { ...settings, ...data.si_settings };
        resolve();
      });
    });
  }

  let theaterWasActiveBeforeLearning = false;

  function isTheaterMode() {
    const flexy = document.querySelector('ytd-watch-flexy');
    return flexy ? flexy.hasAttribute('theater') : false;
  }

  function clickTheaterButton() {
    const btn = document.querySelector('.ytp-size-button');
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  }

  // Hide native YouTube captions while ShadowInput overlay is active.
  let nativeCaptionStyle = null;

  function hideNativeCaptions() {
    if (nativeCaptionStyle) return;
    nativeCaptionStyle = document.createElement('style');
    nativeCaptionStyle.id = 'si-hide-native-captions';
    nativeCaptionStyle.textContent = '.ytp-caption-window-container { visibility: hidden !important; }';
    document.head.appendChild(nativeCaptionStyle);
  }

  function showNativeCaptions() {
    if (nativeCaptionStyle) {
      nativeCaptionStyle.remove();
      nativeCaptionStyle = null;
    }
  }

  function toggleLearningMode() {
    if (isLearningMode) {
      exitLearningMode();
    } else {
      enterLearningMode();
    }
  }

  function enterLearningMode() {
    isLearningMode = true;
    captionReceived = false;

    theaterWasActiveBeforeLearning = isTheaterMode();
    if (!theaterWasActiveBeforeLearning) clickTheaterButton();

    hideNativeCaptions();
    UI.setToggleActive(true);

    WH.activate({
      dwellMs: settings.dwellMs,
      resumeDelayMs: settings.resumeDelayMs,
    });

    unsubLive = CP.onLiveCaption((text) => {
      if (!isLearningMode) return;

      if (!captionReceived) {
        captionReceived = true;
        if (captionTimeoutId) {
          clearTimeout(captionTimeoutId);
          captionTimeoutId = null;
        }
      }

      UI.hideNoCaptionNotice();
      WH.onCaption(text);
    });
    CP.start();

    captionTimeoutId = setTimeout(() => {
      if (!captionReceived) UI.showNoCaptionNotice();
    }, 3000);
  }

  function exitLearningMode() {
    isLearningMode = false;

    WH.deactivate();
    CP.stop();

    if (unsubLive) {
      unsubLive();
      unsubLive = null;
    }
    if (captionTimeoutId) {
      clearTimeout(captionTimeoutId);
      captionTimeoutId = null;
    }

    UI.setToggleActive(false);
    UI.hideNoCaptionNotice();
    showNativeCaptions();

    if (!theaterWasActiveBeforeLearning && isTheaterMode()) clickTheaterButton();
    if (PC.isPaused()) PC.play();
  }

  let lastVideoId = PC.getVideoId();

  function onNavigate() {
    const vid = PC.getVideoId();
    if (!vid || vid === lastVideoId) return;
    lastVideoId = vid;

    cleanupLegacyUi();

    if (isLearningMode) exitLearningMode();

    setTimeout(() => {
      waitForPlayer(() => {
        if (!document.querySelector('#si-toggle-btn')) {
          UI.injectToggleButton({ onToggleLearning: toggleLearningMode });
        }
      });
    }, 800);
  }

  document.addEventListener('yt-navigate-finish', onNavigate);
  document.addEventListener('yt-page-data-updated', onNavigate);

  const urlCheckInterval = setInterval(() => {
    const vid = PC.getVideoId();
    if (vid && vid !== lastVideoId) onNavigate();
  }, 1500);

  window.addEventListener('beforeunload', () => {
    clearInterval(urlCheckInterval);
    if (isLearningMode) exitLearningMode();
    WH.destroy();
    UI.destroy();
  });

  init();
  window.__shadowInput = { CP, PC, WH, UI, settings };
})();
