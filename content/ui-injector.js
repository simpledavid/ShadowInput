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
          <path class="si-icon-glyph" d="M16.8 6.8C16.8 4.8 8.8 4.8 8.8 7.3C8.8 10.1 16.2 9.4 16.2 12.5C16.2 15.2 9.6 15.9 7.4 13.9"></path>
          <path class="si-icon-glyph-tail" d="M7.1 17.4H14.8"></path>
          <circle class="si-icon-node" cx="18.6" cy="6.1" r="1.55"></circle>
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
