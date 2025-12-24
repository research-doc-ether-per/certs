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

has_cmd() { command -v "$1" >/dev/null 2>&1; }

# コマンド実行：結果が空なら (該当なし) を出す
run_or_none() {
  echo ""
  echo "\$ $*"
  local OUT_STR
  OUT_STR="$("$@" 2>&1 || true)"
  if [ -n "$OUT_STR" ]; then
    echo "$OUT_STR"
  else
    echo "(該当なし)"
  fi
}

# ざっくり存在確認：必ず あり/なし を出す
check_path() {
  local LABEL="$1"
  local TYPE="$2" # f or d
  local PATH_="$3"
  if [ "$TYPE" = "f" ] && [ -f "$PATH_" ]; then
    echo "${LABEL} : あり"
  elif [ "$TYPE" = "d" ] && [ -d "$PATH_" ]; then
    echo "${LABEL} : あり"
  else
    echo "${LABEL} : なし"
  fi
}

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
run_or_none node -v | tee -a "$OUT"
run_or_none npm -v | tee -a "$OUT"
run_or_none uname -a | tee -a "$OUT"

if has_cmd lsb_release; then
  run_or_none lsb_release -a | tee -a "$OUT"
else
  echo "" | tee -a "$OUT"
  echo "\$ lsb_release -a" | tee -a "$OUT"
  echo "(コマンドなし)" | tee -a "$OUT"
fi

# ------------------------------------------------------------
# 前提ファイル
# ------------------------------------------------------------
title "前提チェック" | tee -a "$OUT"
check_path "package.json" "f" "package.json" | tee -a "$OUT"
check_path "package-lock.json" "f" "package-lock.json" | tee -a "$OUT"
check_path "node_modules" "d" "node_modules" | tee -a "$OUT"

if ls next.config.* >/dev/null 2>&1; then
  echo "next.config.* : あり" | tee -a "$OUT"
else
  echo "next.config.* : なし" | tee -a "$OUT"
fi

# ------------------------------------------------------------
# 主要依存関係
# ------------------------------------------------------------
title "主要依存関係 (npm ls)" | tee -a "$OUT"
run_or_none npm ls react react-dom next | tee -a "$OUT"

# ------------------------------------------------------------
# react-server-dom 系
# ------------------------------------------------------------
title "react-server-dom 系 (npm ls)" | tee -a "$OUT"
run_or_none npm ls react-server-dom-webpack | tee -a "$OUT"
run_or_none npm ls react-server-dom-turbopack | tee -a "$OUT"
run_or_none npm ls react-server-dom-parcel | tee -a "$OUT"

title "lockfile 内の痕跡 (grep)" | tee -a "$OUT"
if [ -f package-lock.json ]; then
  run_or_none bash -lc "grep -n 'react-server-dom' package-lock.json" | tee -a "$OUT"
else
  echo "" | tee -a "$OUT"
  echo "\$ grep -n 'react-server-dom' package-lock.json" | tee -a "$OUT"
  echo "(package-lock.json なし)" | tee -a "$OUT"
fi

# ------------------------------------------------------------
# サーバー側要素（ざっと）
# ------------------------------------------------------------
title "サーバー側要素（ざっと検索）" | tee -a "$OUT"

echo "Server Actions: use server" | tee -a "$OUT"
if [ -d src ]; then
  run_or_none bash -lc "grep -R --line-number --fixed-strings '\"use server\"' src 2>/dev/null" | tee -a "$OUT"
else
  echo "\$ grep -R ... src" | tee -a "$OUT"
  echo "(src ディレクトリなし)" | tee -a "$OUT"
fi

echo "" | tee -a "$OUT"
echo "Route handlers: route.ts / route.js" | tee -a "$OUT"
if [ -d src ]; then
  run_or_none bash -lc "find src -type f \\( -name route.ts -o -name route.js \\) 2>/dev/null" | tee -a "$OUT"
else
  echo "\$ find src ..." | tee -a "$OUT"
  echo "(src ディレクトリなし)" | tee -a "$OUT"
fi

echo "" | tee -a "$OUT"
echo "API routes: app/api / pages/api" | tee -a "$OUT"
check_path "src/app/api" "d" "src/app/api" | tee -a "$OUT"
check_path "pages/api" "d" "pages/api" | tee -a "$OUT"

# ------------------------------------------------------------
# 気になる API（当たりだけ）
# ------------------------------------------------------------
title "少し気になる API（当たりだけ）" | tee -a "$OUT"
if [ -d src ]; then
  run_or_none bash -lc "grep -R --line-number -E '\\b(child_process|execSync|exec\\(|spawn\\(|fork\\(|eval\\(|new Function\\(|vm\\.)\\b' src 2>/dev/null" | tee -a "$OUT"
else
  echo "\$ grep -R ... src" | tee -a "$OUT"
  echo "(src ディレクトリなし)" | tee -a "$OUT"
fi

# ------------------------------------------------------------
# 実行中プロセス / 負荷
# ------------------------------------------------------------
title "実行中プロセス / 負荷" | tee -a "$OUT"
run_or_none whoami | tee -a "$OUT"
if has_cmd uptime; then
  run_or_none uptime | tee -a "$OUT"
else
  echo "" | tee -a "$OUT"
  echo "\$ uptime" | tee tee -a "$OUT" 2>/dev/null || true
  echo "(コマンドなし)" | tee -a "$OUT"
fi

echo "" | tee -a "$OUT"
echo "CPU 使用率（上位のみ）" | tee -a "$OUT"
if has_cmd top; then
  run_or_none bash -lc "top -b -n 1 | head -20" | tee -a "$OUT"
else
  echo "\$ top -b -n 1 | head -20" | tee -a "$OUT"
  echo "(コマンドなし)" | tee -a "$OUT"
fi

echo "" | tee -a "$OUT"
echo "よく見る名前のプロセス（名前一致）" | tee -a "$OUT"
run_or_none bash -lc "ps aux | grep -E 'xmrig|miner|kdevtmpfsi|kinsing|xmr' | grep -v grep" | tee -a "$OUT"

echo "" | tee -a "$OUT"
echo "node / next の親子関係（動いている場合）" | tee -a "$OUT"
if has_cmd pgrep && has_cmd pstree; then
  ROOT_PID="$(pgrep -fo -E 'node|npm|next' || true)"
  if [ -n "$ROOT_PID" ]; then
    run_or_none pstree -ap "$ROOT_PID" | tee -a "$OUT"
  else
    echo "\$ pstree -ap <pid>" | tee -a "$OUT"
    echo "(node / next は現在動いていない)" | tee -a "$OUT"
  fi
else
  echo "\$ pgrep / pstree" | tee -a "$OUT"
  echo "(pgrep または pstree が使えないためスキップ)" | tee -a "$OUT"
fi

# ------------------------------------------------------------
# cron / service
# ------------------------------------------------------------
title "cron / service" | tee -a "$OUT"
if has_cmd crontab; then
  run_or_none crontab -l | tee -a "$OUT"
else
  echo "" | tee -a "$OUT"
  echo "\$ crontab -l" | tee -a "$OUT"
  echo "(コマンドなし)" | tee -a "$OUT"
fi

if has_cmd systemctl; then
  run_or_none systemctl list-units --type=service --state=running | tee -a "$OUT"
else
  echo "" | tee -a "$OUT"
  echo "\$ systemctl list-units --type=service --state=running" | tee -a "$OUT"
  echo "(systemctl なし)" | tee -a "$OUT"
fi

# ------------------------------------------------------------
# ネットワーク（軽め）
# ------------------------------------------------------------
title "ネットワーク通信（軽め）" | tee -a "$OUT"

echo "ESTABLISHED（上位のみ）" | tee -a "$OUT"
if has_cmd ss; then
  run_or_none bash -lc "ss -tunap | grep -E 'ESTAB|ESTABLISHED' | head -50" | tee -a "$OUT"
elif has_cmd netstat; then
  run_or_none bash -lc "netstat -tunlp | grep ESTABLISHED | head -50" | tee -a "$OUT"
else
  echo "\$ ss / netstat" | tee -a "$OUT"
  echo "(どちらも使えない)" | tee -a "$OUT"
fi

echo "" | tee -a "$OUT"
echo "DNS ログ（キーワード一致のみ）" | tee -a "$OUT"
if has_cmd journalctl; then
  DNS_LOG="$(journalctl -u systemd-resolved --no-pager 2>/dev/null \
    | grep -Ei 'pool|xmr|mine' \
    | head -20 || true)"
  echo "\$ journalctl -u systemd-resolved ... | grep -Ei 'pool|xmr|mine' | head -20" | tee -a "$OUT"
  if [ -n "$DNS_LOG" ]; then
    echo "$DNS_LOG" | tee -a "$OUT"
  else
    echo "(該当なし)" | tee -a "$OUT"
  fi
else
  echo "\$ journalctl -u systemd-resolved ..." | tee -a "$OUT"
  echo "(journalctl が使えないためスキップ)" | tee -a "$OUT"
fi

# ------------------------------------------------------------
# ファイル（最近だけ）
# ------------------------------------------------------------
title "ファイル（最近のみ）" | tee -a "$OUT"

echo "/tmp /var/tmp（直近7日）" | tee -a "$OUT"
run_or_none bash -lc "find /tmp /var/tmp -maxdepth 2 -type f -mtime -7 2>/dev/null | head -50" | tee -a "$OUT"

echo "" | tee -a "$OUT"
echo "ホーム配下の隠しディレクトリ（直近7日）" | tee -a "$OUT"
run_or_none bash -lc "find \"\$HOME\" -maxdepth 2 -type d -name '.*' -mtime -7 2>/dev/null | head -50" | tee -a "$OUT"

# ------------------------------------------------------------
# 終了
# ------------------------------------------------------------
{
  echo ""
  echo "=============================="
  echo " 点検完了 : ${OUT}"
  echo "=============================="
} | tee -a "$OUT"
