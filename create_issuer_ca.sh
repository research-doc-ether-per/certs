#!/usr/bin/env bash
set -euo pipefail

# -----------------------------------------------------------------------------
# create_issuer_ca.sh
#   • certs/issuer/root にルートCAの鍵と自己署名証明書を作成
#   • certs/issuer/intermediate に中間CAの鍵・CSR・証明書を作成
#   • certs/verifier にルートCAをコピー（Verifierの信頼ルート用）
# -----------------------------------------------------------------------------

# 1. ディレクトリ構成を作成
mkdir -p certs/issuer/root
mkdir -p certs/issuer/intermediate
mkdir -p certs/issuer/leaf
mkdir -p certs/verifier
mkdir -p certs/holder

# -----------------------------------------------------------------------------
# 2. ルートCAの鍵と自己署名証明書を生成
# -----------------------------------------------------------------------------

# 2.1 prime256v1（ECDSA P-256）曲線でルートCAの秘密鍵を生成
openssl ecparam -name prime256v1 -genkey -noout \
  -out certs/issuer/root/root.key.pem

# 2.2 生成した秘密鍵から有効期限10年の自己署名ルートCA証明書を作成
#     サブジェクトは /C=JP/ST=Tokyo/L=Chiyoda-ku/O=MyOrg/OU=RootCA/CN=RootCA とする
openssl req -x509 \
  -key certs/issuer/root/root.key.pem \
  -sha256 \
  -days 3650 \
  -subj "/C=JP/ST=Tokyo/L=Chiyoda-ku/O=MyOrg/OU=RootCA/CN=RootCA" \
  -out certs/issuer/root/root.pem

# -----------------------------------------------------------------------------
# 3. Verifier用にルートCA証明書をコピー
# -----------------------------------------------------------------------------

# ルートCA証明書を certs/verifier/trusted_root.pem として配置
cp certs/issuer/root/root.pem certs/verifier/trusted_root.pem

# -----------------------------------------------------------------------------
# 4. 中間CA用の鍵とCSR、証明書を生成
# -----------------------------------------------------------------------------

# 4.1 prime256v1（ECDSA P-256）曲線で中間CAの秘密鍵を生成
openssl ecparam -name prime256v1 -genkey -noout \
  -out certs/issuer/intermediate/intermediate.key.pem

# 4.2 中間CA証明書署名要求（CSR）を生成
#     サブジェクトは /C=JP/ST=Tokyo/L=Chiyoda-ku/O=MyOrg/OU=IntermediateCA/CN=IntermediateCA とする
openssl req -new -sha256 \
  -key certs/issuer/intermediate/intermediate.key.pem \
  -subj "/C=JP/ST=Tokyo/L=Chiyoda-ku/O=MyOrg/OU=IntermediateCA/CN=IntermediateCA" \
  -out certs/issuer/intermediate/intermediate.csr.pem

# 4.3 ルートCAで中間CAのCSRに署名し、中間CA証明書を発行（有効期間5年）
openssl x509 -req \
  -in certs/issuer/intermediate/intermediate.csr.pem \
  -CA certs/issuer/root/root.pem \
  -CAkey certs/issuer/root/root.key.pem \
  -CAcreateserial \
  -days 1825 \
  -sha256 \
  -out certs/issuer/intermediate/intermediate.pem

echo "✅ Issuer と Verifier の CA 証明書を作成しました。"
