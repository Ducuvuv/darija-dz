#!/usr/bin/env node
/**
 * Parse markdown corpus → app/data/cards.js
 * Usage: node scripts/build-data.mjs
 */
import { readFileSync, writeFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "app", "data", "cards.js");

const SOURCES = [
  { file: "02-lexique-quotidien.md", kind: "word", deckPrefix: "02" },
  { file: "01-lexique-setif.md", kind: "word", deckPrefix: "01", bonus: true },
  { file: "06-lexique-b1-b2.md", kind: "word", deckPrefix: "06" },
  { file: "09-lexique-b2-suite.md", kind: "word", deckPrefix: "09" },
  { file: "10-lexique-b2-complet.md", kind: "word", deckPrefix: "10" },
  { file: "11-lexique-b2-final.md", kind: "word", deckPrefix: "11" },
  { file: "07-idiomes-expressions.md", kind: "idiom", deckPrefix: "07" },
  { file: "12-idiomes-b2.md", kind: "idiom", deckPrefix: "12" },
  { file: "03-phrases-dialogues.md", kind: "phrase", deckPrefix: "03" },
  { file: "08-phrases-b2.md", kind: "phrase", deckPrefix: "08" },
];

function slug(s) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

function inferType(id) {
  if (id.startsWith("IDI-")) return "idiom";
  if (id.startsWith("PH-")) return "phrase";
  if (id.startsWith("SET-")) return "word";
  if (id.startsWith("DZ-")) return "word";
  return "word";
}

function parseDeckHeader(line, filePrefix) {
  const m = line.match(/^##\s+(.+)$/);
  if (!m) return null;
  const raw = m[1].trim();
  if (/^Deck\s+([A-Za-z0-9]+)\s*[—–-]\s*(.+)$/i.test(raw)) {
    const [, num, rest] = raw.match(/^Deck\s+([A-Za-z0-9]+)\s*[—–-]\s*(.+)$/i);
    const niv = (rest.match(/\((A1|A2|B1|B2[^)]*)\)/i) || [])[1] || "";
    const title = rest.replace(/\s*\([^)]*\)\s*$/, "").trim();
    return {
      id: `${filePrefix}-deck-${String(num).toLowerCase()}`,
      title,
      niv: niv.replace(/bonus.*/i, "").trim() || guessNiv(title),
      slug: slug(`deck-${num}-${title}`),
    };
  }
  if (/^Semaine\s+\d+/i.test(raw) || /^Mini-exo/i.test(raw) || /^Grille/i.test(raw) || /^Après|^Quand|^Négation/i.test(raw)) return null;
  const niv = (raw.match(/\((A1|A2|B1|B2)\)/i) || [])[1] || "";
  const title = raw.replace(/\s*\([^)]*\)\s*$/, "").trim();
  return {
    id: `${filePrefix}-${slug(title)}`,
    title,
    niv: niv || guessNiv(title),
    slug: slug(title),
  };
}

function guessNiv(title) {
  const t = title.toLowerCase();
  if (t.includes("b2") || t.includes("avanc")) return "B2";
  if (t.includes("b1")) return "B1";
  if (t.includes("a2")) return "A2";
  return "A1";
}

function splitRow(line) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((c) => c.trim());
}

function isSeparatorRow(cells) {
  return cells.every((c) => /^:?-+:?$/.test(c) || c === "");
}

function parseTags(raw) {
  if (!raw) return [];
  return raw.split(/[,;]/).map((t) => t.trim()).filter(Boolean);
}

function parseTableFile(content, meta) {
  const lines = content.split(/\r?\n/);
  const cards = [];
  const deckMap = new Map();
  let currentDeck = null;
  let headers = null;

  for (const line of lines) {
    const deckHdr = parseDeckHeader(line, meta.deckPrefix);
    if (deckHdr) {
      currentDeck = deckHdr;
      if (!deckMap.has(currentDeck.id)) {
        deckMap.set(currentDeck.id, {
          id: currentDeck.id,
          title: currentDeck.title,
          source: meta.file,
          niv: currentDeck.niv,
          kind: meta.kind,
          bonus: !!meta.bonus,
          count: 0,
        });
      }
      headers = null;
      continue;
    }

    if (!line.trim().startsWith("|")) {
      headers = null;
      continue;
    }

    const cells = splitRow(line);
    if (isSeparatorRow(cells)) continue;

    if (!headers) {
      headers = cells.map((h) => h.toLowerCase());
      continue;
    }

    const row = {};
    headers.forEach((h, i) => {
      row[h] = cells[i] ?? "";
    });

    const id = row.id || "";
    if (!id || id === "id" || !/^[A-Z]{2,4}-\d+/i.test(id) && !/^SET-\d+/i.test(id)) continue;

    if (!currentDeck) {
      currentDeck = {
        id: `${meta.deckPrefix}-misc`,
        title: meta.file.replace(".md", ""),
        niv: "A1",
      };
      if (!deckMap.has(currentDeck.id)) {
        deckMap.set(currentDeck.id, {
          id: currentDeck.id,
          title: currentDeck.title,
          source: meta.file,
          niv: currentDeck.niv,
          kind: meta.kind,
          bonus: !!meta.bonus,
          count: 0,
        });
      }
    }

    const card = {
      id,
      deck: currentDeck.id,
      type: inferType(id),
      fr: row.fr || "",
      arab: row.arab || "",
      latn: row.latn || "",
      ex_arab: row.ex_arab || "",
      ex_fr: row.ex_fr || "",
      niv: row.niv || currentDeck.niv || "A1",
      tags: parseTags(row.tags),
    };

    if (row.général || row.general) {
      card.general = row.général || row.general;
      if (!card.tags.includes("setif")) card.tags.push("setif");
    }

    cards.push(card);
    const d = deckMap.get(currentDeck.id);
    if (d) d.count += 1;
  }

  return { cards, decks: [...deckMap.values()] };
}

function parseVerbs(content) {
  const verbs = [];
  const sections = content.split(/^##\s+/m).slice(1);
  for (const block of sections) {
    const firstLine = block.split("\n")[0].trim();
    if (/Négation|Mini-exos/i.test(firstLine)) continue;
    const m = firstLine.match(/^(\d+)\.\s+(.+?)\s*[—–-]\s*(.+)$/);
    if (!m) continue;
    const [, num, frTitle, arabHint] = m;
    const id = `verb-${num}`;
    const tables = [];
    const tableBlocks = block.match(/\|[^\n]+\|\n\|[^\n]+\|\n(?:\|[^\n]+\|\n?)+/g) || [];
    for (const tb of tableBlocks) {
      const rows = tb.split("\n").filter((l) => l.trim().startsWith("|"));
      if (rows.length < 2) continue;
      const hdr = splitRow(rows[0]).map((h) => h.toLowerCase());
      if (hdr.includes("passé") || hdr.includes("passe")) {
        const forms = [];
        for (let i = 2; i < rows.length; i++) {
          const c = splitRow(rows[i]);
          if (isSeparatorRow(c)) continue;
          forms.push({
            label: c[0] || "",
            past: c[1] || "",
            present: c[2] || "",
          });
        }
        tables.push({ type: "tense", forms });
      } else {
        const forms = [];
        for (let i = 2; i < rows.length; i++) {
          const c = splitRow(rows[i]);
          if (isSeparatorRow(c)) continue;
          forms.push({
            fr: c[0] || "",
            arab: c[1] || "",
            latn: c[2] || "",
          });
        }
        tables.push({ type: "simple", forms });
      }
    }
    verbs.push({
      id,
      num: Number(num),
      title: frTitle.trim(),
      arab: arabHint.trim(),
      tables,
    });
  }
  return verbs;
}

function parseQuizzes(content) {
  const quizzes = [];
  const weeks = content.split(/^##\s+Semaine\s+/m).slice(1);
  for (const block of weeks) {
    const weekNum = block.match(/^(\d+)/)?.[1];
    if (!weekNum) continue;
    const titleMatch = block.match(/^\d+\s*[—–-]\s*(.+?)(?:\n|$)/);
    const weekTitle = titleMatch ? titleMatch[1].trim() : `Semaine ${weekNum}`;
    const sections = block.split(/^###\s+/m).slice(1);
    for (const sec of sections) {
      const secTitle = sec.split("\n")[0].trim();
      const body = sec.includes("\n") ? sec.split("\n").slice(1).join("\n") : "";
      const answerBlock = body.match(/<details><summary>Réponses<\/summary>\s*([\s\S]*?)<\/details>/i);
      const qBody = answerBlock ? body.slice(0, answerBlock.index) : body;
      const qType = secTitle.toLowerCase().includes("darija → fr") ? "latn2fr" : "fr2darija";
      const questions = [];
      for (const ql of qBody.match(/^\d+\.\s+.+$/gm) || []) {
        questions.push({ q: ql.replace(/^\d+\.\s+/, "").trim(), type: qType });
      }
      const answers = [];
      if (answerBlock) {
        for (const al of answerBlock[1].match(/^\d+\.\s+.+$/gm) || []) {
          answers.push(al.replace(/^\d+\.\s+/, "").trim());
        }
      }
      const n = Math.min(questions.length, answers.length);
      if (n) {
        quizzes.push({
          id: `rev-w${weekNum}-${slug(secTitle)}`,
          week: Number(weekNum),
          weekTitle,
          section: secTitle,
          questions: questions.slice(0, n),
          answers: answers.slice(0, n),
        });
      }
    }
  }
  return quizzes;
}

function main() {
  const allCards = [];
  const allDecks = [];
  const ids = new Set();
  const dupes = [];

  for (const src of SOURCES) {
    const path = join(ROOT, src.file);
    const content = readFileSync(path, "utf8");
    const { cards, decks } = parseTableFile(content, src);
    for (const c of cards) {
      if (ids.has(c.id)) dupes.push(c.id);
      else ids.add(c.id);
      allCards.push(c);
    }
    allDecks.push(...decks);
  }

  const verbsPath = join(ROOT, "04-verbes.md");
  const verbs = parseVerbs(readFileSync(verbsPath, "utf8"));

  const revPath = join(ROOT, "05-revisions.md");
  const quizzes = parseQuizzes(readFileSync(revPath, "utf8"));

  allDecks.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));

  const stats = {
    cards: allCards.length,
    decks: allDecks.length,
    words: allCards.filter((c) => c.type === "word").length,
    idioms: allCards.filter((c) => c.type === "idiom").length,
    phrases: allCards.filter((c) => c.type === "phrase").length,
    verbs: verbs.length,
    quizzes: quizzes.length,
    dupes,
  };

  const payload = {
    meta: {
      generated: new Date().toISOString(),
      version: 1,
      stats,
    },
    decks: allDecks,
    cards: allCards,
    verbs,
    quizzes,
  };

  const js = `/* AUTO-GENERATED — node scripts/build-data.mjs */\nwindow.DAR_DATA = ${JSON.stringify(payload, null, 2)};\n`;
  writeFileSync(OUT, js, "utf8");

  console.log("✓ cards.js généré");
  console.log(`  cartes: ${stats.cards} (${stats.words} mots · ${stats.idioms} idiomes · ${stats.phrases} phrases)`);
  console.log(`  decks: ${stats.decks} · verbes: ${stats.verbs} · quiz: ${stats.quizzes}`);
  if (dupes.length) console.warn(`  ⚠ ids dupliqués ignorés: ${[...new Set(dupes)].join(", ")}`);
}

main();
