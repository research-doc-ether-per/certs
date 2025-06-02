#!/usr/bin/env bash
set -euo pipefail

# -----------------------------------------------------------------------------
# create_holder_leaf.sh
#
#  — Holder（Leaf）用の鍵から公開鍵を取り出し、CSR を生成し、
#    中間CAで署名して正式な Leaf 証明書を発行するスクリプト
#
#  ※ CSR_CONFIG を使わず、-addext で直接 SAN=URI:${DID1} を指定します
# -----------------------------------------------------------------------------

# 1. Holder の識別子（例: did-abc123）をスクリプト内で定義
DID1="did-abc123"

# 2. Holder 用ディレクトリ
HOLDER_DIR="certs/holder/${DID1}"

# 3. Holder の秘密鍵が存在するか確認
if [[ ! -f "${HOLDER_DIR}/leaf.key.pem" ]]; then
  echo "❌ エラー: Holder の秘密鍵が見つかりません: ${HOLDER_DIR}/leaf.key.pem"
  exit 1
fi

# -----------------------------------------------------------------------------
# 4. Holder の EC 秘密鍵から公開鍵を抽出し、leaf.pub.pem を作成
# -----------------------------------------------------------------------------

openssl ec -in "${HOLDER_DIR}/leaf.key.pem" -pubout \
  -out "${HOLDER_DIR}/leaf.pub.pem"
echo "✅ Holder 公開鍵を出力: ${HOLDER_DIR}/leaf.pub.pem"

# -----------------------------------------------------------------------------
# 5. CSR を生成（-subj で Subject を指定し、-addext で SAN=URI:${DID1} を直接渡す）
# -----------------------------------------------------------------------------

openssl req -new -sha256 \
  -key "${HOLDER_DIR}/leaf.key.pem" \
  -subj "/C=JP/ST=Tokyo/L=Chiyoda-ku/O=MyOrg/OU=Holder/CN=Holder-01" \
  -addext "subjectAltName=URI:${DID1}" \
  -out certs/issuer/leaf/leaf.csr.pem
echo "✅ CSR を作成: certs/issuer/leaf/leaf.csr.pem"

# -----------------------------------------------------------------------------
# 6. CSR 内容を確認（任意）
# -----------------------------------------------------------------------------

echo "=== CSR 内容プレビュー ==="
openssl req -in certs/issuer/leaf/leaf.csr.pem -noout -text | sed -n '1,15p'

# -----------------------------------------------------------------------------
# 7. 中間CA で CSR に署名し、正式な Leaf 証明書を発行（有効期限 365 日）
# -----------------------------------------------------------------------------

openssl x509 -req \
  -in certs/issuer/leaf/leaf.csr.pem \
  -CA certs/issuer/intermediate/intermediate.pem \
  -CAkey certs/issuer/intermediate/intermediate.key.pem \
  -CAcreateserial \
  -days 365 \
  -sha256 \
  -out certs/issuer/leaf/leaf.pem
echo "✅ Leaf 証明書を発行: certs/issuer/leaf/leaf.pem"

# -----------------------------------------------------------------------------
# 8. 生成された Leaf 証明書の内容を簡易プレビュー
# -----------------------------------------------------------------------------

echo "=== Leaf 証明書内容プレビュー ==="
openssl x509 -in certs/issuer/leaf/leaf.pem -noout -text | sed -n '1,20p'

echo "✅ Holder の Leaf 証明書 生成 完了"
