#!/usr/bin/env bash
set -euo pipefail
umask 077   # 生成的私钥默认600权限

CERT_DIR="/certs"                   # 你现在用的常量
install -d -m 700 "$CERT_DIR"       # 确保目录存在且权限正确

# 写权限自检（能touch才继续）
touch "$CERT_DIR/.write_test" || {
  echo "❌ $CERT_DIR 不可写。检查卷是否只读(:ro)或容器用户权限。" >&2
  ls -ld "$CERT_DIR"; mount | grep " $CERT_DIR " || true
  exit 1
}
rm -f "$CERT_DIR/.write_test"

SERVER_KEY="$CERT_DIR/keycloak-server.key.pem"
SERVER_CERT="$CERT_DIR/keycloak-server.crt.pem"
TRUST_STORE="$CERT_DIR/cacerts"
TRUST_STORE_PASS="password"

PRIMARY_HOST="10.0.2.15"
SAN="DNS:localhost,IP:$PRIMARY_HOST"
CN="$PRIMARY_HOST"

# 生成证书
openssl req -newkey rsa:2048 -nodes -x509 -sha256 -days 3650 \
  -keyout "$SERVER_KEY" \
  -out "$SERVER_CERT" \
  -subj "/CN=${CN}" \
  -addext "subjectAltName=${SAN}"

chmod 600 "$SERVER_KEY"

# 导入到 truststore
rm -f "$TRUST_STORE" || true
keytool -importcert -trustcacerts -noprompt \
  -alias keycloak \
  -file "$SERVER_CERT" \
  -keystore "$TRUST_STORE" \
  -storepass "$TRUST_STORE_PASS"
