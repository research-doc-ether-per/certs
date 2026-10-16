
/**
 * FIXME: 実行前に以下の設定を確認し、必要に応じて変更してください。
 *
 * credentialOfferData:
 *   Credential Offer発行時に使用する設定情報。
 *   offer-data.jsonの内容を実行環境に合わせて変更してください。
 *
 * walletInfo:
 *   Wallet ID、Holder Key ID、Holder DIDなどの情報。
 *   wallet-info.jsonの内容を実行環境に合わせて変更してください。
 *
 * multipleUseAllowed:
 *   同じCredential Offerを複数のHolderで利用するかどうかを指定します。
 *
 * useCredentialStatusWebhook:
 *   Credential Status Indexの割り当てとCredential Statusの設定方法を指定します。
 *
 *   true:
 *     Webhook経由でIndexを割り当て、Credential Statusを設定します。
 *     vc-status.confのenabledをfalseに設定し、
 *     walt.id Issuer API2を再起動してください。
 *
 *   false:
 *     walt.id側でIndexを割り当て、Credential Statusを設定します。
 *     vc-status.confのenabledをtrueに設定し、
 *     walt.id Issuer API2を再起動してください。
 *
 * checkCredentialOfferExpiration:
 *   Credential Offer URLの有効期限を確認するかどうかを指定します。
 *
 *   true:
 *     credentialOfferDataに有効期間が設定されている場合、
 *     Credential Offer URLの有効期限を確認します。
 *     有効期間が設定されていない場合は確認をスキップします。
 *
 *   false:
 *     有効期間の設定有無にかかわらず、確認をスキップします。
 *
 * credentialMap:
 *   発行対象のCredential Profileとテストデータの組み合わせ。
 *   実行するテストケースに合わせて変更してください。
 *
 * 詳細はREADME.mdの「4.1.2.1 事前設定」を参照してください。
 */

// Credential Offer発行時の設定情報
const credentialOfferData = require('../input-datas/offer-data.json')

// Wallet情報
const walletInfo = require('../input-datas/wallet-info.json')

// 同じCredential Offerを複数Holderで利用するかどうか
const multipleUseAllowed = false

// Webhook経由でCredential Statusを設定するかどうか
const useCredentialStatusWebhook = true

// Credential Offer URLの有効期限を確認するかどうか
const checkCredentialOfferExpiration = true

// 発行対象のCredential Profileとテストデータの組み合わせ
const credentialMap = [
  // ['awardsJwt', 'awardsJwtVerificationTrue'],
  // ['awardsJwt', 'awardsJwtVerificationFalse'],
  // ['awardsSdJwt', 'awardsSdJwtVerificationTrue'],
  // ['awardsSdJwt', 'awardsSdJwtVerificationFalse'],
  // ['careerJwt', 'careerJwtVerificationTrue'],
  // ['careerJwt', 'careerJwtVerificationFalse'],
  // ['careerSdJwt', 'careerSdJwtVerificationTrue'],
  // ['careerSdJwt', 'careerSdJwtVerificationFalse'],
  // ['qualificationsJwt', 'qualificationsJwtVerificationTrue'],
  ['qualificationsJwt', 'qualificationsJwtVerificationFalse'],
]





#### 4.1.2.1 事前設定

実行前に、`openid4vci-pre-authorized-step-by-step-credential-issue.js` の
以下の設定を確認し、必要に応じて変更してください。

| 設定項目 | 説明 |
|---|---|
| `credentialOfferData` | Credential Offer発行時に使用する設定情報。`offer-data.json`を実行環境に合わせて変更してください。 |
| `walletInfo` | Wallet ID、Holder Key ID、Holder DIDなどの情報。`wallet-info.json`を実行環境に合わせて変更してください。 |
| `multipleUseAllowed` | 同じCredential Offerを複数のHolderで利用するかどうかを指定します。 |
| `useCredentialStatusWebhook` | Webhook経由でCredential Status Indexを割り当て、Credential Statusを設定するかどうかを指定します。 |
| `checkCredentialOfferExpiration` | Credential Offer URLの有効期限を確認するかどうかを指定します。 |
| `credentialMap` | 発行対象のCredential Profileとテストデータの組み合わせを指定します。 |

##### useCredentialStatusWebhook

Credential Status Indexの割り当てとCredential Statusの設定方法を指定します。

| 設定値 | 処理方法 | vc-status.confのenabled |
|---|---|---|
| `true` | Webhook経由でIndexを割り当て、Credential Statusを設定します。 | `false` |
| `false` | walt.id側でIndexを割り当て、Credential Statusを設定します。 | `true` |

設定ファイル：

`docker-compose/issuer-api2/config/vc-status.conf`

設定を変更した場合は、walt.id Issuer API2を再起動してください。

※ `useCredentialStatusWebhook`を変更しても、
`vc-status.conf`は自動的に更新されません。

※ Webhookを使用する場合は、
Custom Data Functions Webhook ServerとVC Registry APIが
利用可能であることを確認してください。

##### checkCredentialOfferExpiration

Credential Offer URLの有効期限を確認するかどうかを指定します。

| 設定値 | 有効期間の設定 | 処理 |
|---|---|---|
| `true` | あり | Credential Offer URLの有効期限を確認します。 |
| `true` | なし | 有効期限の確認をスキップします。 |
| `false` | あり | 有効期限の確認をスキップします。 |
| `false` | なし | 有効期限の確認をスキップします。 |

有効期間は`credentialOfferData`の`expiresInSeconds`で指定します。

※ 本設定はテストスクリプト側の有効期限確認を制御するものです。
Issuer API2側の有効期限チェックには影響しません。

##### credentialMap

発行対象のCredential Profileとテストデータの組み合わせを指定します。

各要素は以下の形式で設定します。

`['profileId', 'testDataKey']`

例：

```javascript
const credentialMap = [
  ['awardsJwt', 'awardsJwtVerificationTrue'],
  ['careerJwt', 'careerJwtVerificationTrue'],
  ['qualificationsJwt', 'qualificationsJwtVerificationTrue'],
]
```

必要なテストケースのみ有効にしてください。


