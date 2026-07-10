'use strict';

/*
 * Popup Dictionary (JA <-> EN) — offline JMdict popup for Obsidian.
 * Plain CommonJS (no build step). Reads dict.json produced by build_dict.py.
 */

const obsidian = require('obsidian');

const DEFAULT_SETTINGS = {
  autoOnSelect: true,   // pop up automatically when you select text
  enableInPdf: true,    // also auto-trigger for selections in the PDF viewer
  maxResults: 8,        // max dictionary entries shown
  maxSenses: 6,         // max senses per entry
  minSelLen: 1,         // min selection length to auto-trigger
  maxSelLen: 30,        // max selection length to auto-trigger
  fontSize: 14,
  dataFile: 'dict.json', // 'dict.json' (full) or 'dict-common.json' (lite, faster on mobile)
};

/* ---- helpers: Japanese detection & kana row conversion ---- */

const JA_RE = /[぀-ゟ゠-ヿ㐀-鿿豈-﫿ｦ-ﾟ]/;
function hasJapanese(s) { return JA_RE.test(s); }

// godan conjugation-row maps used by the deinflector
const I2U = { 'き':'く','ぎ':'ぐ','し':'す','ち':'つ','に':'ぬ','ひ':'ふ','び':'ぶ','み':'む','り':'る','い':'う' };
const A2U = { 'か':'く','が':'ぐ','さ':'す','た':'つ','な':'ぬ','は':'ふ','ば':'ぶ','ま':'む','ら':'る','わ':'う' };
const E2U = { 'け':'く','げ':'ぐ','せ':'す','て':'つ','ね':'ぬ','へ':'ふ','べ':'ぶ','め':'む','れ':'る','え':'う' };

function convLast(stem, map) {
  if (!stem) return null;
  const last = stem[stem.length - 1];
  const u = map[last];
  return u ? stem.slice(0, -1) + u : null;
}

/*
 * Deinflect a Japanese surface form into candidate dictionary base forms.
 * Over-generates on purpose: the caller keeps only candidates that actually
 * exist in the dictionary index, so spurious candidates simply miss.
 */
function deinflect(word) {
  const out = new Set();
  const add = (x) => { if (x && x.length >= 1) out.add(x); };
  // godan verb stem -> dict form, given which vowel-row the stem ends in
  const pushI = (st) => { add(st + 'る'); add(convLast(st, I2U)); };
  const pushA = (st) => { add(convLast(st, A2U)); };

  // reduce ~ている / ~てる / ~でいる etc. down to the plain te/de form first
  const bases = [word];
  let m = word.match(/^(.*[てで])(いる|います|いた|いました|る|た|ます|ました|ない|なかった|ています|ていた)$/);
  if (m) bases.push(m[1]);

  for (const b of bases) {
    add(b);

    // i-adjectives
    if (b.endsWith('くなかった')) add(b.slice(0, -5) + 'い');
    if (b.endsWith('かった'))     add(b.slice(0, -3) + 'い');
    if (b.endsWith('くない'))     add(b.slice(0, -3) + 'い');
    if (b.endsWith('くて'))       add(b.slice(0, -2) + 'い');
    if (b.endsWith('ければ'))     add(b.slice(0, -3) + 'い');
    if (b.endsWith('く') && b.length > 2) add(b.slice(0, -1) + 'い');
    if (b.endsWith('さ') && b.length > 2) add(b.slice(0, -1) + 'い');

    // polite forms -> masu-stem
    if ((m = b.match(/^(.*)(ませんでした|ましょう|ません|ました|まして|ます)$/))) pushI(m[1]);

    // negative
    if ((m = b.match(/^(.*)(なかった|なくて|ない|ず)$/))) { add(m[1] + 'る'); pushA(m[1]); }

    // te / ta forms (godan onbin + ichidan)
    if ((m = b.match(/^(.*)(って|った)$/))) { add(m[1] + 'う'); add(m[1] + 'つ'); add(m[1] + 'る'); }
    if ((m = b.match(/^(.*)(いて|いた)$/))) { add(m[1] + 'く'); }
    if ((m = b.match(/^(.*)(いで|いだ)$/))) { add(m[1] + 'ぐ'); }
    if ((m = b.match(/^(.*)(んで|んだ)$/))) { add(m[1] + 'ぶ'); add(m[1] + 'む'); add(m[1] + 'ぬ'); }
    if ((m = b.match(/^(.*)(して|した)$/))) { add(m[1] + 'す'); add(m[1] + 'する'); }
    if ((m = b.match(/^(.*)(て|た)$/)))     { add(m[1] + 'る'); }   // ichidan: 食べて -> 食べる

    // conditional / imperative-ish
    if ((m = b.match(/^(.*)(たら|だら)$/))) { add(m[1] + 'る'); }
    if (b.length > 2 && b.endsWith('ば'))  { const c = convLast(b.slice(0, -1), E2U); add(c); }

    // potential / passive -> base (also try godan potential 書ける->書く)
    if ((m = b.match(/^(.*)(られる|られた|られない)$/))) { add(m[1] + 'る'); }
    if ((m = b.match(/^(.*)(れる|れた|れない)$/)))       { add(m[1] + 'る'); }
    if (b.endsWith('る') && b.length >= 2) { const c = convLast(b.slice(0, -1), E2U); if (c) add(c); }

    // irregular suru / kuru / iku (also bare noun stem: 勉強した -> 勉強)
    if (b.endsWith('します')) { add(b.slice(0, -3) + 'する'); add(b.slice(0, -3)); }
    if (b.endsWith('した'))   { add(b.slice(0, -2) + 'する'); add(b.slice(0, -2)); }
    if (b.endsWith('して'))   { add(b.slice(0, -2) + 'する'); add(b.slice(0, -2)); }
    if (b === 'きた' || b === 'きて' || b === 'きます') { add('くる'); add('来る'); }
    if ((m = b.match(/^(.*)(行|い)(った|って)$/))) { add(m[1] + m[2] + 'く'); }
  }

  out.delete(word);
  return Array.from(out);
}

/* ---- English stopwords (for the EN->JA word index) ---- */
const STOP = new Set(('a an the to of in on at for and or be is are was were as by with '
  + 'from that this it its his her their our your my no not do does done being been '
  + 'about into over under out up down off then than so such can may might will would '
  + 'one etc e.g i.e').split(/\s+/));

/* short Japanese labels for the most common part-of-speech codes */
const POS_JP = {
  n:'名詞', pn:'代名詞', 'adj-i':'形容詞', 'adj-na':'形容動詞', 'adj-no':'連体', 'adj-f':'連体',
  adv:'副詞', 'adv-to':'副詞', v1:'動(下一)', 'v1-s':'動(下一)',
  v5u:'動(五)', v5k:'動(五)', v5s:'動(五)', v5t:'動(五)', v5r:'動(五)', v5g:'動(五)',
  v5b:'動(五)', v5m:'動(五)', v5n:'動(五)', 'v5k-s':'動(五)', 'v5r-i':'動(五)', 'v5u-s':'動(五)',
  vs:'サ変', 'vs-s':'サ変', 'vs-i':'サ変', vk:'カ変', vz:'ザ変',
  vt:'他動詞', vi:'自動詞', suf:'接尾', pref:'接頭', conj:'接続', int:'感動',
  exp:'表現', prt:'助詞', 'aux-v':'助動詞', aux:'助動', ctr:'助数詞', num:'数詞',
};

/* ---- the dictionary index ---- */

class DictIndex {
  constructor(data) {
    this.entries = data.entries || [];
    this.tags = data.tags || {};
    this.meta = data.meta || {};
    this.byJa = new Map();      // kanji/kana text -> [entry idx]
    this.byEnExact = new Map(); // full lowercased gloss -> [entry idx]
    this.byEnWord = new Map();  // gloss word -> [entry idx]
    this._build();
  }

  _push(map, key, idx) {
    if (!key) return;
    let a = map.get(key);
    if (!a) { a = []; map.set(key, a); }
    if (a[a.length - 1] !== idx) a.push(idx);
  }

  _build() {
    const E = this.entries;
    for (let i = 0; i < E.length; i++) {
      const e = E[i];
      const forms = (e.k || []).concat(e.r || []);
      for (const t of forms) this._push(this.byJa, t, i);
      for (const s of (e.s || [])) {
        for (const g of (s.g || [])) {
          const gl = g.toLowerCase().trim();
          this._push(this.byEnExact, gl, i);
          const cleaned = gl.replace(/\([^)]*\)/g, ' ').replace(/^to\s+/, '').trim();
          if (cleaned && cleaned !== gl) this._push(this.byEnExact, cleaned, i);
          for (const w of gl.split(/[^a-z0-9'\-]+/)) {
            if (w.length >= 2 && !STOP.has(w)) this._push(this.byEnWord, w, i);
          }
        }
      }
    }
  }

  _collect(idxs, seen, res) {
    if (!idxs) return;
    for (const i of idxs) { if (!seen.has(i)) { seen.add(i); res.push(i); } }
  }

  lookup(term) {
    term = (term || '').trim();
    if (!term) return { matched: null, idxs: [] };
    return hasJapanese(term) ? this._lookupJa(term) : this._lookupEn(term);
  }

  _lookupJa(term) {
    // longest-prefix match: forgiving of trailing particles in a selection.
    // Merge exact + deinflected candidates so e.g. 待った shows both the noun
    // 待った and the verb 待つ.
    for (let len = term.length; len >= 1; len--) {
      const t = term.slice(0, len);
      const seen = new Set(), res = [];
      this._collect(this.byJa.get(t), seen, res);
      for (const c of deinflect(t)) this._collect(this.byJa.get(c), seen, res);
      if (res.length) return { matched: t, idxs: res };
    }
    return { matched: null, idxs: [] };
  }

  _lookupEn(term) {
    const t = term.toLowerCase().trim().replace(/[.,;:!?"'`]+$/, '');
    const seen = new Set(), res = [];
    this._collect(this.byEnExact.get(t), seen, res);
    if (res.length === 0) this._collect(this.byEnExact.get(t.replace(/^to\s+/, '')), seen, res);
    if (res.length === 0) {
      const words = t.split(/\s+/).filter((w) => w.length >= 2 && !STOP.has(w));
      if (words.length === 1) {
        this._collect(this.byEnWord.get(words[0]), seen, res);
      } else if (words.length > 1) {
        const lists = words.map((w) => this.byEnWord.get(w)).filter(Boolean);
        if (lists.length) {
          const inter = new Set(lists[0]);
          for (const l of lists.slice(1)) {
            const s = new Set(l);
            for (const x of Array.from(inter)) if (!s.has(x)) inter.delete(x);
          }
          this._collect(inter.size ? Array.from(inter) : lists[0], seen, res);
        }
      }
    }
    // rank: common words first, then entries where the query is an earlier sense
    const rankOf = (i) => {
      const e = this.entries[i];
      for (let si = 0; si < e.s.length; si++) {
        for (const g of e.s[si].g) {
          const gl = g.toLowerCase().trim();
          if (gl === t || gl.replace(/\([^)]*\)/g, ' ').replace(/^to\s+/, '').trim() === t) return si;
        }
      }
      return 99;
    };
    res.sort((a, b) => ((this.entries[b].c || 0) - (this.entries[a].c || 0)) || (rankOf(a) - rankOf(b)));
    return { matched: t, idxs: res };
  }

  posLabel(code) {
    return { short: POS_JP[code] || code, full: this.tags[code] || code };
  }
  tagLabel(code) { return this.tags[code] || code; }
}

/* ---- the popup element controller ---- */

class Popup {
  constructor(plugin) {
    this.plugin = plugin;
    this.el = null;
    this._onDocDown = this._onDocDown.bind(this);
    this._onKey = this._onKey.bind(this);
    this._onScroll = this._onScroll.bind(this);
  }

  hide() {
    if (!this.el) return;
    document.removeEventListener('mousedown', this._onDocDown, true);
    document.removeEventListener('touchstart', this._onDocDown, true);
    document.removeEventListener('keydown', this._onKey, true);
    window.removeEventListener('scroll', this._onScroll, true);
    this.el.remove();
    this.el = null;
  }

  _onDocDown(e) { if (this.el && !this.el.contains(e.target)) this.hide(); }
  _onKey(e) { if (e.key === 'Escape') this.hide(); }
  _onScroll(e) {
    // ignore scrolling inside the popup itself (long result lists scroll)
    if (this.el && e && e.target instanceof Node && this.el.contains(e.target)) return;
    this.hide();
  }

  show(result, rect) {
    this.hide();
    const idx = this.plugin.index;
    const el = document.createElement('div');
    el.className = 'popup-dict-pop';
    el.style.setProperty('--pd-font-size', this.plugin.settings.fontSize + 'px');

    const head = el.createDiv({ cls: 'pd-head' });
    const dir = hasJapanese(result.matched || result.query || '') ? '和英' : '英和';
    head.createSpan({ cls: 'pd-src', text: `${dir}辞書 ・「${result.matched || result.query}」` });
    const close = head.createSpan({ cls: 'pd-close', text: '×' });
    close.addEventListener('click', () => this.hide());

    if (!result.idxs.length) {
      el.createDiv({ cls: 'pd-empty', text: `見つかりませんでした: ${result.query}` });
    } else {
      const maxE = this.plugin.settings.maxResults;
      const shown = result.idxs.slice(0, maxE);
      for (const i of shown) this._renderEntry(el, idx.entries[i], idx);
      if (result.idxs.length > maxE) {
        el.createDiv({ cls: 'pd-more', text: `… 他 ${result.idxs.length - maxE} 件` });
      }
    }

    this.el = el;
    el.style.visibility = 'hidden';
    document.body.appendChild(el);
    this._position(el, rect);
    el.style.visibility = 'visible';

    setTimeout(() => {
      if (!this.el) return;
      document.addEventListener('mousedown', this._onDocDown, true);
      document.addEventListener('touchstart', this._onDocDown, true);
      document.addEventListener('keydown', this._onKey, true);
      window.addEventListener('scroll', this._onScroll, true);
    }, 0);
  }

  _renderEntry(parent, e, idx) {
    if (!e) return;
    const box = parent.createDiv({ cls: 'pd-entry' });
    const head = box.createDiv();
    const primary = (e.k && e.k.length) ? e.k.join('、') : (e.r || []).join('、');
    head.createSpan({ cls: 'pd-term', text: primary });
    if (e.k && e.k.length && e.r && e.r.length) {
      head.createSpan({ cls: 'pd-reading', text: e.r.join('、') });
    }
    if (e.c) head.createSpan({ cls: 'pd-common', text: '常用' });

    const ol = box.createEl('ol', { cls: 'pd-senses' });
    const maxS = this.plugin.settings.maxSenses;
    for (const s of (e.s || []).slice(0, maxS)) {
      const li = ol.createEl('li');
      for (const p of (s.p || [])) {
        const lab = idx.posLabel(p);
        const chip = li.createSpan({ cls: 'pd-pos', text: lab.short });
        chip.title = lab.full;
      }
      for (const f of (s.f || [])) {
        const chip = li.createSpan({ cls: 'pd-pos pd-field', text: idx.tagLabel(f) });
        chip.title = 'field: ' + f;
      }
      for (const mi of (s.m || [])) {
        const chip = li.createSpan({ cls: 'pd-pos pd-misc', text: mi });
        chip.title = idx.tagLabel(mi);
      }
      li.createSpan({ cls: 'pd-gloss', text: (s.g || []).slice(0, 8).join('; ') });
      for (const info of (s.i || [])) li.createSpan({ cls: 'pd-info', text: info });
    }
  }

  _position(el, rect) {
    const pad = 8;
    const w = el.offsetWidth, h = el.offsetHeight;
    const vw = window.innerWidth, vh = window.innerHeight;
    let left = rect ? rect.left : (vw - w) / 2;
    let top = rect ? rect.bottom + 6 : (vh - h) / 2;
    if (left + w > vw - pad) left = vw - pad - w;
    if (left < pad) left = pad;
    if (rect && top + h > vh - pad) {
      const above = rect.top - h - 6;
      top = above > pad ? above : Math.max(pad, vh - pad - h);
    }
    el.style.left = Math.round(left) + 'px';
    el.style.top = Math.round(top) + 'px';
  }
}

/* ---- the plugin ---- */

class PopupDictionaryPlugin extends obsidian.Plugin {
  async onload() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    this.index = null;
    this.loading = false;
    this.popup = new Popup(this);
    this._lastPointer = { x: 0, y: 0 };
    this._selTimer = null;

    this.addSettingTab(new PopupDictionarySettingTab(this.app, this));

    this.addCommand({
      id: 'lookup-selection',
      name: '選択テキストを辞書で引く',
      callback: () => this.lookupFromAnywhere(),
    });

    this.addCommand({
      id: 'reload-dictionary',
      name: '辞書データを再読み込み',
      callback: () => { this.index = null; this.loadDictionary(); },
    });

    this.addRibbonIcon('book-open', 'Popup Dictionary: 選択を辞書で引く', () => {
      this.lookupFromAnywhere();
    });

    this.registerDomEvent(document, 'pointerdown', (e) => {
      this._lastPointer = { x: e.clientX, y: e.clientY };
    }, true);

    this.registerDomEvent(document, 'selectionchange', () => {
      if (!this.settings.autoOnSelect) return;
      window.clearTimeout(this._selTimer);
      this._selTimer = window.setTimeout(() => this._onSelectionSettled(), 300);
    });

    // load the dictionary data (non-blocking)
    this.loadDictionary();
  }

  onunload() { if (this.popup) this.popup.hide(); }

  async loadDictionary() {
    if (this.index || this.loading) return;
    this.loading = true;
    const path = this.manifest.dir + '/' + (this.settings.dataFile || 'dict.json');
    try {
      const raw = await this.app.vault.adapter.read(path);
      const data = JSON.parse(raw);
      this.index = new DictIndex(data);
      const n = this.index.entries.length.toLocaleString();
      new obsidian.Notice(`辞書を読み込みました（${n} 語）`);
    } catch (err) {
      console.error('[jmdict-popup-dictionary] failed to load dict.json', err);
      new obsidian.Notice('辞書データ (dict.json) を読み込めませんでした。プラグインフォルダを確認してください。');
    } finally {
      this.loading = false;
    }
  }

  _rectFromSelection() {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const r = sel.getRangeAt(0).getBoundingClientRect();
      if (r && (r.width || r.height)) return r;
    }
    return { left: this._lastPointer.x, top: this._lastPointer.y, bottom: this._lastPointer.y, right: this._lastPointer.x, width: 0, height: 0 };
  }

  /* which reading surface the current selection lives in: 'pdf' | 'markdown' | null */
  _selectionSurface() {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return null;
    let node = sel.anchorNode;
    node = node && node.nodeType === 3 ? node.parentElement : node;
    if (!node || !node.closest) return null;
    if (node.closest('.popup-dict-pop')) return null;
    // pdf.js text layer (Obsidian's PDF view and ![[foo.pdf]] embeds)
    if (node.closest('.textLayer, .pdf-container, .pdf-embed, .pdf-viewer')) return 'pdf';
    if (node.closest('.markdown-source-view, .markdown-preview-view, .cm-editor, .markdown-rendered')) return 'markdown';
    return null;
  }

  /*
   * Clean up a selection made in the pdf.js text layer.
   * PDF text extraction is noisy: glyphs without a ToUnicode map come through
   * as U+0000, ligatures arrive as single codepoints, soft hyphens hide in
   * words, and Selection.toString() inserts "\n" between the absolutely
   * positioned spans - even mid-word when a PDF positions text per character.
   * dehyphenate: join words hyphenated across a line break. Only for manual
   * lookups - the auto path rejects multi-line selections first, so any "-\n"
   * it still sees is a same-line span break where joining would forge words.
   */
  _pdfNormalize(text, dehyphenate) {
    let t = String(text || '');
    t = t.replace(/[\u0000\u200B\uFEFF]/g, ''); // NUL, zero-widths
    t = t.replace(/\u2010/g, '-'); // U+2010 HYPHEN -> ASCII hyphen-minus
    if (dehyphenate) t = t.replace(/([A-Za-z])[-\u00AD][ \t]*\n[ \t]*(?=[A-Za-z])/g, '$1');
    t = t.replace(/\u00AD/g, ''); // remaining soft hyphens are invisible
    // span breaks show up as "\n": if the segments are mostly 1-2 chars the
    // PDF is positioned per glyph (join with nothing), otherwise as spaces;
    // segments are joined untrimmed so real space glyphs survive
    const raw = t.split('\n');
    if (raw.length > 1) {
      const content = raw.map((s) => s.trim()).filter(Boolean);
      const tiny = content.filter((s) => Array.from(s).length <= 2).length;
      t = raw.join(content.length && tiny >= content.length * 0.7 ? '' : ' ');
    }
    t = t.normalize('NFKC'); // ligatures -> ascii, full-width A -> A, half-width kana -> kana
    t = hasJapanese(t) ? t.replace(/\s+/g, '') : t.replace(/\s+/g, ' ');
    return t.trim();
  }

  /*
   * In PDFs "\n" appears between same-line spans, so it can't be used to
   * detect multi-line selections; use the selection rect geometry instead.
   * A single run of horizontal text stays within ~1 glyph height vertically
   * (max height, so ruby/tall math glyphs don't skew it); a single vertical
   * (tategaki) column stays within ~1 narrow glyph width horizontally.
   * Anything exceeding both is a genuine multi-line selection.
   */
  _selectionSpansMultipleLines() {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return false;
    const rects = sel.getRangeAt(0).getClientRects();
    let n = 0, maxH = 0, maxW = 0;
    let top = Infinity, bottom = -Infinity, left = Infinity, right = -Infinity;
    for (let i = 0; i < rects.length; i++) {
      const r = rects[i];
      if (!r.width || !r.height) continue;
      n++;
      if (r.height > maxH) maxH = r.height;
      if (r.width > maxW) maxW = r.width;
      if (r.top < top) top = r.top;
      if (r.bottom > bottom) bottom = r.bottom;
      if (r.left < left) left = r.left;
      if (r.right > right) right = r.right;
    }
    if (n <= 1) return false;
    if (bottom - top <= maxH * 1.9) return false; // fits one horizontal line
    // taller than one line: allow only a single narrow vertical-text column
    const verticalColumn = right - left <= maxW * 1.9 && maxW <= maxH * 1.5;
    return !verticalColumn;
  }

  _onSelectionSettled() {
    const surface = this._selectionSurface();
    if (!surface) return;
    const sel = window.getSelection();
    let text = sel ? String(sel) : '';
    if (surface === 'pdf') {
      if (!this.settings.enableInPdf) return;
      if (text.length > this.settings.maxSelLen * 8 + 64) return; // huge selection: skip the geometry/normalize work
      if (this._selectionSpansMultipleLines()) return; // 誤爆防止 (copy/annotate)
      text = this._pdfNormalize(text);
    } else {
      text = text.trim();
      if (/\n/.test(text)) return;
    }
    if (!text) return;
    const len = Array.from(text).length;
    if (len < this.settings.minSelLen || len > this.settings.maxSelLen) return;
    this.lookupText(text, this._rectFromSelection());
  }

  /*
   * Manual lookup (command / ribbon): prefer whatever is selected in the DOM —
   * this covers PDF views, reading view and the editor alike — and fall back
   * to the editor's cursor-window expansion when nothing is selected.
   */
  lookupFromAnywhere() {
    const surface = this._selectionSurface();
    const sel = window.getSelection();
    const domText = sel && !sel.isCollapsed ? String(sel) : '';
    // PDF selections first: they only exist in the DOM, never in editor state.
    // Manual lookups may span lines on purpose, so de-hyphenate here.
    if (surface === 'pdf') {
      const text = this._pdfNormalize(domText, true);
      if (text) { this.lookupText(text, this._rectFromSelection()); return; }
    }
    const editor = this.app.workspace.activeEditor && this.app.workspace.activeEditor.editor;
    // editor state is authoritative for editor selections (the DOM only holds
    // the rendered viewport, so String(sel) can be truncated for long ones)
    if (editor && editor.getSelection().trim()) { this.lookupFromEditor(editor); return; }
    if (surface === 'markdown' && domText.trim()) { // reading view
      this.lookupText(domText.trim(), this._rectFromSelection());
      return;
    }
    if (editor) { this.lookupFromEditor(editor); return; } // cursor-window expansion
    const fallback = String(window.getSelection() || '').trim();
    if (fallback) this.lookupText(fallback, this._rectFromSelection());
    else new obsidian.Notice('テキストを選択してから実行してください');
  }

  lookupFromEditor(editor) {
    let text = editor.getSelection();
    if (!text || !text.trim()) {
      // no selection: take a short window starting at the cursor
      const cur = editor.getCursor();
      const line = editor.getLine(cur.line) || '';
      const after = line.slice(cur.ch, cur.ch + 24);
      if (hasJapanese(after)) {
        text = after;
      } else {
        // expand to the English word around the cursor
        const m = /[A-Za-z][A-Za-z'\-]*/.exec(line.slice(Math.max(0, cur.ch - 20)));
        text = (m && m[0]) || after;
      }
    }
    this.lookupText((text || '').trim(), this._rectFromSelection());
  }

  lookupText(text, rect) {
    if (!text) return;
    if (!this.index) {
      new obsidian.Notice(this.loading ? '辞書を読み込み中です…' : '辞書が読み込まれていません');
      if (!this.loading) this.loadDictionary();
      return;
    }
    const res = this.index.lookup(text);
    res.query = text;
    this.popup.show(res, rect);
  }

  async saveSettings() { await this.saveData(this.settings); }
}

/* ---- settings tab ---- */

class PopupDictionarySettingTab extends obsidian.PluginSettingTab {
  constructor(app, plugin) { super(app, plugin); this.plugin = plugin; }

  display() {
    const { containerEl } = this;
    containerEl.empty();

    new obsidian.Setting(containerEl)
      .setName('選択で自動ポップアップ')
      .setDesc('テキストを選択したら自動で辞書ポップアップを表示します（オフにするとコマンド/リボンからのみ）。')
      .addToggle((t) => t.setValue(this.plugin.settings.autoOnSelect)
        .onChange(async (v) => { this.plugin.settings.autoOnSelect = v; await this.plugin.saveSettings(); }));

    new obsidian.Setting(containerEl)
      .setName('PDF内の選択でも自動ポップアップ')
      .setDesc('ObsidianのPDFビューアで単語を選択したときも辞書を表示します。')
      .addToggle((t) => t.setValue(this.plugin.settings.enableInPdf)
        .onChange(async (v) => { this.plugin.settings.enableInPdf = v; await this.plugin.saveSettings(); }));

    new obsidian.Setting(containerEl)
      .setName('最大表示件数')
      .setDesc('ポップアップに表示する見出し語の最大数。')
      .addSlider((s) => s.setLimits(1, 20, 1).setDynamicTooltip()
        .setValue(this.plugin.settings.maxResults)
        .onChange(async (v) => { this.plugin.settings.maxResults = v; await this.plugin.saveSettings(); }));

    new obsidian.Setting(containerEl)
      .setName('語義の最大表示数')
      .setDesc('1語あたりに表示する語義（sense）の最大数。')
      .addSlider((s) => s.setLimits(1, 12, 1).setDynamicTooltip()
        .setValue(this.plugin.settings.maxSenses)
        .onChange(async (v) => { this.plugin.settings.maxSenses = v; await this.plugin.saveSettings(); }));

    new obsidian.Setting(containerEl)
      .setName('自動ポップアップの最大文字数')
      .setDesc('これより長い選択では自動ポップアップしません（誤爆防止）。')
      .addSlider((s) => s.setLimits(5, 60, 1).setDynamicTooltip()
        .setValue(this.plugin.settings.maxSelLen)
        .onChange(async (v) => { this.plugin.settings.maxSelLen = v; await this.plugin.saveSettings(); }));

    new obsidian.Setting(containerEl)
      .setName('フォントサイズ (px)')
      .addSlider((s) => s.setLimits(10, 22, 1).setDynamicTooltip()
        .setValue(this.plugin.settings.fontSize)
        .onChange(async (v) => { this.plugin.settings.fontSize = v; await this.plugin.saveSettings(); }));

    new obsidian.Setting(containerEl)
      .setName('辞書データファイル')
      .setDesc('full = 全21万語（専門語も網羅）／ lite = 常用2.2万語（モバイルで軽量・高速）。変更後は「辞書データを再読み込み」を実行するか再起動してください。')
      .addDropdown((d) => d
        .addOption('dict.json', 'full（全語・推奨）')
        .addOption('dict-common.json', 'lite（常用語・軽量）')
        .setValue(this.plugin.settings.dataFile)
        .onChange(async (v) => {
          this.plugin.settings.dataFile = v;
          await this.plugin.saveSettings();
          this.plugin.index = null;
          await this.plugin.loadDictionary();
          this.display();
        }));

    const meta = this.plugin.index && this.plugin.index.meta;
    const info = containerEl.createEl('p', { cls: 'setting-item-description' });
    if (meta) {
      info.setText(`辞書: ${meta.source || 'JMdict'} / version ${meta.version || '?'} (${meta.dictDate || ''}) ・ ${(meta.count || 0).toLocaleString()} 語。 ${meta.license || ''}`);
    } else {
      info.setText('辞書データは未読み込みです。');
    }
  }
}

module.exports = PopupDictionaryPlugin;
