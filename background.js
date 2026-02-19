// ShadowInput background service worker (MV3)
// Lookup flow: cache -> Google translate endpoint -> DeepSeek fallback (optional).

const SETTINGS_KEY = 'si_settings';
const LOOKUP_CACHE_KEY = 'si_lookup_cache';
const LOOKUP_CACHE_LIMIT = 12000;
const LOOKUP_CACHE_MAX_BYTES = 6 * 1024 * 1024;
const LOCAL_DICT_SCRIPT = 'content/local-dict-data.js';

const GOOGLE_TRANSLATE_ENDPOINT = 'https://translate.googleapis.com/translate_a/single';
const DEEPSEEK_ENDPOINT = 'https://api.deepseek.com/v1/chat/completions';
const DEEPSEEK_MODEL = 'deepseek-chat';

const UTF8_ENCODER = new TextEncoder();

let lookupCache = null;
let localDict = null;
let localDictInitTried = false;

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
    const localHit = lookupFromLocalDict(word);
    if (localHit) return localHit;

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
  const items = Object.keys(cache).map((k) => ({
    k,
    ts: Number(cache[k]?.ts || 0),
    size: estimateEntrySize(k, cache[k]),
  }));

  let totalBytes = items.reduce((sum, it) => sum + it.size, 0);
  if (items.length <= LOOKUP_CACHE_LIMIT && totalBytes <= LOOKUP_CACHE_MAX_BYTES) return;

  items.sort((a, b) => a.ts - b.ts);

  for (const item of items) {
    if (Object.keys(cache).length <= LOOKUP_CACHE_LIMIT && totalBytes <= LOOKUP_CACHE_MAX_BYTES) {
      break;
    }
    if (!cache[item.k]) continue;
    delete cache[item.k];
    totalBytes -= item.size;
  }
}

function estimateEntrySize(key, entry) {
  return (
    UTF8_ENCODER.encode(String(key || '')).length +
    UTF8_ENCODER.encode(JSON.stringify(entry || {})).length +
    32
  );
}

function lookupFromLocalDict(rawWord) {
  const dict = ensureLocalDictLoaded();
  if (!dict) return null;

  const forms = buildVariantForms(rawWord);
  for (const form of forms) {
    const hit = normalizeLocalEntry(dict[form]);
    if (!hit) continue;
    if (!hit.translation && !hit.definition) continue;
    return {
      translation: hit.translation || hit.definition || '',
      definition: hit.definition || '',
      phonetic: hit.phonetic || '',
      source: 'local',
    };
  }
  return null;
}

function ensureLocalDictLoaded() {
  if (localDict) return localDict;
  if (localDictInitTried) return localDict;
  localDictInitTried = true;

  try {
    self.ShadowInput = self.ShadowInput || {};
    importScripts(chrome.runtime.getURL(LOCAL_DICT_SCRIPT));
    const data = self.ShadowInput?.LocalDictData;
    if (data && typeof data === 'object') {
      localDict = data;
    }
  } catch (_) {
    localDict = null;
  }

  return localDict;
}

function normalizeLocalEntry(entry) {
  if (!entry || typeof entry !== 'object') return null;
  return {
    translation: String(entry.t || entry.translation || '').trim(),
    definition: String(entry.d || entry.definition || '').trim(),
    phonetic: String(entry.p || entry.phonetic || '').trim(),
  };
}

function unique(list) {
  return [...new Set((list || []).filter(Boolean))];
}

function buildVariantForms(rawWord) {
  const word = String(rawWord || '').toLowerCase();
  const forms = [word];

  if (word.endsWith("'s")) forms.push(word.slice(0, -2));
  if (word.endsWith('s') && word.length > 3) forms.push(word.slice(0, -1));
  if (word.endsWith('es') && word.length > 4) forms.push(word.slice(0, -2));
  if (word.endsWith('ies') && word.length > 4) forms.push(word.slice(0, -3) + 'y');

  if (word.endsWith('ing') && word.length > 5) {
    forms.push(word.slice(0, -3));
    forms.push(word.slice(0, -3) + 'e');
    if (word.length > 6 && word[word.length - 4] === word[word.length - 5]) {
      forms.push(word.slice(0, -4));
    }
  }

  if (word.endsWith('ed') && word.length > 4) {
    forms.push(word.slice(0, -2));
    forms.push(word.slice(0, -1));
    forms.push(word.slice(0, -2) + 'e');
    if (word.length > 5 && word[word.length - 3] === word[word.length - 4]) {
      forms.push(word.slice(0, -3));
    }
  }

  if (word.endsWith('er') && word.length > 4) forms.push(word.slice(0, -2));
  if (word.endsWith('est') && word.length > 5) forms.push(word.slice(0, -3));

  return unique(forms);
}
