// ShadowInput Options Script

const KEY = 'si_settings';

const DEFAULTS = {
  dwellMs: 80,
  resumeDelayMs: 150,
  deepseekApiKey: '',
};

function getFormValues() {
  return {
    dwellMs: parseInt(document.getElementById('dwell-ms').value, 10) || DEFAULTS.dwellMs,
    resumeDelayMs:
      parseInt(document.getElementById('resume-delay-ms').value, 10) || DEFAULTS.resumeDelayMs,
    deepseekApiKey: (document.getElementById('deepseek-key').value || '').trim(),
  };
}

function setFormValues(settings) {
  document.getElementById('dwell-ms').value = settings.dwellMs ?? DEFAULTS.dwellMs;
  document.getElementById('resume-delay-ms').value = settings.resumeDelayMs ?? DEFAULTS.resumeDelayMs;
  document.getElementById('deepseek-key').value = settings.deepseekApiKey ?? DEFAULTS.deepseekApiKey;
}

function showStatus(msg, color = '#4ade80') {
  const el = document.getElementById('save-status');
  el.textContent = msg;
  el.style.color = color;
  el.classList.add('visible');
  setTimeout(() => el.classList.remove('visible'), 2000);
}

async function loadSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get(KEY, (data) => {
      resolve({ ...DEFAULTS, ...(data[KEY] || {}) });
    });
  });
}

async function saveSettings(settings) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [KEY]: settings }, resolve);
  });
}

document.getElementById('save-btn').addEventListener('click', async () => {
  const values = getFormValues();
  await saveSettings(values);
  showStatus('Saved');
});

document.getElementById('reset-btn').addEventListener('click', async () => {
  setFormValues(DEFAULTS);
  await saveSettings(DEFAULTS);
  showStatus('Reset to defaults');
});

loadSettings().then(setFormValues);
