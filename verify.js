
1. 前提条件通りに実施したこと

2. 処理の流れ

   1. Issuer情報取得：発行元（Issuer）のDIDやエンドポイント情報を取得する
      - 対象ファイル：[`./output/issuer.json`](./output/issuer.json)

   2. Holder情報取得：証明書を受け取る側（Holder）のDIDおよび鍵情報を取得する
      - 対象ファイル：[`./output/holder.json`](./output/holder.json)

   3. 発行対象情報取得：発行対象ファイルから、発行する証明書の種類や属性情報を読み込む
      - 対象ファイル：[`./config/vcConfigs.json`](./config/vcConfigs.json)
      - 発行対象：
        - `Awards_jwt_vc_json`
        - `Awards_vc+sd-jwt`
        - `Career_jwt_vc_json`
        - `Career_vc+sd-jwt`
        - `Qualifications_jwt_vc_json`

   4. IssuerによるVC発行実行：Issuerを使用して、対象ごとにVC発行を行う

      1. メタデータ確認：Issuerのクレデンシャルメタデータを取得し、発行対象をサポートしているか確認する
         - Issuer API：`/draft13/.well-known/openid-credential-issuer`

      2. クレデンシャルオファー発行：Issuerから Credential Offer を発行する
         - Issuer API：`/openid4vc/jwt/issue`
         - Issuer API：`/openid4vc/sdjwt/issue`

      3. オファーURL解析：発行されたURLを解析し、事前認可コードなどの詳細情報を取得する

      4. アクセストークン取得：事前認可コードを検証し、VC取得に必要なアクセストークンを取得する
         - Issuer API：`/token`

      5. PoP JWT生成：Holderの秘密鍵を使用して、所有権証明（Proof of Possession）用のJWTを生成する

      6. VC発行リクエスト：アクセストークンとPoP JWTを使用して、IssuerにVCの発行をリクエストする
         - Issuer API：`/credential`

      7. VC保存：発行されたVCをWalletに保存する
         - Wallet API：`/wallet-api/wallet/${walletId}/credentials`
         - 備考：以前はVC保存時にDBを直接操作していたが、現在はWallet APIのインポートAPIを利用することで、DBを直接操作せずにVCをWalletへ保存できる

      8. 結果出力：発行されたVC情報をファイルに出力する
