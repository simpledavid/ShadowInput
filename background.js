// ShadowInput background service worker (MV3)
// Lookup flow: cache -> Google translate endpoint -> DeepSeek fallback (optional).

const SETTINGS_KEY = 'si_settings';
const LOOKUP_CACHE_KEY = 'si_lookup_cache';
const LOOKUP_CACHE_LIMIT = 20000;

const GOOGLE_TRANSLATE_ENDPOINT = 'https://translate.googleapis.com/translate_a/single';
const DEEPSEEK_ENDPOINT = 'https://api.deepseek.com/v1/chat/completions';
const DEEPSEEK_MODEL = 'deepseek-chat';

let lookupCache = null;

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(SETTINGS_KEY, (data) => {
    if (!data[SETTINGS_KEY]) {
      chrome.storage.local.set({ [SETTINGS_KEY]: getDefaultSettings() });
    }
  });
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === 'LOOKUP_WORD') {
    handleLookupWord(msg.word).then(sendResponse);
    return true;
  }

  if (msg?.type === 'TRANSLATE_SENTENCE') {
    handleTranslateSentence(msg.text).then(sendResponse);
    return true;
  }
});

function getDefaultSettings() {
  return {
    dwellMs: 80,
    resumeDelayMs: 150,
    deepseekApiKey: '',
  };
}

function storageGet(key) {
  return new Promise((resolve) => {
    chrome.storage.local.get(key, (data) => resolve(data[key]));
  });
}

function storageSet(obj) {
  return new Promise((resolve) => {
    chrome.storage.local.set(obj, resolve);
  });
}

async function getLookupCache() {
  if (lookupCache) return lookupCache;
  const cached = await storageGet(LOOKUP_CACHE_KEY);
  lookupCache = cached && typeof cached === 'object' ? cached : {};
  return lookupCache;
}

async function saveLookupCache(cache) {
  await storageSet({ [LOOKUP_CACHE_KEY]: cache });
}

async function getDeepSeekApiKey() {
  const settings = (await storageGet(SETTINGS_KEY)) || {};
  return String(settings.deepseekApiKey || '').trim();
}

async function handleLookupWord(rawWord) {
  const word = String(rawWord || '').trim().toLowerCase();
  if (!word) return { error: 'empty_word', translation: '', definition: '', phonetic: '' };

  try {
    const cache = await getLookupCache();
    if (cache[word]) return { ...cache[word], source: 'cache' };

    let entry = null;

    const googleTranslation = await fetchGoogleWordTranslation(word);
    if (googleTranslation) {
      entry = {
        translation: googleTranslation,
        definition: '',
        phonetic: '',
        source: 'google',
        ts: Date.now(),
      };
    }

    if (!entry) {
      const deepseek = await fetchDeepSeekWordLookup(word);
      if (deepseek && deepseek.translation) {
        entry = {
          translation: deepseek.translation || '',
          definition: deepseek.definition || '',
          phonetic: deepseek.phonetic || '',
          source: 'deepseek',
          ts: Date.now(),
        };
      }
    }

    if (!entry) {
      return { error: 'not_found', translation: '', definition: '', phonetic: '' };
    }

    cache[word] = entry;
    pruneCache(cache);
    await saveLookupCache(cache);
    return entry;
  } catch (err) {
    return {
      error: 'lookup_failed',
      detail: String(err?.message || err),
      translation: '',
      definition: '',
      phonetic: '',
    };
  }
}

async function handleTranslateSentence(rawText) {
  const text = String(rawText || '').trim();
  if (!text) return { translation: '', source: 'none' };

  try {
    const translation = await fetchGoogleTranslation(text);
    if (translation) return { translation, source: 'google' };

    const deepseek = await fetchDeepSeekSentenceTranslation(text);
    if (deepseek) return { translation: deepseek, source: 'deepseek' };

    return { translation: '', source: 'none' };
  } catch (_) {
    return { translation: '', source: 'none' };
  }
}

async function fetchGoogleWordTranslation(word) {
  return fetchGoogleTranslation(word);
}

async function fetchGoogleTranslation(textToTranslate) {
  const url =
    `${GOOGLE_TRANSLATE_ENDPOINT}?client=gtx&sl=en&tl=zh-CN&dt=t` +
    `&q=${encodeURIComponent(textToTranslate)}`;

  const resp = await fetch(url, { method: 'GET' });
  if (!resp.ok) return '';

  const text = await resp.text();
  if (!text) return '';

  let data;
  try {
    data = JSON.parse(text);
  } catch (_) {
    return '';
  }

  const parts = Array.isArray(data?.[0]) ? data[0] : [];
  return parts
    .map((seg) => (Array.isArray(seg) ? seg[0] : ''))
    .filter(Boolean)
    .join('')
    .trim();
}

async function fetchDeepSeekWordLookup(word) {
  const apiKey = await getDeepSeekApiKey();
  if (!apiKey) return null;

  const systemPrompt =
    'You are an English-to-Chinese dictionary helper. ' +
    'Return only JSON with keys: translation, definition, phonetic. ' +
    'Keep translation concise and natural.';

  const userPrompt = `word: "${word}"`;

  try {
    const resp = await fetch(DEEPSEEK_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 180,
        temperature: 0.1,
        response_format: { type: 'json_object' },
      }),
    });

    if (!resp.ok) return null;
    const json = await resp.json();
    const content = json?.choices?.[0]?.message?.content;
    if (!content) return null;

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (_) {
      return null;
    }

    return {
      translation: String(parsed.translation || '').trim(),
      definition: String(parsed.definition || '').trim(),
      phonetic: String(parsed.phonetic || '').trim(),
    };
  } catch (_) {
    return null;
  }
}

async function fetchDeepSeekSentenceTranslation(text) {
  const apiKey = await getDeepSeekApiKey();
  if (!apiKey) return '';

  try {
    const resp = await fetch(DEEPSEEK_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        messages: [
          {
            role: 'system',
            content:
              'Translate English to natural Chinese. Return only plain Chinese text, no quotes, no markdown.',
          },
          { role: 'user', content: text },
        ],
        max_tokens: 260,
        temperature: 0.1,
      }),
    });

    if (!resp.ok) return '';
    const json = await resp.json();
    return String(json?.choices?.[0]?.message?.content || '').trim();
  } catch (_) {
    return '';
  }
}

function pruneCache(cache) {
  const keys = Object.keys(cache);
  if (keys.length <= LOOKUP_CACHE_LIMIT) return;

  keys
    .map((k) => ({ k, ts: Number(cache[k]?.ts || 0) }))
    .sort((a, b) => a.ts - b.ts)
    .slice(0, keys.length - LOOKUP_CACHE_LIMIT)
    .forEach(({ k }) => {
      delete cache[k];
    });
}
