#!/usr/bin/env bash

# ========================================
# React2Shell (CVE-2025-55182) 自主点検スクリプト
# 対象プロジェクト：issuer-web
# 実行結果は標準出力 + issuer-web.txt に保存されます
# ========================================

OUT="issuer-web.txt"

echo "========================================" | tee "$OUT"
echo " React2Shell (CVE-2025-55182) 点検レポート" | tee -a "$OUT"
echo " プロジェクト名：issuer-web" | tee -a "$OUT"
echo " 実行日時：$(date)" | tee -a "$OUT"
echo "========================================" | tee -a "$OUT"
echo "" | tee -a "$OUT"

# ----------------------------------------
# 1. Node.js / npm バージョン確認
# ----------------------------------------
echo "=== 1. Node.js / npm バージョン ===" | tee -a "$OUT"
node -v | tee -a "$OUT"
npm -v | tee -a "$OUT"
echo "" | tee -a "$OUT"

# ----------------------------------------
# 2. 主要依存関係の実インストール版数確認
# （package.json ではなく node_modules ベース）
# ----------------------------------------
echo "=== 2. react / react-dom / next 実インストール版数 ===" | tee -a "$OUT"
npm ls react react-dom next | tee -a "$OUT"
echo "" | tee -a "$OUT"

# ----------------------------------------
# 3. React2Shell 直接影響パッケージ確認
# react-server-dom-webpack
# ----------------------------------------
echo "=== 3. react-server-dom-webpack 確認 ===" | tee -a "$OUT"
npm ls react-server-dom-webpack | tee -a "$OUT"
echo "" | tee -a "$OUT"

# ----------------------------------------
# 4. react-server-dom-turbopack 確認
# ----------------------------------------
echo "=== 4. react-server-dom-turbopack 確認 ===" | tee -a "$OUT"
npm ls react-server-dom-turbopack | tee -a "$OUT"
echo "" | tee -a "$OUT"

# ----------------------------------------
# 5. react-server-dom-parcel 確認
# ----------------------------------------
echo "=== 5. react-server-dom-parcel 確認 ===" | tee -a "$OUT"
npm ls react-server-dom-parcel | tee -a "$OUT"
echo "" | tee -a "$OUT"

# ----------------------------------------
# 6. package-lock.json における間接依存確認
# （node_modules の最終的な真実）
# ----------------------------------------
echo "=== 6. package-lock.json 内の react-server-dom 検索 ===" | tee -a "$OUT"
if [ -f node_modules/.package-lock.json ]; then
  grep -R "react-server-dom" node_modules/.package-lock.json | tee -a "$OUT"
else
  echo "node_modules/.package-lock.json が見つかりません" | tee -a "$OUT"
fi
echo "" | tee -a "$OUT"

# ----------------------------------------
# 7. Server Actions 使用有無確認
# ("use server" が存在する場合、攻撃面が拡大)
# ----------------------------------------
echo "=== 7. Server Actions（\"use server\"）使用確認 ===" | tee -a "$OUT"
grep -R --line-number '"use server"' src/app 2>/dev/null | tee -a "$OUT"
echo "" | tee -a "$OUT"

# ----------------------------------------
# 8. Route Handlers 確認（サーバー実行コード）
# ----------------------------------------
echo "=== 8. route.ts / route.js 存在確認 ===" | tee -a "$OUT"
find src/app -name 'route.ts' -o -name 'route.js' | tee -a "$OUT"
echo "" | tee -a "$OUT"

echo "========================================" | tee -a "$OUT"
echo " 点検完了" | tee -a "$OUT"
echo " 出力ファイル：issuer-web.txt" | tee -a "$OUT"
echo "========================================" | tee -a "$OUT"

