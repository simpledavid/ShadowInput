// ShadowInput Local Dictionary loader.
// Uses generated `ShadowInput.LocalDictData` when available.
// Exposed as window.ShadowInput.LocalDict

var ShadowInput = ShadowInput || {};

ShadowInput.LocalDict = (() => {
  const fallback = {
    hello: { t: "你好", p: "həˈləʊ", d: "used as a greeting" },
    world: { t: "世界", p: "wɜːld", d: "the earth and all people/things on it" },
    learning: { t: "学习", p: "ˈlɜːnɪŋ", d: "the activity of gaining knowledge" },
  };

  const source =
    ShadowInput.LocalDictData && typeof ShadowInput.LocalDictData === "object"
      ? ShadowInput.LocalDictData
      : fallback;

  const dict = source;
  let dictSize = null;

  function normalizeWord(word) {
    return String(word || "").trim().toLowerCase();
  }

  function normalizeEntry(entry) {
    if (!entry || typeof entry !== "object") return null;
    const translation = String(entry.t || entry.translation || "").trim();
    const phonetic = String(entry.p || entry.phonetic || "").trim();
    const definition = String(entry.d || entry.definition || "").trim();
    if (!translation && !definition) return null;
    return { translation, phonetic, definition };
  }

  function lookup(word) {
    const key = normalizeWord(word);
    if (!key) return null;
    return normalizeEntry(dict[key]);
  }

  function has(word) {
    const key = normalizeWord(word);
    if (!key) return false;
    return Object.prototype.hasOwnProperty.call(dict, key);
  }

  function size() {
    if (dictSize == null) dictSize = Object.keys(dict).length;
    return dictSize;
  }

  return { lookup, has, size };
})();

