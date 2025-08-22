#!/usr/bin/env bash
set -euo pipefail

# ===== 定数（必要に応じてここだけ編集）========================
SERVER_KEY="/certs/keycloak-server.key.pem"
SERVER_CERT="/certs/keycloak-server.crt.pem"
TRUST_STORE="/certs/cacerts"
TRUST_STORE_PASS="password"

# ← ここに“もう一方”のホストを固定（IP でも DNS 名でもOK）
PRIMARY_HOST="10.0.2.15"   # 例: "10.0.2.15" / "example.local"
# ============================================================

mkdir -p /certs

# SAN を作成（localhost は常に含める + PRIMARY_HOST も追加）
SAN="DNS:localhost"
if [[ "$PRIMARY_HOST" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  SAN="$SAN,IP:$PRIMARY_HOST"         # IP の場合
  CN="$PRIMARY_HOST"
else
  SAN="$SAN,DNS:$PRIMARY_HOST"        # DNS 名の場合
  CN="$PRIMARY_HOST"
fi

echo "サーバ証明書を生成します: CN=$CN, SAN=$SAN"

# 自己署名サーバ証明書（localhost と PRIMARY_HOST の両方で有効）
openssl req -newkey rsa:2048 -nodes -x509 -sha256 -days 3650 \
  -keyout "$SERVER_KEY" \
  -out "$SERVER_CERT" \
  -subj "/CN=${CN}" \
  -addext "subjectAltName=${SAN}"

chmod 600 "$SERVER_KEY"

# TrustStore 作成（後段の API クライアント側で利用）
echo "TrustStore にインポートします..."
rm -f "$TRUST_STORE" || true
keytool -importcert -trustcacerts -noprompt \
  -alias "keycloak" \
  -file "$SERVER_CERT" \
  -keystore "$TRUST_STORE" \
  -storepass "$TRUST_STORE_PASS"

echo "完了: $SERVER_CERT（SAN: $SAN）/ TrustStore: $TRUST_STORE"
