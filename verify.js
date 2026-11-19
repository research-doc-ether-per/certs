# Credential Offer 取得

## 概要

指定されたユーザまたは組織 Wallet に対して、発行可能証明書情報および Credential Offer 情報を取得する。

リクエストに Credential Offer URL が指定されている場合、指定された Credential Offer の有効性を確認する。

Credential Offer URL が指定されていない場合、発行可能証明書 ID をもとに Issuer API を呼び出し、Credential Offer URL を発行する。

取得した Credential Offer URL を使用して walt.id Wallet API で Credential Offer を解析する。

認可方式が認可コードフローの場合、認可 URL を生成し、認可に必要な情報をレスポンスに設定する。

—————————————————

## リクエストパラメータ

| プロパティ | 説明 | 型 | 必須 |
|---|---|---|---|
| `credentialOfferUrl` | Credential Offer URL。`docId` といずれか一方を指定する。両方指定された場合、本項目を優先する。 | string | △ |
| `docId` | 発行可能証明書 ID。`credentialOfferUrl` といずれか一方を指定する。 | integer | △ |

—————————————————

## 成功レスポンス

HTTPステータスコード：`200`

| プロパティ | 説明 | 型 | 必須 |
|---|---|---|---|
| `credentialOfferUrl` | Credential Offer URL。 | string | ○ |
| `certName` | 証明書の表示名称。 | string | ○ |
| `type` | 証明書種別。 | string | ○ |
| `issuerDid` | 証明書を発行する Issuer の DID。 | string | ○ |
| `authType` | 認可方式。`PRE_AUTHORIZED` または `AUTHORIZED` が指定される。 | string | ○ |
| `authorizationResult` | 認可コードフローに必要な認可情報。認可方式が `AUTHORIZED` の場合に指定される。 | object | △ |
| `authorizationResult.authorizationUrl` | 認可処理を実施するための Authorization URL。 | string | ○ |
| `authorizationResult.state` | 認可リクエストとコールバックを紐付けるための state 値。 | string | ○ |
| `authorizationResult.codeVerifier` | PKCE で使用する code verifier。 | string | ○ |
| `authorizationResult.credentialConfigurationId` | 発行対象となる Credential Configuration ID。 | string | ○ |
| `authorizationResult.credentialIssuerBaseUrl` | Credential Issuer のベース URL。 | string | ○ |
| `authorizationResult.nonceEndpoint` | Nonce を取得するためのエンドポイント URL。 | string | ○ |
| `authorizationResult.credentialEndpoint` | Credential を取得するためのエンドポイント URL。 | string | ○ |
| `orgWalletDidInfo` | 組織 Wallet のデフォルト DID 情報。組織ユーザの場合に指定される。 | object | △ |
| `orgWalletDidInfo.did` | 組織 Wallet のデフォルト DID。 | string | ○ |
| `orgWalletDidInfo.alias` | DID の表示名。設定されていない場合は `null`。 | string / null |  |
| `orgWalletDidInfo.default` | デフォルト DID フラグ。`true` が指定される。 | boolean | ○ |

—————————————————

## 処理内容

OID4VCI系API認証処理を実施する。

組織ユーザの場合、組織権限の認証を実施する。

—————————————————

リクエストパラメータから以下の情報を取得する。

- `credentialOfferUrl`：Credential Offer URL
- `docId`：発行可能証明書 ID

—————————————————

アクセストークンの Realm に応じて、リクエストユーザ情報を取得する。

取得したユーザIDをキーに個人ウォレットテーブルを検索し、Wallet 情報を取得する。

Wallet が存在しない場合、エラーを返却する。

取得した Wallet 情報から walt.id Wallet ID を取得する。

—————————————————

【組織ユーザの場合】

組織 Wallet のデフォルト DID を取得する。

■エンドポイント

GET /wallet/{walletId}

■パスパラメータ

- `walletId`：walt.id Wallet ID

取得した Wallet 情報からデフォルト DID を取得する。

DID 別名テーブルを以下の条件で検索する。

■検索条件

- `waltid_wallet_id`：取得した Wallet ID
- `did`：取得したデフォルト DID

取得した情報から以下を設定する。

- `alias`：DID 別名。存在しない場合は `null`
- `did`：デフォルト DID
- `default`：`true`

—————————————————

Credential Offer および Issuer 情報を取得する。

【個人ユーザの場合】

追加可能証明書テーブル、Issuer 情報テーブル、追加可能証明書対象者情報テーブルを結合して検索する。

■結合条件

- 追加可能証明書テーブル.`group_id` ＝ Issuer 情報テーブル.`group_id`
- 追加可能証明書テーブル.`doc_id` ＝ 追加可能証明書対象者情報テーブル.`doc_id`
- 追加可能証明書テーブル.`group_id` ＝ 追加可能証明書対象者情報テーブル.`group_id`

■検索条件

- ユーザID：取得したユーザ名と一致
- `credentialOfferUrl` が指定されている場合：Credential Offer URL と一致
- それ以外の場合：発行可能証明書 ID が `docId` と一致

【組織ユーザの場合】

組織追加可能証明書テーブル、Issuer 情報テーブル、組織追加可能証明書対象者情報テーブルを結合して検索する。

■結合条件

- 組織追加可能証明書テーブル.`group_id` ＝ Issuer 情報テーブル.`group_id`
- 組織追加可能証明書テーブル.`doc_id` ＝ 組織追加可能証明書対象者情報テーブル.`doc_id`
- 組織追加可能証明書テーブル.`group_id` ＝ 組織追加可能証明書対象者情報テーブル.`group_id`

■検索条件

- 組織 Wallet DID：取得したデフォルト DID と一致
- `credentialOfferUrl` が指定されている場合：Credential Offer URL と一致
- それ以外の場合：発行可能証明書 ID が `docId` と一致

検索結果が存在しない場合、`ResourceNotFoundError` を返却する。

取得した情報から以下を取得する。

- 証明書種別
- 認可方式
- 証明書表示名
- 発行可能証明書 ID
- Issuer DID
- Issuer グループ ID
- Credential Offer URL
- Credential Offer ID
- Credential Offer 有効期限

—————————————————

【Credential Offer URL が存在しない場合】

Issuer API を呼び出し、Credential Offer URL を発行する。

【個人ユーザの場合】

■エンドポイント

POST /issuer/group/{groupId}/credential/offers/credential

■パスパラメータ

- `groupId`：Issuer グループ ID

■リクエストボディ

- `docId`：発行可能証明書 ID
- `userName`：取得したユーザ名

【組織ユーザの場合】

■エンドポイント

POST /issuer/group/{groupId}/credential/org/offers/credential

■パスパラメータ

- `groupId`：Issuer グループ ID

■リクエストボディ

- `docId`：発行可能証明書 ID
- `walletDid`：組織 Wallet のデフォルト DID

レスポンスステータスが `201` 以外の場合、`InternalServerError` を返却する。

正常終了の場合、レスポンスの `url` を Credential Offer URL として取得する。

—————————————————

【リクエストパラメータに `credentialOfferUrl` が指定されている場合】

Credential Offer の有効性を確認する。

Credential Offer URL の `credential_offer_uri` パラメータから Issuer サーバ URL を取得する。

Credential Offer ID および Credential Offer 有効期限を使用して有効性確認処理を実施する。

Credential Offer 有効期限が設定されている場合、数値に変換して確認する。

有効期限が有効な整数でない場合、`InternalServerError` を返却する。

現在日時が Credential Offer 有効期限以上の場合、`CredentialOfferUrlExpiredError` を返却する。

—————————————————

Credential Offer ID に対応する Issuance Session を取得する。

■エンドポイント

GET /issuer2/sessions/{offerId}

■パスパラメータ

- `offerId`：Credential Offer ID

取得した Issuance Session の `status` を確認する。

- `ACTIVE`：後続処理を実施する。
- `EXPIRED`：`CredentialOfferUrlExpiredError` を返却する。
- `SUCCESSFUL`：証明書発行済みのため、`InternalServerError` を返却する。
- `UNSUCCESSFUL`：証明書発行失敗のため、`InternalServerError` を返却する。
- `REJECTED_BY_USER`：ユーザにより証明書発行が拒否されたため、`InternalServerError` を返却する。
- 上記以外：不明な Issuance Session 状態として、`InternalServerError` を返却する。

—————————————————

walt.id Wallet API を呼び出し、Credential Offer を解析する。

■エンドポイント

POST /wallet/{walletId}/exchange/resolveCredentialOffer

■パスパラメータ

- `walletId`：walt.id Wallet ID

■リクエストボディ

- `offerUrl`：Credential Offer URL

Credential Offer 解析結果から、後続処理に必要な情報を取得する。

—————————————————

【認可方式が `AUTHORIZATION_CODE` の場合】

認可コードフロー用設定を設定ファイルから取得する。

■取得情報

- `clientId`：設定ファイルに定義された Client ID
- `redirectUri`：設定ファイルに定義された Redirect URI

walt.id Wallet API を呼び出し、認可 URL を生成する。

■エンドポイント

POST /wallet/{walletId}/exchange/authorization-url

■パスパラメータ

- `walletId`：walt.id Wallet ID

■リクエストボディ

- `offerUrl`：Credential Offer URL
- `clientId`：設定ファイルから取得した Client ID
- `redirectUri`：設定ファイルから取得した Redirect URI
- `usePkce`：`true`
- `useScope`：`false`

認可 URL 生成結果を取得する。

—————————————————

レスポンス情報を整理し、返却する。

以下の情報を設定する。

- `credentialOfferUrl`：Credential Offer URL
- `certName`：証明書表示名
- `type`：証明書種別
- `issuerDid`：Issuer DID
- `authType`：認可方式

【組織ユーザの場合】

以下の組織 Wallet のデフォルト DID 情報を `orgWalletDidInfo` に設定する。

- `did`：デフォルト DID
- `alias`：DID 別名
- `default`：`true`

【認可方式が `AUTHORIZATION_CODE` の場合】

認可 URL 生成結果を `authorizationResult` に設定する。

以下の情報を設定する。

- `authorizationUrl`
- `state`
- `codeVerifier`
- `credentialConfigurationId`
- `credentialIssuerBaseUrl`
- `nonceEndpoint`
- `credentialEndpoint`

`credentialEndpoint` には、Credential Offer 解析結果から取得した Credential Endpoint を設定する。

整理したレスポンス情報を返却する。

処理中にエラーが発生した場合、サービス共通のエラーハンドリング処理を実施する。
