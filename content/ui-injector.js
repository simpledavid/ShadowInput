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
        <svg class="si-toggle-icon" viewBox="0 0 10 10" shape-rendering="crispEdges" aria-hidden="true">
          <rect x="1" y="1" width="3" height="8"></rect>
          <rect x="6" y="1" width="3" height="8"></rect>
          <rect x="4" y="2" width="2" height="1"></rect>
          <rect x="4" y="7" width="2" height="1"></rect>
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
