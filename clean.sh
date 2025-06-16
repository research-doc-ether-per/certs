#!/bin/bash
# =============================================================================
# DEMO 用・自己署名 CA 生成スクリプト
# =============================================================================
set -euo pipefail

# ───────────────────────────────────────────────
# 1. Root CA
# ───────────────────────────────────────────────
openssl genrsa -out rootCA.key 4096
openssl req -x509 -new -nodes -key rootCA.key \
  -sha256 -days 3650 \
  -subj "/C=JP/O=Local Dev CA/CN=Local Dev Root CA (DEMO)" \
  -out rootCA.pem

echo "rootCA.pem"

# ───────────────────────────────────────────────
# 2. HTTPS サーバー証明書
# ───────────────────────────────────────────────
openssl genrsa -out server.key 2048
openssl req -new -key server.key -out server.csr \
  -subj "/CN=host.docker.internal"

cat > san.ext <<'EOF'
subjectAltName = @alt_names
[alt_names]
DNS.1 = host.docker.internal
IP.1  = 127.0.0.1
IP.2  = ::1
EOF

openssl x509 -req -in server.csr \
  -CA rootCA.pem -CAkey rootCA.key -CAcreateserial \
  -out server.crt -days 750 -sha256 -extfile san.ext

echo "server.crt"

# ───────────────────────────────────────────────
# 3. mDL Doc-Signing 証明書
# ───────────────────────────────────────────────
openssl ecparam -name prime256v1 -genkey -noout -out mdl-issuer.key
openssl req -new -key mdl-issuer.key -out mdl-issuer.csr \
  -subj "/C=JP/O=Local mDL Issuer (DEMO)/CN=Local mDL Issuer"

cat > mdl.ext <<'EOF'
basicConstraints = CA:FALSE
keyUsage = digitalSignature
extendedKeyUsage = 1.3.6.1.5.5.7.3.35   # id-kp-documentSigning
EOF

openssl x509 -req -in mdl-issuer.csr \
  -CA rootCA.pem -CAkey rootCA.key -CAcreateserial \
  -out mdl-issuer.crt -days 365 -sha256 -extfile mdl.ext

echo "mdl-issuer.crt"

# ───────────────────────────────────────────────
# 4-A. x5Chain（PEM 一行化版）※可読性重視
# ───────────────────────────────────────────────
cat mdl-issuer.crt rootCA.pem > x5chain.pem
awk '{printf "%s\\n",$0}' x5chain.pem > x5chain_pem.txt
echo "x5chain_pem.txt   ← proof.x5chain に丸ごと 1 要素で入れる"

# ───────────────────────────────────────────────
# 4-B. x5Chain（DER→Base64URL 版）※walt.id 推奨
# ───────────────────────────────────────────────
for crt in mdl-issuer rootCA; do
  openssl x509 -outform der -in ${crt}.crt | \
    base64 -w0 | tr '+/' '-_' | tr -d '=' > ${crt}.b64
done

echo "mdl-issuer.b64 / rootCA.b64  ← proof.x5chain に順序どおり配列で入れる"

# ───────────────────────────────────────────────
# 5. trustedRootCAs（PEM 一行化：必要なら）
# ───────────────────────────────────────────────
awk '{printf "%s\\n",$0}' rootCA.pem > trustedRootCAs.txt
echo "trustedRootCAs.txt"
