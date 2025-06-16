
#!/bin/bash
# =============================================================================
# DEMO 用・自己署名 CA ワンストップ生成スクリプト (Base64 版)
# -----------------------------------------------------------------------------
# 自己署名 Root CA ➜ サーバー TLS ➜ mDL Doc-Signing ➜ Verifier 信頼
# まで一括で生成。x5Chain は “DER → Base64（改行なし）” 形式で出力。
#
# 生成物
# ├─ rootCA.pem / rootCA.key          … ルート CA（PEM）
# ├─ server.crt / server.key          … HTTPS 用
# ├─ mdl-issuer.crt / mdl-issuer.key  … mDL 署名用
# ├─ mdl-issuer.b64                   … x5Chain[0] に入れる Base64 文字列
# ├─ rootCA.b64                       … x5Chain[1] / trustedRootCAs 用
# └─ trustedRootCAs.txt               … PEM 版（必要に応じて）
# =============================================================================
set -euo pipefail

# ----------------------------------------------------------------------
# 1. ルート CA
# ----------------------------------------------------------------------
openssl genrsa -out rootCA.key 4096
openssl req -x509 -new -nodes -key rootCA.key \
  -sha256 -days 3650 \
  -subj "/C=JP/O=Local Dev CA/CN=Local Dev Root CA (DEMO)" \
  -out rootCA.pem
echo "✅ Root CA 発行完了 → rootCA.pem"

# ----------------------------------------------------------------------
# 2. HTTPS サーバー証明書
# ----------------------------------------------------------------------
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
echo "✅ サーバー証明書発行完了 → server.crt"

# ----------------------------------------------------------------------
# 3. mDL Doc-Signing 証明書
# ----------------------------------------------------------------------
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
echo "✅ Doc-Signing 証明書発行完了 → mdl-issuer.crt"

# ----------------------------------------------------------------------
# 4. x5Chain 用 Base64 文字列（改行なし）
# ----------------------------------------------------------------------
openssl x509 -outform der -in mdl-issuer.crt | base64 -w0 > mdl-issuer.b64
openssl x509 -outform der -in rootCA.pem     | base64 -w0 > rootCA.b64
echo "✅ x5Chain 生成完了 → mdl-issuer.b64 / rootCA.b64"

# ----------------------------------------------------------------------
# 5. trustedRootCAs（PEM 文字列：任意）
# ----------------------------------------------------------------------
awk '{printf "%s\\n",$0}' rootCA.pem > trustedRootCAs.txt
echo "✅ trustedRootCAs 生成完了 → trustedRootCAs.txt（必要なら使用）"


