
# ① 固定のファイル一覧（ここに並べる）――引数が渡されたら②で上書き
FILES=(
  "/path/to/file1.yaml"
  "/path/to/file2.env"
  "/path/to/config.json"
)

# ② コマンドライン引数でファイルを指定できるように（例: ./replace-ip-files.sh a b c）
if (( $# > 0 )); then
  FILES=("$@")
fi

for f in "${FILES[@]}"; do
  if [[ -f "$f" ]]; then
    # バックアップなしでインプレース置換（http/https を問わず純粋な IP 部分を置換）
    sed -i "s|${ESC_TARGET}|${NEW_IP}|g" "$f"
    echo "更新: $f"
  else
    echo "スキップ（存在しないファイル）: $f"
  fi
done
