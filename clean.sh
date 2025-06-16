#!/bin/bash
# =============================================================================
# DEMO 用・自己署名 CA について
# -----------------------------------------------------------------------------
# このスクリプトは *検証・デモ目的* で使用することを想定しています。
# 公式な交通局／公安機関の PKI ではなく、
#
#   自己署名 Root CA
#        └─ サーバー TLS 証明書（HTTPS 用）
#        └─ mDL Doc-Signing 証明書（VC 署名用）
#             └─ Verifier へ信頼登録
#
# というローカル完結フローを実装しています。
# 本番環境で運用する場合は、必ず公的機関が発行するルート証明書を使用
# してください。
# =============================================================================

# 1. ルート CA の秘密鍵を生成
openssl genrsa -out rootCA.key 4096

# 2. ルート CA 証明書（有効期限 10 年）を自己署名
openssl req -x509 -new -nodes -key rootCA.key \
  -sha256 -days 3650 \
  -subj "/C=JP/O=Local Dev CA/CN=Local Dev Root CA (DEMO)" \
  -out rootCA.pem

# 3. サーバー秘密鍵を生成
openssl genrsa -out server.key 2048

# 4. CSR（証明書署名要求）を作成
openssl req -new -key server.key -out server.csr \
  -subj "/CN=host.docker.internal"

# 5. SAN（代替名）を設定
cat > san.ext <<EOF
subjectAltName = @alt_names
[alt_names]
DNS.1 = host.docker.internal
IP.1  = 127.0.0.1
IP.2  = ::1
EOF

# 6. ルート CA で署名（有効期限 2 年）
openssl x509 -req -in server.csr \
  -CA rootCA.pem -CAkey rootCA.key -CAcreateserial \
  -out server.crt -days 750 -sha256 -extfile san.ext

# 7. Doc-Signing 用 P-256 秘密鍵を生成
openssl ecparam -name prime256v1 -genkey -noout -out mdl-issuer.key

# 8. CSR を作成
openssl req -new -key mdl-issuer.key -out mdl-issuer.csr \
  -subj "/C=JP/O=Local mDL Issuer (DEMO)/CN=Local mDL Issuer"

# 9. Doc-Signing 専用拡張を定義
cat > mdl.ext <<EOF
basicConstraints = CA:FALSE
keyUsage = digitalSignature
extendedKeyUsage = 1.3.6.1.5.5.7.3.35   # id-kp-documentSigning
EOF

# 10. Doc-Signing 証明書（有効期限 1 年）を署名
openssl x509 -req -in mdl-issuer.csr \
  -CA rootCA.pem -CAkey rootCA.key -CAcreateserial \
  -out mdl-issuer.crt -days 365 -sha256 -extfile mdl.ext

# 11. PEM → DER 変換
openssl x509 -outform der -in mdl-issuer.crt > leaf.der
openssl x509 -outform der -in rootCA.pem     > root.der

# 12. DER を連結し、Base64URL エンコード（VC の proof.x5chain 用）
cat leaf.der root.der | base64 -w0 | tr '+/' '-_' | tr -d '=' > x5chain.txt

# 13. trustedRootCAs：根 CA を PEM のまま出力（VC の trustedRootCAs 用）
cp rootCA.pem trustedRootCAs.txt           # そのままコピーでも可
# awk 'NF' rootCA.pem > trustedRootCAs.txt # 空行を除去したい場合はこちら
