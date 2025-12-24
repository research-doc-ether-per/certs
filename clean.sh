#!/usr/bin/env bash

# ------------------------------------------------------------
# Next.js / React プロジェクト向け 簡易点検スクリプト
#
# ・依存関係の実体確認（npm install 前提）
# ・React2Shell（CVE-2025-55182）を意識した内容
# ・結果は画面に出しつつ <PROJECT_NAME>.txt に保存
#
# ------------------------------------------------------------

set -u

# ------------------------------------------------------------
# プロジェクト名
# 優先度: 環境変数 > 引数 > デフォルト
# ------------------------------------------------------------
DEFAULT_PROJECT_NAME="issuer-web"
PROJECT_NAME="${PROJECT_NAME:-${1:-$DEFAULT_PROJECT_NAME}}"
OUT="${PROJECT_NAME}.txt"

# 判定用フラグ（ざっくりで）
HAS_RSD="no"
HAS_SERVER_CODE="no"
HAS_SUSPICIOUS="no"

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

if [ -d src/app ]; then
  echo "・src/app あり（App Router）" | tee -a "$OUT"
else
  echo "・src/app なし" | tee -a "$OUT"
fi

if ls next.config.* >/dev/null 2>&1; then
  echo "・next.config.* あり" | tee -a "$OUT"
else
  echo "・next.config.* なし" | tee -a "$OUT"
fi

# ------------------------------------------------------------
# 依存関係（実体）
# ------------------------------------------------------------
title "主要依存関係（実際に入っているもの）" | tee -a "$OUT"
run npm ls react react-dom next | tee -a "$OUT"

title "react-server-dom 系" | tee -a "$OUT"
run npm ls react-server-dom-webpack | tee -a "$OUT"
run npm ls react-server-dom-turbopack | tee -a "$OUT"
run npm ls react-server-dom-parcel | tee -a "$OUT"

# react-server-dom 系が入っているか（(empty) 以外が出たら yes）
if npm ls react-server-dom-webpack react-server-dom-turbopack react-server-dom-parcel 2>/dev/null | grep -vq "(empty)"; then
  HAS_RSD="yes"
fi

# 念のため lockfile も軽く見る
title "lockfile を軽く確認" | tee -a "$OUT"
if [ -f package-lock.json ]; then
  run grep -n "react-server-dom" package-lock.json | tee -a "$OUT"
else
  echo "package-lock.json なし" | tee -a "$OUT"
fi

# lockfile にも痕跡があるならフラグを立てる（grep ヒットしたら）
if [ -f package-lock.json ] && grep -q "react-server-dom" package-lock.json 2>/dev/null; then
  HAS_RSD="yes"
fi

# ------------------------------------------------------------
# サーバー側コード
# ------------------------------------------------------------
title "サーバー側コードの有無" | tee -a "$OUT"

echo "・Server Actions（use server）" | tee -a "$OUT"
run grep -R --line-number '"use server"' src 2>/dev/null | tee -a "$OUT"

echo ""
echo "・route.ts / route.js" | tee -a "$OUT"
run find src -type f \( -name 'route.ts' -o -name 'route.js' \) 2>/dev/null | tee -a "$OUT"

# サーバー側コードの有無（ざっくり）
if grep -R '"use server"' src >/dev/null 2>&1; then
  HAS_SERVER_CODE="yes"
fi
if find src -type f \( -name 'route.ts' -o -name 'route.js' \) 2>/dev/null | grep -q .; then
  HAS_SERVER_CODE="yes"
fi

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
echo "・CPU 食ってるやつ（上位だけ）" | tee -a "$OUT"
if has_cmd top; then
  run bash -lc 'top -b -n 1 | head -20' | tee -a "$OUT"
else
  echo "top が見つからないのでスキップ" | tee -a "$OUT"
fi

echo ""
echo "・変なプロセスがいないか（名前でざっくり）" | tee -a "$OUT"
run bash -lc "ps aux | grep -E 'xmrig|miner|kdevtmpfsi|kinsing|xmr' | grep -v grep" | tee -a "$OUT"
if ps aux | grep -E 'xmrig|miner|kdevtmpfsi|kinsing|xmr' | grep -vq grep; then
  HAS_SUSPICIOUS="yes"
fi

echo ""
echo "・node/next の親子関係（動いてる時だけ）" | tee -a "$OUT"
if has_cmd pstree && has_cmd pgrep; then
  PIDS="$(pgrep -f 'node|npm|next' || true)"
  if [ -n "$PIDS" ]; then
    run bash -lc "pstree -p $PIDS" | tee -a "$OUT"
  else
    echo "node/next は今は動いてない" | tee -a "$OUT"
  fi
else
  echo "pstree/pgrep がないのでスキップ" | tee -a "$OUT"
fi

echo ""
echo "・cron" | tee -a "$OUT"
run crontab -l | tee -a "$OUT"

echo ""
echo "・起動中の service" | tee -a "$OUT"
if has_cmd systemctl; then
  run systemctl list-units --type=service --state=running | tee -a "$OUT"
else
  echo "systemctl 未使用" | tee -a "$OUT"
fi

# ------------------------------------------------------------
# ネットワーク（軽め）
# ------------------------------------------------------------
title "ネットワーク通信の確認（軽め）" | tee -a "$OUT"

echo "・外向き通信（ESTABLISHED だけ / 多いと見づらいので上位だけ）" | tee -a "$OUT"
if has_cmd ss; then
  run bash -lc "ss -tunap | grep ESTAB | head -50" | tee -a "$OUT"
elif has_cmd netstat; then
  run bash -lc "netstat -tunlp | grep ESTABLISHED | head -50" | tee -a "$OUT"
else
  echo "ss/netstat がないのでスキップ" | tee -a "$OUT"
fi

echo ""
echo "・DNS っぽいログ（キーワードだけ拾う）" | tee -a "$OUT"
if has_cmd journalctl; then
  DNS_HIT="$(journalctl -u systemd-resolved --no-pager 2>/dev/null | grep -Ei 'pool|xmr|mine' | head -20 || true)"
  if [ -n "$DNS_HIT" ]; then
    echo "$DNS_HIT" | tee -a "$OUT"
    HAS_SUSPICIOUS="yes"
  else
    echo "特になし" | tee -a "$OUT"
  fi
else
  echo "journalctl がないのでスキップ" | tee -a "$OUT"
fi

# ------------------------------------------------------------
# ファイル（最近作られたものだけ）
# ------------------------------------------------------------
title "ファイルの確認（最近だけ）" | tee -a "$OUT"

echo "・/tmp /var/tmp（直近7日）" | tee -a "$OUT"
run bash -lc "find /tmp /var/tmp -maxdepth 2 -type f -mtime -7 2>/dev/null | head -50" | tee -a "$OUT"

echo ""
echo "・ホーム配下の隠しディレクトリ（直近7日）" | tee -a "$OUT"
run bash -lc "find \"\$HOME\" -maxdepth 2 -type d -name '.*' -mtime -7 2>/dev/null | head -50" | tee -a "$OUT"

# ------------------------------------------------------------
# 判定結果（人が読む前提のざっくり）
# ------------------------------------------------------------
title "判定結果（ざっくり）" | tee -a "$OUT"

if [ "$HAS_RSD" = "no" ] && [ "$HAS_SUSPICIOUS" = "no" ]; then
  echo "・ローカル環境を見る限り、特に変なところはなさそう。" | tee -a "$OUT"
  echo "・react-server-dom 系も入っていないので、今回の件は影響なさそう。" | tee -a "$OUT"
else
  echo "・少し気になる点が出ているので、該当箇所を個別に確認した方がよさそう。" | tee -a "$OUT"
fi

if [ "$HAS_SERVER_CODE" = "yes" ]; then
  echo "・サーバー側のコードがある構成。本番や検証環境があれば、同じ確認を一度回しておく。" | tee -a "$OUT"
else
  echo "・ほぼフロント寄りの構成。ローカル用途としては一旦これでOK。" | tee -a "$OUT"
fi

# ------------------------------------------------------------
# 終了
# ------------------------------------------------------------
echo "" | tee -a "$OUT"
echo "==============================" | tee -a "$OUT"
echo " 点検完了 : ${OUT}" | tee -a "$OUT"
echo "==============================" | tee -a "$OUT"
