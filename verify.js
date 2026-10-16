#### 4.1.2.1 各ツール実行前の事前設定

以下のツールを実行する前に、各ツール内の設定項目を確認し、必要に応じて変更してください。

以下のツールを実行する前に、各ツール内の設定項目を確認し、必要に応じて変更してください。

| 設定項目 | 説明 |
|---|---|
| `presentationData` | Presentation Request作成時に使用する設定情報。`input-datas/presentation-data.json`を実行環境に合わせて変更してください。 |
| `walletInfo` | Wallet ID、Holder Key ID、Holder DIDなどの情報。`input-datas/wallet-info.json`を実行環境に合わせて変更してください。 |
| `multipleUseAllowed` | `true`：同じPresentation Request URLを複数のHolderで利用するテストを行います。<br>`false`：複数Holderでの利用テストを行いません。 |
| `checkPresentationRequestUrlExpirationByDuration` | 有効期間に基づくPresentation Request URLの有効期限確認を制御します。<br><br>`true`：`presentationData`に有効期間が設定されている場合、有効期限を確認します。<br>`false`：有効期限の確認をスキップします。 |
| `checkPresentationRequestUrlExpirationByDate` | 有効期限日時に基づくPresentation Request URLの有効期限確認を制御します。<br><br>`true`：`presentationData`に有効期限日時が設定されている場合、有効期限を確認します。<br>`false`：有効期限の確認をスキップします。 |
| `individualTargets` | 単一Credentialの検証対象を指定します。`type`：Credential Type、`format`：Credential Format、`result`：期待する検証結果（`true`／`false`）。必要に応じて`exp_duration`や`exp_date`などのテスト条件を指定してください。 |
| `combinationTargets` | 複数Credentialを組み合わせた検証対象を指定します。`credentials`に検証対象のCredential Type、Format、期待結果を指定し、`options`に検証対象の組み合わせ条件を指定してください。 |
/**
 * FIXME: 実行前に以下の設定を確認し、必要に応じて変更してください。
 *
 * presentationData:
 *   Presentation Request作成時に使用する設定情報。
 *   presentation-data.jsonを実行環境に合わせて変更してください。
 *
 * walletInfo:
 *   Wallet ID、Holder Key ID、Holder DIDなどの情報。
 *   wallet-info.jsonを実行環境に合わせて変更してください。
 *
 * multipleUseAllowed:
 *   同じPresentation Request URLを複数のHolderで利用するかどうかを指定します。
 *
 * checkPresentationRequestUrlExpirationByDuration:
 *   有効期間に基づいてPresentation Request URLの有効期限を
 *   確認するかどうかを指定します。
 *
 *   true:
 *     presentationDataに有効期間が設定されている場合、
 *     有効期限を確認します。
 *   false:
 *     有効期限の確認をスキップします。
 *
 * checkPresentationRequestUrlExpirationByDate:
 *   有効期限日時に基づいてPresentation Request URLの有効期限を
 *   確認するかどうかを指定します。
 *
 *   true:
 *     presentationDataに有効期限日時が設定されている場合、
 *     有効期限を確認します。
 *   false:
 *     有効期限の確認をスキップします。
 *
 * individualTargets:
 *   単一Credentialの検証対象を指定します。
 *   Credential Type、Format、期待する検証結果などを設定してください。
 *
 * combinationTargets:
 *   複数Credentialを組み合わせた検証対象を指定します。
 *   credentialsに検証対象を、optionsに組み合わせ条件を設定してください。
 */


