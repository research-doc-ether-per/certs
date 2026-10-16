#### 4.1.2.1 各ツール実行前の事前設定

以下のツールを実行する前に、各ツール内の設定項目を確認し、必要に応じて変更してください。

| 設定項目 | 説明 |
|---|---|
| `credentialOfferData` | Credential Offer発行時に使用する設定情報。`input-datas/offer-data.json`を実行環境に合わせて変更してください。 |
| `walletInfo` | Wallet ID、Holder Key ID、Holder DIDなどの情報。`input-datas/wallet-info.json`を実行環境に合わせて変更してください。 |
| `multipleUseAllowed` | `true`：同じCredential Offerを複数のHolderで利用するテストを行います。<br>`false`：複数Holderでの利用テストを行いません。 |
| `useCredentialStatusWebhook` | Credential Status Indexの割り当てとCredential Statusの設定方法を指定します。<br><br>`true`：Webhook経由でIndexを割り当て、Credential Statusを設定します。`vc-status.conf`の`enabled`を`false`に設定してください。<br><br>`false`：walt.id側でIndexを割り当て、Credential Statusを設定します。`vc-status.conf`の`enabled`を`true`に設定してください。<br><br>設定ファイル：`docker-compose/issuer-api2/config/vc-status.conf`<br>※ 設定変更後はwalt.id Issuer API2を再起動してください。<br>※ Webhookを使用する場合は、Webhook ServerとVC Registry APIが利用可能であることを確認してください。 |
| `checkCredentialOfferExpiration` | Credential Offer URLの有効期限を確認するかどうかを指定します。<br><br>`true`：`credentialOfferData`の`expiresInSeconds`が0以上の場合、有効期限を確認します。未設定または`-1`の場合は確認をスキップします。<br><br>`false`：有効期間の設定有無にかかわらず、確認をスキップします。<br><br>※ 本設定はテストスクリプト側の確認処理のみを制御し、Issuer API2側の有効期限チェックには影響しません。 |
| `credentialMap` | 発行対象のCredential Profileとテストデータの組み合わせを`['profileId', 'testDataKey']`の形式で指定します。<br><br>例：`['awardsJwt', 'awardsJwtVerificationTrue']`<br><br>実行するテストケースに合わせて、必要な組み合わせのみ指定してください。 |
| `CLIENT_ID` | 認可コードフローで使用するClient ID。認可サーバーに登録されているClient IDを指定してください。 |
| `REDIRECT_URI` | 認可完了後のリダイレクト先URI。認可サーバーに登録されているRedirect URIと一致する値を指定してください。 |



  
 * CLIENT_ID:
 *   認可コードフローで使用するClient ID。
 *   認可サーバーに登録されているClient IDを指定してください。
 *
 * REDIRECT_URI:
 *   認可完了後のリダイレクト先URI。
 *   認可サーバーに登録されているRedirect URIと一致する値を指定してください。



// 認可コードフローで使用するClient ID
const CLIENT_ID = 'wallet-web'

// 認可完了後のリダイレクト先URI
const REDIRECT_URI = 'http://10.0.2.15:6101/individual'
