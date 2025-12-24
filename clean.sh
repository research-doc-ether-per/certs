#!/usr/bin/env bash

# ------------------------------------------------------------
# Next.js / React プロジェクト向け 簡易点検スクリプト
#
# ・依存関係の実体確認（npm install 前提）
# ・React2Shell（CVE-2025-55182）を意識した内容
# ・結果は画面に出しつつ <PROJECT_NAME>.txt に保存
#
# ※ 読み取り専用
# ※ 日常点検・切り分け用途
# ------------------------------------------------------------

set -u

# ------------------------------------------------------------
# プロジェクト名
# 優先度: 環境変数 > 引数 > デフォルト
# ------------------------------------------------------------
DEFAULT_PROJECT_NAME="issuer-web"
PROJECT_NAME="${PROJECT_NAME:-${1:-$DEFAULT_PROJECT_NAME}}"
OUT="${PROJECT_NAME}.txt"

# 表示用
title() {
  echo ""
  echo "------------------------------"
  echo "$1"
  echo "------------------------------"
}

run() {
  echo ""
  echo "\$ $*"
  ( "$@" 2>&1 || true )
}

has_cmd() { command -v "$1" >/dev/null 2>&1; }

# ------------------------------------------------------------
# ヘッダ
# ------------------------------------------------------------
echo "==============================" | tee "$OUT"
echo " セキュリティ点検ログ" | tee -a "$OUT"
echo " プロジェクト : ${PROJECT_NAME}" | tee -a "$OUT"
echo " 実行日時     : $(date)" | tee -a "$OUT"
echo " 実行場所     : $(pwd)" | tee -a "$OUT"
echo "==============================" | tee -a "$OUT"

# ------------------------------------------------------------
# 環境
# ------------------------------------------------------------
title "実行環境" | tee -a "$OUT"
run node -v | tee -a "$OUT"
run npm -v | tee -a "$OUT"

# ------------------------------------------------------------
# プロジェクト構成
# ------------------------------------------------------------
title "プロジェクト構成" | tee -a "$OUT"

[ -d src/app ] \
  && echo "・src/app あり（App Router）" \
  || echo "・src/app なし"

ls next.config.* >/dev/null 2>&1 \
  && echo "・next.config.* あり" \
  || echo "・next.config.* なし" | tee -a "$OUT"

# ------------------------------------------------------------
# 依存関係（実体）
# ------------------------------------------------------------
title "主要依存関係（実際に入っているもの）" | tee -a "$OUT"
run npm ls react react-dom next | tee -a "$OUT"

title "react-server-dom 系" | tee -a "$OUT"
run npm ls react-server-dom-webpack | tee -a "$OUT"
run npm ls react-server-dom-turbopack | tee -a "$OUT"
run npm ls react-server-dom-parcel | tee -a "$OUT"

# 念のため lockfile も軽く見る
title "lockfile を軽く確認" | tee -a "$OUT"
[ -f package-lock.json ] \
  && run grep -n "react-server-dom" package-lock.json | tee -a "$OUT" \
  || echo "package-lock.json なし" | tee -a "$OUT"

# ------------------------------------------------------------
# サーバー側コード
# ------------------------------------------------------------
title "サーバー側コードの有無" | tee -a "$OUT"

echo "・Server Actions（use server）" | tee -a "$OUT"
run grep -R --line-number '"use server"' src 2>/dev/null | tee -a "$OUT"

echo ""
echo "・route.ts / route.js" | tee -a "$OUT"
run find src -type f \( -name 'route.ts' -o -name 'route.js' \) 2>/dev/null | tee -a "$OUT"

# ------------------------------------------------------------
# 気になる API（当たりを付けるだけ）
# ------------------------------------------------------------
title "少し気になる API（ざっと）" | tee -a "$OUT"
run grep -R --line-number -E \
  "\b(child_process|execSync|exec\(|spawn\(|fork\(|eval\(|new Function\(|vm\.)\b" \
  src 2>/dev/null | tee -a "$OUT"

# ------------------------------------------------------------
# 不審な挙動の確認（Linux向け）
# ------------------------------------------------------------
title "不審な挙動の確認（Linux向け）" | tee -a "$OUT"

echo "・今のユーザー / 負荷" | tee -a "$OUT"
run whoami | tee -a "$OUT"
has_cmd uptime && run uptime | tee -a "$OUT"

echo ""
echo "・変なプロセスがいないか" | tee -a "$OUT"
run ps aux | grep -E 'xmrig|miner|kdevtmpfsi|kinsing|xmr' | grep -v grep | tee -a "$OUT"

echo ""
echo "・cron" | tee -a "$OUT"
run crontab -l | tee -a "$OUT"

echo ""
echo "・起動中の service" | tee -a "$OUT"
has_cmd systemctl \
  && run systemctl list-units --type=service --state=running | tee -a "$OUT" \
  || echo "systemctl 未使用" | tee -a "$OUT"

# ------------------------------------------------------------
# 終了
# ------------------------------------------------------------
echo "" | tee -a "$OUT"
echo "==============================" | tee -a "$OUT"
echo " 点検完了 : ${OUT}" | tee -a "$OUT"
echo "==============================" | tee -a "$OUT"
