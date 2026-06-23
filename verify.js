モバイル運転免許証（mDL）の発行に必要な Issuer の登録処理をステップ順に行う
IACA 証明書発行: mDL 用のルート証明書を発行

Document Signer（DS）証明書発行: 発行された IACA の鍵情報を用いて、データ署名用の DS 証明書を発行

Issuer 作成: 鍵タイプに secp256r1、DID メソッドに web 形式を指定した Issuer を作成
