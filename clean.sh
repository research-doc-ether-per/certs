
#!/usr/bin/env bash
set -euo pipefail

# =========================================================
# 目的:
#   指定した複数ディレクトリ配下の全ファイルから
#   "10.0.2.15" を "10.0.2.18" に一括置換する（上書き・バックアップ無し）
#
# 使い方:
#   1) DIRS / TARGET_IP / NEW_IP を環境に合わせて編集
#   2) chmod +x replace-ip.sh
#   3) ./replace-ip.sh
# =========================================================

# ★処理対象のディレクトリ（必要なだけ追加）
DIRS=(
  "/path/to/dirA"
  "/path/to/dirB"
  "/path/to/dirC"
)

# ★置換する IP（旧 → 新）
TARGET_IP="10.0.2.15"
NEW_IP="10.0.2.18"

# 除外したいディレクトリ（ビルド成果物など）
EXCLUDE_DIRS=( ".git" "node_modules" "dist" "build" ".gradle" ".idea" "target" "vendor" )

# 除外したい拡張子（バイナリを避ける）
EXCLUDE_EXTS=( "png" "jpg" "jpeg" "gif" "ico" "pdf" "zip" "tar" "gz" "7z" "jar" "war" "exe" "dll" )

# sed のために "." をエスケープ
ESC_TARGET_IP="${TARGET_IP//./\\.}"

# grep の除外オプションを組み立て
GREP_ARGS=()
for d in "${EXCLUDE_DIRS[@]}"; do
  GREP_ARGS+=( --exclude-dir="$d" )
done
for ext in "${EXCLUDE_EXTS[@]}"; do
  GREP_ARGS+=( --exclude="*.${ext}" )
done

for root in "${DIRS[@]}"; do
  if [[ ! -d "$root" ]]; then
    echo "スキップ（存在しないディレクトリ）: $root"
    continue
  fi

  echo "処理中: $root"

  # - 対象文字列を含むファイルのみ抽出（NUL 区切り）
  # - sed -i でインプレース置換（バックアップ無し）
  grep -rlZ -F "${TARGET_IP}" "${GREP_ARGS[@]}" -- "$root" 2>/dev/null \
    | xargs -0 -r sed -i "s|${ESC_TARGET_IP}|${NEW_IP}|g"

  echo "完了: $root"
done

echo "全ディレクトリの置換が完了しました。${TARGET_IP} → ${NEW_IP}"
