### ログイン認証テスト

データ移行後、`src/login-auth-test.js` でメール・パスワード認証または OIDC 認証を確認します。テスト対象は、移行済みアカウントの認証、`account_id` の取得、関連 Wallet・DID・Key ID の参照です。



#### 2. テストを実行

```bash
cd ~/workspace/cloudcredentialservice/samples/v1.0.0_migration_DB
npm run auth:test
```
`package.json` に以下のスクリプトを追加してください。

```json
"auth:test": "node src/login-auth-test.js"
```




#### 3. 結果を確認

以下の情報が取得できることを確認する。

- `accountId`
- `walletId`
- `defaultDid`
- `defaultKeyId`
- `permissions`
- `dids`
- `keyIds`


