# JMdict Popup Dictionary (Japanese-English) — offline

Obsidian用のオフライン英和・和英ポップアップ辞書。単語を選択すると読み・意味を
ポップアップ表示します。ネット接続不要。デスクトップ／モバイル（iPad）対応。

## 使い方
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

## 設定
- 自動ポップアップのON/OFF、最大表示件数、語義数、フォントサイズ。
- **辞書データファイル**:
  - `dict.json` … full（全217,768語。専門用語も網羅。既定・推奨）
  - `dict-common.json` … lite（常用22,610語。モバイルで軽量・高速）
  - 切り替え後は「辞書データを再読み込み」コマンドを実行するか、Obsidianを再起動。

## 辞書データの更新・再生成
`build_dict.py` は [jmdict-simplified](https://github.com/scriptin/jmdict-simplified)
のJSONリリースからコンパクトな辞書を生成します。

```
# 例: 最新の全語版をダウンロードして再生成
#   https://github.com/scriptin/jmdict-simplified/releases から
#   jmdict-eng-<version>.json（全語）または jmdict-eng-common-<version>.json（常用）を取得し展開
python build_dict.py jmdict-eng-<version>.json dict.json
python build_dict.py jmdict-eng-common-<version>.json dict-common.json
```

## ライセンス / 出典
辞書データは **JMdict**（Electronic Dictionary Research and Development Group /
EDRDG）に基づき、**CC BY-SA 4.0** で提供されています。
本プラグインはこのデータを再配布しており、同ライセンスの帰属表示を満たす必要があります。
- JMdict: https://www.edrdg.org/jmdict/j_jmdict.html
- jmdict-simplified: https://github.com/scriptin/jmdict-simplified
