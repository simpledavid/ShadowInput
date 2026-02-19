/**
 * Build a large local dictionary from ECDICT CSV.
 *
 * Usage:
 *   node scripts/build_local_dict_from_ecdict.js
 *   node scripts/build_local_dict_from_ecdict.js --max=50000
 *
 * Output:
 *   content/local-dict-data.js
 */

const fs = require("fs");
const path = require("path");

const ECDICT_CSV_URL =
  "https://raw.githubusercontent.com/skywind3000/ECDICT/master/ecdict.csv";

const args = Object.fromEntries(
  process.argv
    .slice(2)
    .map((arg) => arg.replace(/^-+/, ""))
    .map((arg) => {
      const [k, v = "true"] = arg.split("=");
      return [k, v];
    })
);

const MAX_WORDS = Math.max(1000, Number(args.max || 50000));

const ROOT = path.join(__dirname, "..");
const OUTPUT_FILE = path.join(ROOT, "content", "local-dict-data.js");

async function main() {
  console.log(`[dict] Downloading ECDICT CSV from ${ECDICT_CSV_URL} ...`);
  const resp = await fetch(ECDICT_CSV_URL);
  if (!resp.ok) {
    throw new Error(`Download failed: ${resp.status} ${resp.statusText}`);
  }

  const csvText = await resp.text();
  console.log(`[dict] CSV size: ${Math.round(csvText.length / 1024 / 1024)} MB`);

  const parsed = parseECDICT(csvText);
  const top = pickTopEntries(parsed, MAX_WORDS);

  const out = buildOutput(top);
  fs.writeFileSync(OUTPUT_FILE, out, "utf8");

  console.log(`[dict] Wrote ${OUTPUT_FILE}`);
  console.log(`[dict] Entries kept: ${Object.keys(top).length}`);
}

function parseECDICT(csvText) {
  let rowIndex = -1;
  let header = null;
  const rows = [];

  parseCSV(csvText, (fields) => {
    rowIndex += 1;
    if (rowIndex === 0) {
      header = fields;
      return;
    }
    if (!fields || fields.length < 4) return;
    const row = toObject(header, fields);
    if (!row) return;
    rows.push(row);
  });

  return rows;
}

function parseCSV(text, onRow) {
  let field = "";
  let row = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        const next = text[i + 1];
        if (next === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      continue;
    }

    if (ch === ",") {
      row.push(field);
      field = "";
      continue;
    }

    if (ch === "\n") {
      row.push(field);
      onRow(row);
      row = [];
      field = "";
      continue;
    }

    if (ch === "\r") {
      continue;
    }

    field += ch;
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    onRow(row);
  }
}

function toObject(header, fields) {
  if (!Array.isArray(header) || header.length === 0) return null;
  const obj = {};
  for (let i = 0; i < header.length; i += 1) {
    const key = String(header[i] || "").trim();
    obj[key] = fields[i] == null ? "" : String(fields[i]);
  }
  return obj;
}

function pickTopEntries(rows, maxWords) {
  const list = [];

  for (const row of rows) {
    const word = normalizeWord(row.word);
    if (!word) continue;

    const translation = cleanTranslation(row.translation);
    const definition = cleanDefinition(row.definition);
    const phonetic = cleanPhonetic(row.phonetic);
    if (!translation && !definition) continue;

    const frq = rankNumber(row.frq);
    const bnc = rankNumber(row.bnc);
    const collins = rankNumber(row.collins);
    const oxford = rankNumber(row.oxford);
    const score = Math.min(frq, bnc);

    list.push({
      word,
      t: translation,
      d: definition,
      p: phonetic,
      score,
      collins,
      oxford,
    });
  }

  list.sort((a, b) => {
    if (a.score !== b.score) return a.score - b.score;
    if (a.collins !== b.collins) return b.collins - a.collins;
    if (a.oxford !== b.oxford) return b.oxford - a.oxford;
    return a.word < b.word ? -1 : a.word > b.word ? 1 : 0;
  });

  const out = Object.create(null);
  for (const item of list) {
    if (Object.prototype.hasOwnProperty.call(out, item.word)) continue;
    out[item.word] = { t: item.t, p: item.p, d: item.d };
    if (Object.keys(out).length >= maxWords) break;
  }

  return out;
}

function normalizeWord(word) {
  const w = String(word || "").trim().toLowerCase();
  if (!w) return "";
  if (w.length < 2 || w.length > 32) return "";
  if (!/^[a-z][a-z'-]*$/.test(w)) return "";
  if (w.includes("--")) return "";
  if (w.startsWith("'") || w.endsWith("'")) return "";
  return w;
}

function cleanTranslation(text) {
  let s = String(text || "");
  if (!s) return "";
  s = s
    .replace(/\r/g, "")
    .replace(/\n+/g, "; ")
    .replace(/\s+/g, " ")
    .replace(/\[[^\]]*?\]/g, "")
    .trim();

  if (!s) return "";
  const parts = s
    .split(";")
    .map((p) => p.trim())
    .filter(Boolean);
  s = parts.slice(0, 2).join("; ");

  if (s.length > 72) s = s.slice(0, 72).trim();
  return s;
}

function cleanDefinition(text) {
  let s = String(text || "");
  if (!s) return "";
  s = s
    .replace(/\r/g, "")
    .replace(/\n+/g, "; ")
    .replace(/\s+/g, " ")
    .trim();

  if (!s) return "";
  const parts = s
    .split(";")
    .map((p) => p.trim())
    .filter(Boolean);
  s = parts.slice(0, 2).join("; ");

  if (s.length > 140) s = s.slice(0, 140).trim();
  return s;
}

function cleanPhonetic(text) {
  let s = String(text || "").trim();
  if (!s) return "";
  if (s.length > 64) s = s.slice(0, 64).trim();
  return s;
}

function rankNumber(v) {
  const n = Number.parseInt(String(v || "").trim(), 10);
  if (!Number.isFinite(n) || n <= 0) return 999999;
  return n;
}

function buildOutput(dictObj) {
  const count = Object.keys(dictObj).length;
  const generatedAt = new Date().toISOString();
  return (
    "/* Auto-generated local dictionary data.\n" +
    ` * Source: ECDICT (https://github.com/skywind3000/ECDICT)\n` +
    ` * Generated at: ${generatedAt}\n` +
    ` * Entries: ${count}\n` +
    " */\n" +
    "var ShadowInput = ShadowInput || {};\n" +
    "ShadowInput.LocalDictData = " +
    JSON.stringify(dictObj) +
    ";\n"
  );
}

main().catch((err) => {
  console.error("[dict] build failed:", err);
  process.exitCode = 1;
});
