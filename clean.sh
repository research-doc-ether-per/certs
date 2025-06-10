#!/usr/bin/env bash
###############################################################################
# build_waltid.sh
#   walt.id の特定サービスをローカル build し、docker-compose.yml の
#   pull_policy を never に書き換えるユーティリティ
#
# 使い方:
#   ./build_waltid.sh                   # 3つ全部 build
#   ./build_waltid.sh issuer-api        # issuer-api のみ build
#   COMPOSE_FILE=./docker-compose.yml ./build_waltid.sh wallet-api
###############################################################################

set -euo pipefail

###############################################################################
# 設定値（必要に応じて変更）
###############################################################################
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yaml}"  # デフォルトの compose ファイル
DEFAULT_SERVICES=("wallet-api" "issuer-api" "verifier-api")
SED="${SED:-sed}"                                    # macOS なら gsed を指定

###############################################################################
# ユーティリティ関数
###############################################################################
die() { echo "❌ $*" >&2; exit 1; }

###############################################################################
# 1. 引数解析
###############################################################################
if [[ $# -eq 0 ]]; then
  SERVICES=("${DEFAULT_SERVICES[@]}")        # 引数なし → 全部
elif [[ $# -eq 1 ]]; then
  [[ " ${DEFAULT_SERVICES[*]} " == *" $1 "* ]] \
    || die "引数は wallet-api / issuer-api / verifier-api のいずれかにしてください"
  SERVICES=("$1")                            # 指定された 1 サービス
else
  die "引数は最大 1 つまでです"
fi

echo "▶ ビルド対象: ${SERVICES[*]}"
echo "▶ 使用 compose ファイル: $COMPOSE_FILE"
[[ -f "$COMPOSE_FILE" ]] || die "$COMPOSE_FILE が見つかりません"

###############################################################################
# 2. docker compose build
###############################################################################
docker compose -f "$COMPOSE_FILE" build "${SERVICES[@]}"
echo "✅ build 完了"

###############################################################################
# 3. pull_policy を never に書き換え
###############################################################################
for svc in "${SERVICES[@]}"; do
  # service ブロックの開始行を探すための正規表現
  svc_regex="^\\s{2}${svc}:"

  # すでに pull_policy 行があるか判定
  if $SED -n "/$svc_regex/,/^[^[:space:]]/p" "$COMPOSE_FILE" | grep -q "pull_policy:"; then
    # 既存行を never に置換
    $SED -i -E "/$svc_regex/,/^[^[:space:]]/ s/pull_policy:\\s+[a-z]+/pull_policy: never/" "$COMPOSE_FILE"
  else
    # pull_policy 行が無ければ service ブロック直下に挿入（2スペースインデント）
    $SED -i -E "/$svc_regex/a\\
  pull_policy: never" "$COMPOSE_FILE"
  fi
done

echo "✅ pull_policy を never に設定しました（${SERVICES[*]}）"
echo "🎉 これで 'docker compose up --no-build' でローカルイメージを確実に使用できます"
