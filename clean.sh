#!/usr/bin/env bash
# ======================================================================
# 目的:
#   固定ディレクトリ配下の Dockerfile 群を走査し、
#   次の FROM 行のみ（行全体が一致する場合）を一括置換する。
#     旧) FROM docker.io/gradle:jdk21 AS buildstage
#     新) FROM docker.io/gradle:8.14.3-jdk21 AS buildstage
#
# 使い方:
#   このファイルの ROOT を自分のリポジトリのパスに書き換えて実行するだけ。
#   例: ROOT="/home/ubuntu/waltid-identity"
#
# 安全策:
#   sed -i.bak により *.bak のバックアップを自動作成。
# ======================================================================

set -euo pipefail

# --- 検索開始ディレクトリ（ここを編集してください） ------------------------
ROOT="/path/to/your/repo"   # ← 自分のリポジトリのルートに変更する

# --- 置換対象の定義 ----------------------------------------------------
OLD='FROM docker.io/gradle:jdk21 AS buildstage'
NEW='FROM docker.io/gradle:8.14.3-jdk21 AS buildstage'

# --- 前提チェック ------------------------------------------------------
if [[ ! -d "$ROOT" ]]; then
  echo "エラー: ROOT ディレクトリが存在しません: $ROOT"
  exit 1
fi

# --- 対象ファイルの探索 ------------------------------------------------
# 備考:
#   - find で Dockerfile らしき名称を列挙
#   - xargs + grep -l -F で「旧行」を含むものだけを抽出
mapfile -t FILES < <(
  find "$ROOT" -type f \( -iname 'Dockerfile' -o -iname '*Dockerfile*' -o -iname '*dockerfile*' \) -print0 \
  | xargs -0 -r grep -l -F -- "$OLD" 2>/dev/null || true
)

if (( ${#FILES[@]} == 0 )); then
  echo "対象行を含む Dockerfile は見つかりませんでした: $ROOT"
  exit 0
fi

# --- 置換処理 ----------------------------------------------------------
echo "置換開始（対象ファイル数: ${#FILES[@]}）"
COUNT=0
for f in "${FILES[@]}"; do
  # 行全体が一致する場合のみ置換（^ と $ でアンカー）
  sed -i.bak \
    's|^FROM docker\.io/gradle:jdk21 AS buildstage$|FROM docker.io/gradle:8.14.3-jdk21 AS buildstage|' \
    "$f"

  echo "更新: $f （バックアップ: ${f}.bak）"
  ((COUNT++))
done

echo "完了: ${COUNT} 件のファイルを更新しました。"

