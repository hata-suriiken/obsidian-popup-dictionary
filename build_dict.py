#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Build a compact, plugin-ready dictionary file (dict.json) from a
jmdict-simplified JSON release (https://github.com/scriptin/jmdict-simplified).

Usage:
    python build_dict.py INPUT.json OUTPUT_dict.json

The output keeps only what the popup needs, with short keys to stay small:
  entry = {
    "k": [kanji forms...],       # may be empty
    "r": [readings (kana)...],
    "c": 0|1,                    # 1 if any kanji/kana marked common
    "s": [ sense... ]            # senses
  }
  sense = {
    "p": [partOfSpeech tags...],
    "g": [english glosses...],
    "m": [misc tags...],         # optional (e.g. "uk", "col")
    "f": [field tags...],        # optional (e.g. "physics", "med")
    "i": [info notes...]         # optional
  }
The top-level "tags" map (code -> human label) is copied through so the
plugin can render "n" as "noun", "physics" as "physics", etc.
"""
import json
import sys


def compact_entry(w):
    kanji = w.get("kanji", []) or []
    kana = w.get("kana", []) or []
    k = [x["text"] for x in kanji]
    r = [x["text"] for x in kana]
    common = 1 if (any(x.get("common") for x in kanji)
                   or any(x.get("common") for x in kana)) else 0
    senses = []
    for s in w.get("sense", []):
        glosses = [g["text"] for g in s.get("gloss", [])
                   if g.get("lang", "eng") == "eng" and g.get("text")]
        if not glosses:
            continue
        se = {"p": s.get("partOfSpeech", []) or [], "g": glosses}
        if s.get("misc"):
            se["m"] = s["misc"]
        if s.get("field"):
            se["f"] = s["field"]
        if s.get("info"):
            se["i"] = s["info"]
        senses.append(se)
    if not senses:
        return None
    return {"k": k, "r": r, "c": common, "s": senses}


def main():
    if len(sys.argv) != 3:
        print(__doc__)
        sys.exit(1)
    src, dst = sys.argv[1], sys.argv[2]
    with open(src, encoding="utf-8") as f:
        data = json.load(f)

    entries = []
    for w in data["words"]:
        e = compact_entry(w)
        if e is not None:
            entries.append(e)

    out = {
        "meta": {
            "source": "JMdict / jmdict-simplified"
                      + (" (common only)" if data.get("commonOnly") else ""),
            "version": data.get("version"),
            "dictDate": data.get("dictDate"),
            "license": "JMdict data is CC BY-SA 4.0 (Electronic Dictionary "
                       "Research and Development Group / EDRDG).",
            "count": len(entries),
        },
        "tags": data.get("tags", {}),
        "entries": entries,
    }

    with open(dst, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))

    print("entries written:", len(entries))
    print("version:", data.get("version"), "dictDate:", data.get("dictDate"),
          "commonOnly:", data.get("commonOnly"))


if __name__ == "__main__":
    main()
