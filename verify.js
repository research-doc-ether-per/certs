# secp256r1（P-256）のJWK秘密鍵を生成
./waltid-applications/waltid-cli/build/install/waltid-jvm/bin/waltid \
  key generate \
  -t secp256r1 \
  -o issuer.jwk

# 生成したキーを使用して did:web を作成
./waltid-applications/waltid-cli/build/install/waltid-jvm/bin/waltid \
  did create \
  -m web \
  -k issuer.jwk \
  --domain 10.0.2.15:5101 \
  --path issuer03 \
  -o ~/workspace/cloudcredentialservice/samples/v1.0.0/output/issuerDids/issuer03/did.json
