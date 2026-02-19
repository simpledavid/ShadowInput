// UIInjector - injects the learning mode toggle button and notices into YouTube.
// Exposed as window.ShadowInput.UIInjector

var ShadowInput = ShadowInput || {};

ShadowInput.UIInjector = (() => {
  let toggleBtnEl = null;
  let onToggleLearning = null;
  let noticeEl = null;

  function injectToggleButton(callbacks = {}) {
    if (typeof callbacks.onToggleLearning === 'function') {
      onToggleLearning = callbacks.onToggleLearning;
    }

    if (!toggleBtnEl) {
      toggleBtnEl = document.createElement('button');
      toggleBtnEl.className = 'si-toggle-btn ytp-button';
      toggleBtnEl.id = 'si-toggle-btn';
      toggleBtnEl.title = 'Enter Learning Mode';
      toggleBtnEl.innerHTML = `
        <svg class="si-toggle-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path class="si-icon-frame" d="M6 3.5H14.5L20.5 9V20.5H9L3.5 15V6Z"></path>
          <path class="si-icon-glyph" d="M15.4 8.2C15.4 6.1 10.1 6.1 10.1 8.4C10.1 10.9 15.1 10.4 15.1 13C15.1 15.3 10.5 15.8 8.9 14.4"></path>
          <circle class="si-icon-node" cx="17.6" cy="6.2" r="1.15"></circle>
        </svg>
      `;
      toggleBtnEl.addEventListener('click', (e) => {
        e.stopPropagation();
        if (onToggleLearning) onToggleLearning();
      });
    }

    attachToggleBtn();
    return toggleBtnEl;
  }

  // Insert right after the fullscreen button when controls are available.
  function attachToggleBtn() {
    let attempts = 0;

    function tryInsert() {
      const fullscreenBtn = document.querySelector('.ytp-fullscreen-button');
      if (fullscreenBtn && fullscreenBtn.parentElement && toggleBtnEl) {
        fullscreenBtn.parentElement.insertBefore(toggleBtnEl, fullscreenBtn.nextSibling);
        return;
      }

      if (++attempts < 40) {
        setTimeout(tryInsert, 250);
      }
    }

    tryInsert();
  }

  function setToggleActive(active) {
    if (!toggleBtnEl) return;
    toggleBtnEl.classList.toggle('si-active', active);
    toggleBtnEl.title = active ? 'Exit Learning Mode' : 'Enter Learning Mode';
  }

  function showNoCaptionNotice() {
    if (noticeEl) return;
    noticeEl = document.createElement('div');
    noticeEl.className = 'si-notice si-notice-warn';
    noticeEl.id = 'si-no-caption-notice';
    noticeEl.textContent = 'No captions detected. Turn on YouTube captions (CC).';
    document.body.appendChild(noticeEl);
  }

  function hideNoCaptionNotice() {
    if (noticeEl) {
      noticeEl.remove();
      noticeEl = null;
    }
  }

  // Backward-compatible no-op methods kept to avoid breaking older callers.
  function injectSettingsPanel() {}
  function showPanel() {}
  function hidePanel() {}
  function updatePanelLearningState() {}
  function updatePanelCaptionMode() {}
  function updatePanelApiKey() {}

  function destroy() {
    if (toggleBtnEl) {
      toggleBtnEl.remove();
      toggleBtnEl = null;
    }

    if (noticeEl) {
      noticeEl.remove();
      noticeEl = null;
    }

    onToggleLearning = null;
  }

  return {
    injectToggleButton,
    setToggleActive,
    injectSettingsPanel,
    showPanel,
    hidePanel,
    updatePanelLearningState,
    updatePanelCaptionMode,
    updatePanelApiKey,
    showNoCaptionNotice,
    hideNoCaptionNotice,
    destroy,
  };
})();
