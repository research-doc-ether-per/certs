1. セットアップ時にエラーが発生した場合は、無視していただいて問題ありません。

2. Wallet 側の Keycloak コンソールを開き、以下を確認してください。

    - `certAuth` Realm 内に `wallet-web` Client が存在していること。
    - `groupCertAuth` Realm 内に `vc-registry-api` Client が存在していること。

3. Issuer 側の Keycloak コンソールを開き、以下を確認してください。

    - `vc-issuer` Realm 内に `wallet-id-issuer-api` Client が存在していること。
    - `wallet-id-issuer-api` Client の秘密鍵を確認し、以下のファイルに設定してください。
    - `wallet-id-issuer-api` Client の Callback URL を以下のように修正してください。

        ```text
        http://10.0.2.15:7005/openid4vci/external/oauth/callback
        ```

    - `vc-issuer` Realm 内で、対象ユーザーが正常に作成されていることを確認してください。
    - 対象ユーザーが存在しない場合は、追加してください。
