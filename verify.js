##### 3.1.2. Issuer での認可コードフロー（PWD）による VC 発行（VC ステータス管理なし）

1. 認可コードフローで返却されたコードを正常に取得するためには、walt.id 側の不具合を修正し、再ビルドする必要がある
2. 「3.1. 前提条件」通りに実施したこと
3. 処理の流れ

   本処理は、認可コードフローの特性上、以下の3段階に分けて実施する。
   - 第1段階：Issuer から Credential Offer を発行し、認可用URLを出力する
     1. Issuer情報取得：発行元（Issuer）のDIDや鍵情報を取得する
        - 対象ファイル：[`./output/issuer.json`](./output/issuer.json)

     2. 発行対象情報取得：発行対象ファイルから、発行する証明書の種類や属性情報を読み込む
        - 対象ファイル：[`./config/vcConfigs.json`](./config/vcConfigs.json)
        - 発行対象：
          - `Awards_jwt_vc_json`
          - `Awards_vc+sd-jwt`
          - `Career_jwt_vc_json`
          - `Career_vc+sd-jwt`
          - `Qualifications_jwt_vc_json`

     3. 発行対象情報をループし、対象ごとに Credential Offer を発行する
        1. メタデータ確認：Issuerのクレデンシャルメタデータを取得し、発行対象をサポートしているか確認する
           - Issuer API：`GET /draft13/.well-known/openid-credential-issuer`

        2. クレデンシャルオファー発行：Issuerから Credential Offer を発行する
           - Issuer API：`POST /openid4vc/jwt/issue`
           - Issuer API：`POST /openid4vc/sdjwt/issue`

        3. オファーURL解析：発行された Offer URL を解析し、認可に必要な詳細情報を取得する

     4. 認可情報出力：取得した認可情報をファイルに出力する
        - 出力ファイル：[`./output/authorizationCodeInfo.json`](./output/authorizationCodeInfo.json)

   - 第2段階：認証後の Callback URL を手動で取得・設定する
     1. 第1段階で出力された `authorizationUrl` をブラウザで1件ずつ開き、認証を行う

     2. 認証が完了すると、認可コードを含む Callback URL にリダイレクトされる

     3. 取得した Callback URL をコピーし、[`./output/authorizationCodeInfo.json`](./output/authorizationCodeInfo.json) の対象データの `authorizationCallbackUrl` に設定する

   - 第3段階：認可コードを使用してVCを発行する
     1. 第1段階で出力し、第2段階で Callback URL を設定した [`./output/authorizationCodeInfo.json`](./output/authorizationCodeInfo.json) を読み込み、対象ごとにVC発行を行う
        1. 認可コード取得：`authorizationCallbackUrl` から認可コードを抽出する

        2. アクセストークン取得：認可コードを使用して、VC取得に必要なアクセストークンを取得する
           - Issuer API：`POST /token`

        3. PoP JWT生成：Holderの秘密鍵を使用して、所有権証明（Proof of Possession）用のJWTを生成する
           1. Holder が Wallet にログインする
              - Wallet API：`POST /wallet-api/wallet-api/login`

           2. Holder の秘密鍵を取得する
              - Wallet API：`GET /wallet-api/wallet/${walletId}/keys/${keyId}/export?format=JWK&loadPrivateKey=true`

        4. VC発行リクエスト：アクセストークンとPoP JWTを使用して、IssuerにVCの発行をリクエストする
           - Issuer API：`POST /credential`

        5. VC保存：発行されたVCをWalletに保存する
           - Wallet API：`POST /wallet-api/wallet/${walletId}/credentials/import`
           - 備考：以前はVC保存時にDBを直接操作する必要があったが、現在はWallet APIのインポートAPIを利用することで、DBを直接操作せずにVCをWalletへ保存できる

     2. 結果出力：発行されたVC情報をファイルに出力する
