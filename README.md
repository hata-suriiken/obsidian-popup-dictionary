# JMdict Popup Dictionary (Japanese-English) — offline

An offline Japanese-English / English-Japanese popup dictionary for Obsidian, powered by
**JMdict**. Select a word to see its readings and meanings in a popup. No network connection
required. Works on desktop and mobile (iPad).

## Features
- **Popup on selection**: select a word in the editor or reading view and a dictionary popup
  appears automatically (can be turned off in settings).
- **Works in PDFs too**: selecting a word inside a PDF opened in Obsidian (including
  `![[file.pdf]]` embeds) also triggers the popup. Line-wrap hyphenation in English
  (`informa-tion` → `information`), ligatures (`ﬁ` → `fi`), and the extra whitespace PDF text
  layers produce are normalized automatically. Selections spanning multiple lines (e.g. when
  copying a passage) are ignored so the popup doesn't fire by accident. Can be disabled
  separately from the main auto-popup setting.
- **Command palette & ribbon**: a command (Japanese label: 選択テキストを辞書で引く — "Look up
  selection in dictionary") can be bound to a hotkey or added to the mobile toolbar; a ribbon
  icon (book) does the same. Both work outside the editor too (e.g. in the PDF viewer).
- **Bidirectional**: Japanese (kanji/kana) → English and English → Japanese. Conjugated
  Japanese verb/adjective forms are automatically deinflected back to their dictionary form
  before lookup (食べた → 食べる "ate → eat", 高かった → 高い "was expensive → expensive",
  行った → 行く "went → go", etc.).

## Installation
Install from Obsidian: **Settings → Community plugins → Browse**, search for
"JMdict Popup Dictionary", install and enable.

**Dictionary data is downloaded automatically the first time the plugin loads** (from this
repository's [GitHub releases](https://github.com/hata-suriiken/obsidian-popup-dictionary/releases/latest);
full ≈ 30 MB, lite ≈ 4 MB — this is the plugin's only network access, and only happens when the
data file is missing). If the download fails (e.g. offline), run the "辞書データを再読み込み"
(Reload dictionary data) command once you're back online, or download `dict.json` from the
latest release yourself and place it in
`<YourVault>/.obsidian/plugins/jmdict-popup-dictionary/`.

**Manual install** (without the directory): download `main.js`, `manifest.json`, and
`styles.css` from the
[latest release](https://github.com/hata-suriiken/obsidian-popup-dictionary/releases/latest)
into `<YourVault>/.obsidian/plugins/jmdict-popup-dictionary/`, then enable the plugin in
Settings → Community plugins.

## Settings
- Toggle auto-popup on selection (globally, and separately for PDF selections).
- Maximum number of dictionary entries shown, maximum senses per entry, popup font size.
- Maximum selection length that still triggers the popup automatically.
- **Dictionary data file**:
  - `dict.json` — full dictionary (217,768 entries, includes technical/specialist vocabulary;
    default, recommended).
  - `dict-common.json` — lite dictionary (22,610 common entries; smaller and faster to load on
    mobile).
  - After switching, run the "Reload dictionary data" command or restart Obsidian.

## Rebuilding the dictionary data
`build_dict.py` generates the compact dictionary files from a
[jmdict-simplified](https://github.com/scriptin/jmdict-simplified) JSON release.

```
# Example: download the latest release from
#   https://github.com/scriptin/jmdict-simplified/releases
#   (jmdict-eng-<version>.json = full, jmdict-eng-common-<version>.json = common words only)
python build_dict.py jmdict-eng-<version>.json dict.json
python build_dict.py jmdict-eng-common-<version>.json dict-common.json
```

## License & credits
Plugin code is MIT licensed (see `LICENSE`). The bundled dictionary data is based on
**JMdict** (Electronic Dictionary Research and Development Group / EDRDG) and is distributed
under **CC BY-SA 4.0**; this plugin redistributes that data and satisfies the license's
attribution requirement here:
- JMdict: https://www.edrdg.org/jmdict/j_jmdict.html
- jmdict-simplified: https://github.com/scriptin/jmdict-simplified

---

## 日本語

Obsidian用のオフライン英和・和英ポップアップ辞書（JMdict使用）。単語を選択すると読み・意味を
ポップアップ表示します。ネット接続不要。デスクトップ／モバイル（iPad）対応。

### インストール
設定 → コミュニティプラグイン → 閲覧 から「JMdict Popup Dictionary」を検索してインストール・有効化。

**辞書データは初回起動時に自動ダウンロードされます**（本リポジトリの
[GitHubリリース](https://github.com/hata-suriiken/obsidian-popup-dictionary/releases/latest)から。
full≈30MB／lite≈4MB。通信はこのダウンロードのみで、データファイルが無いときだけ実行）。
ダウンロードに失敗した場合は、オンラインの状態で「辞書データを再読み込み」コマンドを実行するか、
最新リリースから `dict.json` を手動で
`<Vault>/.obsidian/plugins/jmdict-popup-dictionary/` に配置してください。

### 使い方
- **選択でポップアップ**: エディタ／プレビューで単語を選択すると自動表示（設定でOFF可）。
- **PDFにも対応**: Obsidianで開いたPDF（埋め込み `![[foo.pdf]]` 含む）内で単語を
  選択しても自動表示されます。行またぎの改行や英単語のハイフネーション
  （informa-tion → information）、日本語PDFの余分な空白、合字（ﬁ→fi 等）は
  自動で正規化します。複数行にまたがる選択（コピー目的など）では自動表示しません。
  設定「PDF内の選択でも自動ポップアップ」でOFFにできます。
- **コマンド**: 「選択テキストを辞書で引く」— ホットキー割り当てやモバイルのツールバーに追加可能。
  エディタ以外（PDFビュー等）でも動作します。
- **リボン**: 左のブック型アイコンからも実行できます。
- 日本語（漢字・かな）→ 英語、英単語 → 日本語 の**双方向**。活用形（食べた→食べる、
  高かった→高い、行った→行く 等）も自動で見出し語に戻して検索します。

### 設定
- 自動ポップアップのON/OFF、最大表示件数、語義数、フォントサイズ。
- **辞書データファイル**:
  - `dict.json` … full（全217,768語。専門用語も網羅。既定・推奨）
  - `dict-common.json` … lite（常用22,610語。モバイルで軽量・高速）
  - 切り替え後は「辞書データを再読み込み」コマンドを実行するか、Obsidianを再起動。

### 辞書データの更新・再生成
`build_dict.py` は [jmdict-simplified](https://github.com/scriptin/jmdict-simplified)
のJSONリリースからコンパクトな辞書を生成します。

```
# 例: 最新の全語版をダウンロードして再生成
#   https://github.com/scriptin/jmdict-simplified/releases から
#   jmdict-eng-<version>.json（全語）または jmdict-eng-common-<version>.json（常用）を取得し展開
python build_dict.py jmdict-eng-<version>.json dict.json
python build_dict.py jmdict-eng-common-<version>.json dict-common.json
```

### ライセンス / 出典
辞書データは **JMdict**（Electronic Dictionary Research and Development Group /
EDRDG）に基づき、**CC BY-SA 4.0** で提供されています。
本プラグインはこのデータを再配布しており、同ライセンスの帰属表示を満たす必要があります。
- JMdict: https://www.edrdg.org/jmdict/j_jmdict.html
- jmdict-simplified: https://github.com/scriptin/jmdict-simplified
