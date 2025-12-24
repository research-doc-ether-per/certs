#!/usr/bin/env bash

# ------------------------------------------------------------
# Next.js / React プロジェクト向け 簡易点検スクリプト
#
# 目的:
# - 依存関係 / ロックファイル / サーバー要素の有無を、手早く「事実ベース」で確認する
# - ローカル環境(ubuntu等)での、日常点検・切り分け用途
#
# 方針:
# - このスクリプトは「判定」はしない（出力された結果を見て人が判断する）
# - 画面に出しつつ <PROJECT_NAME>.txt に保存する
#
# 使い方:
#   PROJECT_NAME=issuer-web ./check.sh
#   ./check.sh issuer-web
# ------------------------------------------------------------

set -u

# ---------------------------
# プロジェクト名
# 優先度: 環境変数 > 引数 > デフォルト
# ---------------------------
DEFAULT_PROJECT_NAME="issuer-web"
PROJECT_NAME="${PROJECT_NAME:-${1:-$DEFAULT_PROJECT_NAME}}"
OUT="${PROJECT_NAME}.txt"

# ---------------------------
# 表示用ユーティリティ
# ---------------------------
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

# npm ls は依存欠落で exit != 0 になるので、スクリプト継続させる
run_npm_ls() {
  echo ""
  echo "\$ npm ls $*"
  ( npm ls "$@" 2>&1 || true )
}

# ---------------------------
# ヘッダ
# ---------------------------
{
  echo "=============================="
  echo " 点検ログ"
  echo " プロジェクト : ${PROJECT_NAME}"
  echo " 実行日時     : $(date)"
  echo " 実行場所     : $(pwd)"
  echo "=============================="
} | tee "$OUT"

# ---------------------------
# 実行環境
# ---------------------------
title "実行環境" | tee -a "$OUT"
run node -v | tee -a "$OUT"
run npm -v | tee -a "$OUT"
has_cmd uname && run uname -a | tee -a "$OUT"
has_cmd lsb_release && run lsb_release -a | tee -a "$OUT"

# ---------------------------
# 前提チェック
# ---------------------------
title "前提チェック" | tee -a "$OUT"
if [ -f package.json ]; then
  echo "・package.json: あり" | tee -a "$OUT"
else
  echo "・package.json: なし（このディレクトリで実行しているか確認）" | tee -a "$OUT"
fi

if [ -d node_modules ]; then
  echo "・node_modules: あり（npm install 済み想定）" | tee -a "$OUT"
else
  echo "・node_modules: なし（必要なら npm install を先に実行）" | tee -a "$OUT"
fi

if [ -f package-lock.json ]; then
  echo "・package-lock.json: あり" | tee -a "$OUT"
else
  echo "・package-lock.json: なし" | tee -a "$OUT"
fi

# ---------------------------
# プロジェクト構成（Next.js観点）
# ---------------------------
title "プロジェクト構成（Next.js観点）" | tee -a "$OUT"

if [ -d src/app ]; then
  echo "・src/app: あり（App Router）" | tee -a "$OUT"
else
  echo "・src/app: なし" | tee -a "$OUT"
fi

if [ -d src/pages ] || [ -d pages ]; then
  echo "・pages: あり（Pages Router の可能性）" | tee -a "$OUT"
else
  echo "・pages: 見当たらない" | tee -a "$OUT"
fi

if ls next.config.* >/dev/null 2>&1; then
  echo "・next.config.*: あり" | tee -a "$OUT"
  run ls -la next.config.* | tee -a "$OUT"
else
  echo "・next.config.*: なし" | tee -a "$OUT"
fi

# ---------------------------
# 主要依存関係（インストール実体）
# ---------------------------
title "主要依存関係（npm ls）" | tee -a "$OUT"
run_npm_ls react react-dom next | tee -a "$OUT"

title "react-server-dom 系（npm ls）" | tee -a "$OUT"
run_npm_ls react-server-dom-webpack | tee -a "$OUT"
run_npm_ls react-server-dom-turbopack | tee -a "$OUT"
run_npm_ls react-server-dom-parcel | tee -a "$OUT"

# 依存関係のトップレベルを軽く見たい時用（多いと長いので省略）
title "dependencies / devDependencies（package.json 抜粋）" | tee -a "$OUT"
if has_cmd node && [ -f package.json ]; then
  run node -e "const p=require('./package.json'); console.log('dependencies:', Object.keys(p.dependencies||{})); console.log('devDependencies:', Object.keys(p.devDependencies||{}));" | tee -a "$OUT"
fi

# ---------------------------
# lockfile の痕跡（入ってたら出る）
# ---------------------------
title "lockfile の痕跡（grep）" | tee -a "$OUT"
if [ -f package-lock.json ]; then
  run grep -n "react-server-dom" package-lock.json | tee -a "$OUT"
  run grep -n "\"next\"" package-lock.json | head -50 | tee -a "$OUT"
else
  echo "package-lock.json がないのでスキップ" | tee -a "$OUT"
fi

# ---------------------------
# サーバー側要素の有無（Next.js）
# ---------------------------
title "サーバー側要素（ざっと検索）" | tee -a "$OUT"

echo "・Server Actions: \"use server\"" | tee -a "$OUT"
if [ -d src ]; then
  run grep -R --line-number --fixed-strings '"use server"' src 2>/dev/null | tee -a "$OUT"
else
  echo "src がないのでスキップ" | tee -a "$OUT"
fi

echo "" | tee -a "$OUT"
echo "・Route handlers: route.ts / route.js" | tee -a "$OUT"
if [ -d src ]; then
  run find src -type f \( -name 'route.ts' -o -name 'route.js' \) 2>/dev/null | tee -a "$OUT"
fi

echo "" | tee -a "$OUT"
echo "・API routes: app/api or pages/api" | tee -a "$OUT"
if [ -d src/app/api ]; then
  run find src/app/api -maxdepth 4 -type f 2>/dev/null | tee -a "$OUT"
else
  echo "src/app/api: 見当たらない" | tee -a "$OUT"
fi
if [ -d src/pages/api ]; then
  run find src/pages/api -maxdepth 4 -type f 2>/dev/null | tee -a "$OUT"
elif [ -d pages/api ]; then
  run find pages/api -maxdepth 4 -type f 2>/dev/null | tee -a "$OUT"
else
  echo "pages/api: 見当たらない" | tee -a "$OUT"
fi

# ---------------------------
# 少し気になる API（コードで当たりを付ける）
# ---------------------------
title "少し気になる API（当たりを付けるだけ）" | tee -a "$OUT"
if [ -d src ]; then
  run grep -R --line-number -E \
    "\b(child_process|execSync|exec\(|spawn\(|fork\(|eval\(|new Function\(|vm\.)\b" \
    src 2>/dev/null | tee -a "$OUT"
else
  echo "src がないのでスキップ" | tee -a "$OUT"
fi

# ---------------------------
# 不審な挙動の確認（Linux向け / 軽め）
# ※ ここは「ローカルの目視支援」用。権限や環境で出力が変わる。
# ---------------------------
title "不審な挙動の確認（Linux向け）" | tee -a "$OUT"

echo "・今のユーザー / 負荷" | tee -a "$OUT"
run whoami | tee -a "$OUT"
has_cmd uptime && run uptime | tee -a "$OUT"

echo "" | tee -a "$OUT"
echo "・CPU 食ってるやつ（上位だけ）" | tee -a "$OUT"
if has_cmd top; then
  run bash -lc 'top -b -n 1 | head -20' | tee -a "$OUT"
else
  echo "top がないのでスキップ" | tee -a "$OUT"
fi

echo "" | tee -a "$OUT"
echo "・よく見る名前のプロセス（ざっくり）" | tee -a "$OUT"
# grep が0件でもエラーにしない。ヒットしたらそのまま出す。
run bash -lc "ps aux | grep -E 'xmrig|miner|kdevtmpfsi|kinsing|xmr' | grep -v grep" | tee -a "$OUT"

echo "" | tee -a "$OUT"
echo "・node/next の親子関係（動いてる時だけ）" | tee -a "$OUT"
if has_cmd pstree && has_cmd pgrep; then
  PIDS="$(pgrep -f 'node|npm|next' || true)"
  if [ -n "$PIDS" ]; then
    run bash -lc "pstree -p $PIDS" | tee -a "$OUT"
  else
    echo "node/npm/next は今は動いてない" | tee -a "$OUT"
  fi
else
  echo "pstree / pgrep がないのでスキップ" | tee -a "$OUT"
fi

echo "" | tee -a "$OUT"
echo "・cron（ユーザー分）" | tee -a "$OUT"
run crontab -l | tee -a "$OUT"

echo "" | tee -a "$OUT"
echo "・起動中の service（一覧）" | tee -a "$OUT"
if has_cmd systemctl; then
  run systemctl list-units --type=service --state=running | tee -a "$OUT"
else
  echo "systemctl がないのでスキップ" | tee -a "$OUT"
fi

# ---------------------------
# ネットワーク（軽め）
# ---------------------------
title "ネットワーク通信の確認（軽め）" | tee -a "$OUT"

echo "・ESTABLISHED（上位だけ）" | tee -a "$OUT"
if has_cmd ss; then
  run bash -lc "ss -tunap | grep -E 'ESTAB|ESTABLISHED' | head -50" | tee -a "$OUT"
elif has_cmd netstat; then
  # net-tools が入っている場合のみ
  run bash -lc "netstat -tunap 2>/dev/null | grep -E 'ESTABLISHED' | head -50" | tee -a "$OUT"
else
  echo "ss / netstat がないのでスキップ" | tee -a "$OUT"
fi

echo "" | tee -a "$OUT"
echo "・DNSっぽいログ（キーワードだけ拾う）" | tee -a "$OUT"
if has_cmd journalctl; then
  # systemd-resolved が無い環境もあるので、0件でもOK
  run bash -lc "journalctl -u systemd-resolved --no-pager 2>/dev/null | grep -Ei 'pool|xmr|mine' | head -20" | tee -a "$OUT"
else
  echo "journalctl がないのでスキップ" | tee -a "$OUT"
fi

# ---------------------------
# ファイル（最近作られたものだけ）
# ---------------------------
title "ファイルの確認（最近だけ）" | tee -a "$OUT"

echo "・/tmp /var/tmp（直近7日、上位だけ）" | tee -a "$OUT"
run bash -lc "find /tmp /var/tmp -maxdepth 2 -type f -mtime -7 2>/dev/null | head -50" | tee -a "$OUT"

echo "" | tee -a "$OUT"
echo "・ホーム配下の隠しディレクトリ（直近7日、上位だけ）" | tee -a "$OUT"
run bash -lc "find \"\$HOME\" -maxdepth 2 -type d -name '.*' -mtime -7 2>/dev/null | head -50" | tee -a "$OUT"

# ---------------------------
# 補足（判定しない宣言）
# ---------------------------
title "補足" | tee -a "$OUT"
echo "・上の内容は、ローカルで取れた情報の一覧。" | tee -a "$OUT"
echo "・このスクリプトは結論は出さない（必要なところだけ個別に見る用）。" | tee -a "$OUT"

# ---------------------------
# 終了
# ---------------------------
echo "" | tee -a "$OUT"
echo "==============================" | tee -a "$OUT"
echo " 点検完了 : ${OUT}" | tee -a "$OUT"
echo "==============================" | tee -a "$OUT"
