#!/usr/bin/env python3
"""Parse markdown corpus → app/data/cards.js"""
import json
import re
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "app" / "data" / "cards.js"

SOURCES = [
    {"file": "02-lexique-quotidien.md", "kind": "word", "deckPrefix": "02"},
    {"file": "01-lexique-setif.md", "kind": "word", "deckPrefix": "01", "bonus": True},
    {"file": "06-lexique-b1-b2.md", "kind": "word", "deckPrefix": "06"},
    {"file": "09-lexique-b2-suite.md", "kind": "word", "deckPrefix": "09"},
    {"file": "10-lexique-b2-complet.md", "kind": "word", "deckPrefix": "10"},
    {"file": "11-lexique-b2-final.md", "kind": "word", "deckPrefix": "11"},
    {"file": "07-idiomes-expressions.md", "kind": "idiom", "deckPrefix": "07"},
    {"file": "12-idiomes-b2.md", "kind": "idiom", "deckPrefix": "12"},
    {"file": "03-phrases-dialogues.md", "kind": "phrase", "deckPrefix": "03"},
    {"file": "08-phrases-b2.md", "kind": "phrase", "deckPrefix": "08"},
    {"file": "15-phrases-suite.md", "kind": "phrase", "deckPrefix": "15"},
    {"file": "16-phrases-plus.md", "kind": "phrase", "deckPrefix": "16"},
]


def slug(s: str) -> str:
    s = re.sub(r"[\u0300-\u036f]", "", s.encode("ascii", "ignore").decode() or s.lower())
    s = s.lower()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return s.strip("-")[:48]


def infer_type(cid: str) -> str:
    if cid.startswith("IDI-"):
        return "idiom"
    if cid.startswith("PH-"):
        return "phrase"
    return "word"


def guess_niv(title: str) -> str:
    t = title.lower()
    if "b2" in t or "avanc" in t:
        return "B2"
    if "b1" in t:
        return "B1"
    if "a2" in t:
        return "A2"
    return "A1"


def parse_deck_header(line: str, file_prefix: str):
    m = re.match(r"^##\s+(.+)$", line)
    if not m:
        return None
    raw = m.group(1).strip()
    dm = re.match(r"^Deck\s+([A-Za-z0-9]+)\s*[—–-]\s*(.+)$", raw, re.I)
    if dm:
        num, rest = dm.group(1), dm.group(2)
        niv_m = re.search(r"\((A1|A2|B1|B2[^)]*)\)", rest, re.I)
        niv = (niv_m.group(1) if niv_m else "").replace("bonus", "").strip() or guess_niv(rest)
        title = re.sub(r"\s*\([^)]*\)\s*$", "", rest).strip()
        return {
            "id": f"{file_prefix}-deck-{num.lower()}",
            "title": title,
            "niv": niv,
        }
    if re.match(r"^(Semaine|Mini-exo|Mini-dialogue|Grille|Après|Quand|Négation)", raw, re.I):
        return None
    niv_m = re.search(r"\((A1|A2|B1|B2)\)", raw, re.I)
    title = re.sub(r"\s*\([^)]*\)\s*$", "", raw).strip()
    return {
        "id": f"{file_prefix}-{slug(title)}",
        "title": title,
        "niv": niv_m.group(1) if niv_m else guess_niv(title),
    }


def split_row(line: str):
    return [c.strip() for c in line.strip().strip("|").split("|")]


def is_separator(cells):
    return all(re.match(r"^:?-+:?$", c) or c == "" for c in cells)


def parse_tags(raw: str):
    if not raw:
        return []
    return [t.strip() for t in re.split(r"[,;]", raw) if t.strip()]


def parse_table_file(content: str, meta: dict):
    cards = []
    deck_map = {}
    current_deck = None
    headers = None

    for line in content.splitlines():
        deck_hdr = parse_deck_header(line, meta["deckPrefix"])
        if deck_hdr:
            current_deck = deck_hdr
            if current_deck["id"] not in deck_map:
                deck_map[current_deck["id"]] = {
                    "id": current_deck["id"],
                    "title": current_deck["title"],
                    "source": meta["file"],
                    "niv": current_deck["niv"],
                    "kind": meta["kind"],
                    "bonus": bool(meta.get("bonus")),
                    "count": 0,
                }
            headers = None
            continue

        if not line.strip().startswith("|"):
            headers = None
            continue

        cells = split_row(line)
        if is_separator(cells):
            continue

        if headers is None:
            headers = [h.lower() for h in cells]
            continue

        row = {headers[i]: (cells[i] if i < len(cells) else "") for i in range(len(headers))}
        cid = row.get("id", "")
        if not cid or cid == "id":
            continue
        if not re.match(r"^(DZ|IDI|PH|SET)-\d+", cid, re.I):
            continue

        if not current_deck:
            current_deck = {"id": f"{meta['deckPrefix']}-misc", "title": meta["file"].replace(".md", ""), "niv": "A1"}
            if current_deck["id"] not in deck_map:
                deck_map[current_deck["id"]] = {
                    "id": current_deck["id"],
                    "title": current_deck["title"],
                    "source": meta["file"],
                    "niv": current_deck["niv"],
                    "kind": meta["kind"],
                    "bonus": bool(meta.get("bonus")),
                    "count": 0,
                }

        card = {
            "id": cid,
            "deck": current_deck["id"],
            "type": infer_type(cid),
            "fr": row.get("fr", ""),
            "arab": row.get("arab", ""),
            "latn": row.get("latn", ""),
            "ex_arab": row.get("ex_arab", ""),
            "ex_fr": row.get("ex_fr", ""),
            "niv": row.get("niv") or current_deck.get("niv") or "A1",
            "tags": parse_tags(row.get("tags", "")),
        }
        general = row.get("général") or row.get("general") or ""
        if general:
            card["general"] = general
            if "setif" not in card["tags"]:
                card["tags"].append("setif")

        cards.append(card)
        deck_map[current_deck["id"]]["count"] += 1

    return cards, list(deck_map.values())


def parse_verbs(content: str):
    verbs = []
    for block in re.split(r"^##\s+", content, flags=re.M)[1:]:
        first = block.split("\n", 1)[0].strip()
        if re.search(r"Négation|Mini-exos", first, re.I):
            continue
        m = re.match(r"^(\d+)\.\s+(.+?)\s*[—–-]\s*(.+)$", first)
        if not m:
            continue
        num, fr_title, arab_hint = m.group(1), m.group(2).strip(), m.group(3).strip()
        tables = []
        for tb in re.findall(r"\|[^\n]+\|\n\|[^\n]+\|\n(?:\|[^\n]+\|\n?)+", block):
            rows = [l for l in tb.split("\n") if l.strip().startswith("|")]
            if len(rows) < 2:
                continue
            hdr = [h.lower() for h in split_row(rows[0])]
            if "passé" in hdr or "passe" in hdr:
                forms = []
                for r in rows[2:]:
                    c = split_row(r)
                    if is_separator(c):
                        continue
                    forms.append({"label": c[0] if len(c) > 0 else "", "past": c[1] if len(c) > 1 else "", "present": c[2] if len(c) > 2 else ""})
                tables.append({"type": "tense", "forms": forms})
            else:
                forms = []
                for r in rows[2:]:
                    c = split_row(r)
                    if is_separator(c):
                        continue
                    forms.append({"fr": c[0] if len(c) > 0 else "", "arab": c[1] if len(c) > 1 else "", "latn": c[2] if len(c) > 2 else ""})
                tables.append({"type": "simple", "forms": forms})
        verbs.append({"id": f"verb-{num}", "num": int(num), "title": fr_title, "arab": arab_hint, "tables": tables})
    return verbs


def parse_quizzes(content: str):
    quizzes = []
    for block in re.split(r"^##\s+Semaine\s+", content, flags=re.M)[1:]:
        wm = re.match(r"^(\d+)", block)
        if not wm:
            continue
        week_num = wm.group(1)
        title_m = re.match(r"^\d+\s*[—–-]\s*(.+?)(?:\n|$)", block)
        week_title = title_m.group(1).strip() if title_m else f"Semaine {week_num}"
        for sec in re.split(r"^###\s+", block, flags=re.M)[1:]:
            sec_title = sec.split("\n", 1)[0].strip()
            body = sec.split("\n", 1)[1] if "\n" in sec else ""
            ans_block = re.search(r"<details><summary>Réponses</summary>\s*([\s\S]*?)</details>", body, re.I)
            q_body = body[: ans_block.start()] if ans_block else body
            q_type = "latn2fr" if "darija → fr" in sec_title.lower() or "darija -> fr" in sec_title.lower() else "fr2darija"
            questions = []
            for ql in re.findall(r"^\d+\.\s+.+$", q_body, flags=re.M):
                questions.append({"q": re.sub(r"^\d+\.\s+", "", ql).strip(), "type": q_type})
            answers = []
            if ans_block:
                for al in re.findall(r"^\d+\.\s+.+$", ans_block.group(1), flags=re.M):
                    answers.append(re.sub(r"^\d+\.\s+", "", al).strip())
            if len(answers) < len(questions):
                questions = questions[: len(answers)]
            elif len(answers) > len(questions):
                answers = answers[: len(questions)]
            if questions:
                quizzes.append({
                    "id": f"rev-w{week_num}-{slug(sec_title)}",
                    "week": int(week_num),
                    "weekTitle": week_title,
                    "section": sec_title,
                    "questions": questions,
                    "answers": answers,
                })
    return quizzes


def parse_dialogues(content: str, meta: dict):
    dialogues = []
    current_deck = None
    current = None
    in_table = False
    table_hdr = None

    for line in content.splitlines():
        m_mini = re.match(r"^##\s+Mini-dialogue\s*(.+)$", line.strip(), re.I)
        if m_mini:
            if current:
                dialogues.append(current)
            slug_id = slug(m_mini.group(1).strip())[:24] or "mini"
            current = {
                "id": f"{meta['deckPrefix']}-dlg-{slug_id}",
                "title": m_mini.group(1).strip(),
                "deck": current_deck or f"{meta['deckPrefix']}-misc",
                "source": meta["file"],
                "lines": [],
            }
            in_table = False
            continue

        deck_hdr = parse_deck_header(line, meta["deckPrefix"])
        if deck_hdr:
            current_deck = deck_hdr["id"]
            in_table = False
            continue

        m_dlg = re.match(r"^###\s+Dialogue\s+(\d+)\s*[—–-]\s*(.+)$", line.strip())
        if m_dlg:
            if current:
                dialogues.append(current)
            current = {
                "id": f"{meta['deckPrefix']}-dlg-{m_dlg.group(1)}",
                "title": m_dlg.group(2).strip(),
                "deck": current_deck,
                "source": meta["file"],
                "lines": [],
            }
            in_table = False
            continue

        m_ab = re.match(r"^\*\*([AB]):\*\*\s*(.+)$", line.strip())
        if m_ab and current:
            current["lines"].append({"role": m_ab.group(1), "text": m_ab.group(2).strip()})
            continue

        if line.strip().startswith("|") and current and re.match(r"^\d+$", (split_row(line)[0] if line.strip().startswith("|") else "")):
            cells = [c.strip() for c in line.strip().strip("|").split("|")]
            if is_separator(cells):
                continue
            if cells[0].lower() in ("#", "n", "id"):
                continue
            if re.match(r"^\d+$", cells[0]):
                arab = cells[2] if len(cells) > 2 else ""
                fr = cells[1] if len(cells) > 1 else ""
                role = "A" if int(cells[0]) % 2 == 1 else "B"
                if arab:
                    current["lines"].append({"role": role, "text": arab, "fr": fr})
            continue

        if line.strip().startswith("###") or line.strip().startswith("##"):
            in_table = False

    if current and current.get("lines"):
        dialogues.append(current)
    return dialogues


def main():
    all_cards = []
    all_decks = []
    ids = set()
    dupes = []

    for src in SOURCES:
        content = (ROOT / src["file"]).read_text(encoding="utf-8")
        cards, decks = parse_table_file(content, src)
        for c in cards:
            if c["id"] in ids:
                dupes.append(c["id"])
            else:
                ids.add(c["id"])
            all_cards.append(c)
        all_decks.extend(decks)

    verbs = parse_verbs((ROOT / "04-verbes.md").read_text(encoding="utf-8"))
    quizzes = parse_quizzes((ROOT / "05-revisions.md").read_text(encoding="utf-8"))
    dialogues = []
    for pf in ("03-phrases-dialogues.md", "08-phrases-b2.md"):
        dialogues.extend(parse_dialogues((ROOT / pf).read_text(encoding="utf-8"), {"file": pf, "deckPrefix": pf[:2]}))
    all_decks.sort(key=lambda d: d["id"])

    stats = {
        "cards": len(all_cards),
        "decks": len(all_decks),
        "words": sum(1 for c in all_cards if c["type"] == "word"),
        "idioms": sum(1 for c in all_cards if c["type"] == "idiom"),
        "phrases": sum(1 for c in all_cards if c["type"] == "phrase"),
        "verbs": len(verbs),
        "quizzes": len(quizzes),
        "dialogues": len(dialogues),
        "dupes": list(dict.fromkeys(dupes)),
    }

    payload = {
        "meta": {"generated": datetime.now(timezone.utc).isoformat(), "version": 1, "stats": stats},
        "decks": all_decks,
        "cards": all_cards,
        "verbs": verbs,
        "quizzes": quizzes,
        "dialogues": dialogues,
    }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(
        "/* AUTO-GENERATED — python scripts/build-data.py */\nwindow.DAR_DATA = "
        + json.dumps(payload, ensure_ascii=False, indent=2)
        + ";\n",
        encoding="utf-8",
    )

    print("OK cards.js genere")
    print(f"  cartes: {stats['cards']} ({stats['words']} mots · {stats['idioms']} idiomes · {stats['phrases']} phrases)")
    print(f"  decks: {stats['decks']} · verbes: {stats['verbs']} · quiz: {stats['quizzes']} · dialogues: {stats['dialogues']}")
    if dupes:
        print(f"  ⚠ ids dupliqués: {stats['dupes']}")


if __name__ == "__main__":
    main()
