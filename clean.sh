#!/usr/bin/env bash
# ===============================================================
# 目的:
#   複数ファイルに対して、"http://host.docker.internal" を
#   "http://<ホストIPv4>" に一括置換する。
#
# 前提:
#   - ホストの IPv4 一覧が host_ipv4_list.txt に保存されていること
#     （先頭の有効な IPv4 を使用）
#
# 使い方:
#   1) HOST_IP_FILE と FILES 配列を自分の環境に合わせて編集
#   2) chmod +x replace-host-ip.sh
#   3) ./replace-host-ip.sh
# ===============================================================

set -euo pipefail

# --- 1) ホストIPを読み込むファイル（編集してください） --------------------
HOST_IP_FILE="/absolute/path/to/host_ipv4_list.txt"  # ← 例: /home/you/host_ipv4_list.txt

# --- 2) 置換対象ファイル（編集してください・必要なだけ追加） --------------
FILES=(
  "/path/to/file1.yaml"
  "/path/to/file2.env"
  "/path/to/another/config.json"
)

# --- 3) host.docker.internal を探す検索文字列 -----------------------------
OLD_PREFIX='http://host.docker.internal'

# --- 4) 入力チェック -------------------------------------------------------
if [[ ! -f "$HOST_IP_FILE" ]]; then
  echo "エラー: ホストIPファイルが見つかりません: $HOST_IP_FILE" >&2
  exit 1
fi

# 先頭の有効な IPv4（空行や無関係な行をスキップ）
HOST_IP="$(grep -m1 -E '^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$' "$HOST_IP_FILE" || true)"
if [[ -z "${HOST_IP:-}" ]]; then
  echo "エラー: 有効な IPv4 が $HOST_IP_FILE に見つかりません。" >&2
  exit 1
fi

echo "使用するホストIPv4: $HOST_IP"

# --- 5) 置換処理 -----------------------------------------------------------
UPDATED=0
for f in "${FILES[@]}"; do
  if [[ ! -f "$f" ]]; then
    echo "スキップ: ファイルが存在しません -> $f"
    continue
  fi

  # 置換後の文字列
  NEW_PREFIX="http://$HOST_IP"

  # 行内に対象があるかざっくり確認（なくても sed は安全に動く）
  if grep -q "$OLD_PREFIX" "$f"; then
    # バックアップ作成しつつインプレース置換（| 区切り、正規表現の \. はエスケープ）
    sed -i.bak "s|${OLD_PREFIX}|${NEW_PREFIX}|g" "$f"
    echo "更新: $f （バックアップ: $f.bak）"
    ((UPDATED++))
  else
    echo "変更なし: $f（対象文字列が見つかりません）"
  fi
done

echo "完了: ${UPDATED} 件のファイルを更新しました。"
