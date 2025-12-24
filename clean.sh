echo ""
echo "node / next の親子関係（動いている場合）" | tee -a "$OUT"

if has_cmd pgrep && has_cmd pstree; then
  # pgrep は -E を使わない（環境差で死ぬ）
  # node / npm / next をフルコマンドラインから探す
  ROOT_PID="$(pgrep -fo 'node|npm|next' 2>/dev/null || true)"

  if [ -n "$ROOT_PID" ]; then
    echo "\$ pstree -ap ${ROOT_PID}" | tee -a "$OUT"
    pstree -ap "${ROOT_PID}" 2>&1 | tee -a "$OUT"
  else
    echo "(該当なし)" | tee -a "$OUT"
  fi
else
  echo "(pgrep/pstree が使えないためスキップ)" | tee -a "$OUT"
fi
