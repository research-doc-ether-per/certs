
# ② Dockerfile内のgradleバージョンを固定にする & JDK17 を追加する

# 置換対象
OLD='FROM docker.io/gradle:jdk21 AS buildstage'
NEW='FROM docker.io/gradle:8.14.3-jdk21 AS buildstage'

# JDK17 インストール用のブロック（1行で書く）
JDK17_BLOCK='RUN apt-get update && apt-get install -y --no-install-recommends openjdk-17-jdk && rm -rf /var/lib/apt/lists/*'

# 対象ファイルの探索
mapfile -t FILES < <(
  find "$ROOT" -type f \( -iname 'Dockerfile' -o -iname '*Dockerfile' -o -iname '*dockerfile' \) -print0 \
  | xargs -0 -r grep -l -F -- "$OLD" 2>/dev/null || true
)

if (( ${#FILES[@]} == 0 )); then
  echo "対象行を含む Dockerfile は見つかりませんでした: $ROOT"
  exit 0
fi

# 置換
echo "Dockerfile内のgradleバージョンを固定にし、JDK17 を追加します"
COUNT=0

for f in "${FILES[@]}"; do
  echo "処理中: $f"

  # ① FROM 行の置換（行全体一致の場合のみ）
  sed -i.bak "s|^$OLD$|$NEW|" "$f"

  # ② 既に openjdk-17-jdk が入っていれば JDK17 追加はスキップ（冪等性）
  if grep -q 'openjdk-17-jdk' "$f"; then
    echo "  -> 既に JDK17 追加済みのためスキップ"
    ((COUNT++))
    continue
  fi

  # ③ ENV GRADLE_OPTS があればその直後に JDK17_BLOCK を挿入
  if grep -q '^ENV GRADLE_OPTS' "$f"; then
    sed -i "/^ENV GRADLE_OPTS/a $JDK17_BLOCK" "$f"
    echo "  -> ENV GRADLE_OPTS の後に JDK17 を追加"
  else
    # なければ FROM … buildstage の直後に挿入
    sed -i "/$NEW/a $JDK17_BLOCK" "$f"
    echo "  -> FROM buildstage の後に JDK17 を追加"
  fi

  echo "  -> バックアップ: ${f}.bak"
  ((COUNT++))
done

echo "完了: ${COUNT} 件のファイルを更新しました。"
