
1. ユーザ登録からDIDの破棄までの一連の処理を行う

2. 処理の流れ

   1. 認証（ログイン・登録）：Walletへのログインを行い、ユーザ未登録の場合はWalletを作成する
      - ウォレット作成API：`/wallet-api/wallet-api/register`
      - ウォレットログインAPI：`/wallet-api/wallet-api/login`
      - Email／パスワード方式および OIDC（Keycloak）方式の両方に対応

   2. ウォレット情報取得：対象ユーザが利用可能なWallet情報を取得する
      - ウォレット取得API：`/wallet-api/wallet/accounts/wallets`

   3. DID管理：Wallet上でDIDおよび鍵の作成・設定・削除を行う

      1. 鍵生成：DID作成に必要な暗号鍵（secp256r1）を生成する
         - 鍵生成API：`/wallet-api/wallet/${walletId}/keys/generate`

      2. DID作成：`did:key` と `did:jwk` の2種類のDIDを作成する
         - did:key 作成API：`/wallet-api/wallet/${walletId}/dids/create/key?keyId=${keyId}&alias=${alias}`
         - did:jwk 作成API：`/wallet-api/wallet/${walletId}/dids/create/jwk?keyId=${keyId}&alias=${alias}`

      3. デフォルトDID設定：作成したDIDをWalletの優先DIDに設定する
         - デフォルト設定API：`/wallet-api/wallet/${walletId}/dids/default?did=${did}`

      4. DID一覧取得：Walletに登録されているDID一覧を取得する
         - DID一覧取得API：`/wallet-api/wallet/${walletId}/dids`

      5. 不要なDIDおよび鍵の削除：デフォルト以外のDIDと鍵を削除する
         - DID削除API：`/wallet-api/wallet/${walletId}/dids/${did}`
         - 鍵削除API：`/wallet-api/wallet/${walletId}/keys/${keyId}
