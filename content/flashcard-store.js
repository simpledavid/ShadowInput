// FlashcardStore – wraps chrome.storage.local for flashcard persistence.
// Exposed as window.ShadowInput.FlashcardStore

var ShadowInput = ShadowInput || {};

ShadowInput.FlashcardStore = (() => {
  const KEY = 'si_flashcards';

  async function getAll() {
    return new Promise((resolve) => {
      chrome.storage.local.get(KEY, (data) => {
        resolve(data[KEY] || []);
      });
    });
  }

  async function add(card) {
    const cards = await getAll();
    // Deduplicate by word+videoId
    const exists = cards.some(
      (c) => c.word.toLowerCase() === card.word.toLowerCase() && c.videoId === card.videoId
    );
    if (exists) return { duplicate: true };
    card.id = Date.now() + Math.random().toString(36).slice(2);
    card.createdAt = Date.now();
    cards.push(card);
    return new Promise((resolve) => {
      chrome.storage.local.set({ [KEY]: cards }, () => {
        resolve({ ok: true, count: cards.length });
      });
    });
  }

  async function remove(id) {
    const cards = await getAll();
    const filtered = cards.filter((c) => c.id !== id);
    return new Promise((resolve) => {
      chrome.storage.local.set({ [KEY]: filtered }, () => resolve({ ok: true }));
    });
  }

  async function exportJSON() {
    const cards = await getAll();
    return JSON.stringify(cards, null, 2);
  }

  async function exportCSV() {
    const cards = await getAll();
    const header = 'word,sentence,videoId,tMs,createdAt';
    const rows = cards.map((c) => {
      const esc = (s) => `"${String(s || '').replace(/"/g, '""')}"`;
      return [esc(c.word), esc(c.sentence), esc(c.videoId), c.tMs || '', c.createdAt].join(',');
    });
    return [header, ...rows].join('\n');
  }

  async function removeByWord(word) {
    const cards = await getAll();
    const filtered = cards.filter(
      (c) => c.word.toLowerCase() !== word.toLowerCase()
    );
    return new Promise((resolve) => {
      chrome.storage.local.set({ [KEY]: filtered }, () => resolve({ ok: true }));
    });
  }

  async function hasWord(word) {
    const cards = await getAll();
    return cards.some((c) => c.word.toLowerCase() === word.toLowerCase());
  }

  return { getAll, add, remove, removeByWord, hasWord, exportJSON, exportCSV };
})();
