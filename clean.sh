#!/usr/bin/env bash

set -u

PROJECT_NAME="${PROJECT_NAME:-${1:-issuer-web}}"
OUT="${PROJECT_NAME}.txt"

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
{
  echo "=============================="
  echo " 点検ログ"
  echo " プロジェクト : ${PROJECT_NAME}"
  echo " 実行日時     : $(date)"
  echo " 実行場所     : $(pwd)"
  echo "=============================="
} | tee "$OUT"

# ------------------------------------------------------------
# 実行環境
# ------------------------------------------------------------
title "実行環境" | tee -a "$OUT"
run node -v | tee -a "$OUT"
run npm -v | tee -a "$OUT"
run uname -a | tee -a "$OUT"
has_cmd lsb_release && run lsb_release -a | tee -a "$OUT"

# ------------------------------------------------------------
# 前提ファイル
# ------------------------------------------------------------
title "前提チェック" | tee -a "$OUT"
[ -f package.json ] && echo "package.json : あり" | tee -a "$OUT"
[ -f package-lock.json ] && echo "package-lock.json : あり" | tee -a "$OUT"
[ -d node_modules ] && echo "node_modules : あり" | tee -a "$OUT"
ls next.config.* >/dev/null 2>&1 && echo "next.config.* : あり" | tee -a "$OUT"

# ------------------------------------------------------------
# 主要依存関係
# ------------------------------------------------------------
title "主要依存関係 (npm ls)" | tee -a "$OUT"
run npm ls react react-dom next | tee -a "$OUT"

# ------------------------------------------------------------
# react-server-dom 系
# ------------------------------------------------------------
title "react-server-dom 系 (npm ls)" | tee -a "$OUT"
run npm ls react-server-dom-webpack | tee -a "$OUT"
run npm ls react-server-dom-turbopack | tee -a "$OUT"
run npm ls react-server-dom-parcel | tee -a "$OUT"

title "lockfile 内の痕跡 (grep)" | tee -a "$OUT"
[ -f package-lock.json ] && run grep -n "react-server-dom" package-lock.json | tee -a "$OUT"

# ------------------------------------------------------------
# サーバー側要素（ざっと）
# ------------------------------------------------------------
title "サーバー側要素（ざっと検索）" | tee -a "$OUT"

echo "Server Actions: use server" | tee -a "$OUT"
run grep -R --line-number --fixed-strings '"use server"' src 2>/dev/null | tee -a "$OUT"

echo ""
echo "Route handlers: route.ts / route.js" | tee -a "$OUT"
run find src -type f \( -name route.ts -o -name route.js \) 2>/dev/null | tee -a "$OUT"

echo ""
echo "API routes: app/api / pages/api" | tee -a "$OUT"
[ -d src/app/api ] && echo "src/app/api : あり" | tee -a "$OUT" || echo "src/app/api : 見当たらない" | tee -a "$OUT"
[ -d pages/api ] && echo "pages/api : あり" | tee -a "$OUT" || echo "pages/api : 見当たらない" | tee -a "$OUT"

# ------------------------------------------------------------
# 気になる API（当たりだけ）
# ------------------------------------------------------------
title "少し気になる API（当たりだけ）" | tee -a "$OUT"
run grep -R --line-number -E '\b(child_process|execSync|exec\(|spawn\(|fork\(|eval\(|new Function\(|vm\.)\b' src 2>/dev/null | tee -a "$OUT"

# ------------------------------------------------------------
# 実行中プロセス / 負荷
# ------------------------------------------------------------
title "実行中プロセス / 負荷" | tee -a "$OUT"
run whoami | tee -a "$OUT"
has_cmd uptime && run uptime | tee -a "$OUT"

echo ""
echo "CPU 使用率（上位のみ）" | tee -a "$OUT"
has_cmd top && run bash -lc 'top -b -n 1 | head -20' | tee -a "$OUT"

echo ""
echo "よく見る名前のプロセス（名前一致）" | tee -a "$OUT"
run bash -lc "ps aux | grep -E 'xmrig|miner|kdevtmpfsi|kinsing|xmr' | grep -v grep" | tee -a "$OUT"

echo ""
echo "node / next の親子関係（動いている場合）" | tee -a "$OUT"
if has_cmd pgrep && has_cmd pstree; then
  PIDS="$(pgrep -f 'node|npm|next' || true)"
  [ -n "$PIDS" ] && run pstree -p $PIDS | tee -a "$OUT"
fi

# ------------------------------------------------------------
# cron / service
# ------------------------------------------------------------
title "cron / service" | tee -a "$OUT"
run crontab -l | tee -a "$OUT"
has_cmd systemctl && run systemctl list-units --type=service --state=running | tee -a "$OUT"

# ------------------------------------------------------------
# ネットワーク（軽め）
# ------------------------------------------------------------
title "ネットワーク通信（軽め）" | tee -a "$OUT"

echo "ESTABLISHED（上位のみ）" | tee -a "$OUT"
if has_cmd ss; then
  run bash -lc "ss -tunap | grep -E 'ESTAB|ESTABLISHED' | head -50" | tee -a "$OUT"
elif has_cmd netstat; then
  run bash -lc "netstat -tunlp | grep ESTABLISHED | head -50" | tee -a "$OUT"
fi

echo ""
echo "DNS ログ（キーワード一致のみ）" | tee -a "$OUT"
has_cmd journalctl && run bash -lc "journalctl -u systemd-resolved --no-pager 2>/dev/null | grep -Ei 'pool|xmr|mine' | head -20" | tee -a "$OUT"

# ------------------------------------------------------------
# ファイル（最近だけ）
# ------------------------------------------------------------
title "ファイル（最近のみ）" | tee -a "$OUT"

echo "/tmp /var/tmp（直近7日）" | tee -a "$OUT"
run bash -lc "find /tmp /var/tmp -maxdepth 2 -type f -mtime -7 2>/dev/null | head -50" | tee -a "$OUT"

echo ""
echo "ホーム配下の隠しディレクトリ（直近7日）" | tee -a "$OUT"
run bash -lc "find \"\$HOME\" -maxdepth 2 -type d -name '.*' -mtime -7 2>/dev/null | head -50" | tee -a "$OUT"

# ------------------------------------------------------------
# 終了
# ------------------------------------------------------------
{
  echo ""
  echo "=============================="
  echo " 点検完了 : ${OUT}"
  echo "=============================="
} | tee -a "$OUT"
