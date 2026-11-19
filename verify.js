# 証明書発行依頼

## API情報

API名：証明書発行依頼

API ID：cwa0037

URL：

`/vc/wallets/{ユーザID または 組織ウォレットID}/oid4vci/credential`

メソッド：

POST

ヘッダ：

- Content-Type: application/json
- Authorization: Bearer {AccessToken}

## 概要

指定されたユーザまたは組織 Wallet に対して、Credential Offer 情報を使用して Issuer へ証明書発行を要求する。

認可方式に応じて、事前認可コードフローまたは認可コードフローで証明書を取得し、取得した証明書を walt.id Wallet および Cloud Wallet DB に保存する。

処理中にエラーが発生した場合、必要に応じて walt.id Wallet に保存された証明書を削除する。

## リクエストボディ

| プロパティ | 説明 | 型 | 必須 |
|---|---|---|---|
| `certName` | 証明書の表示名称。 | string | ○ |
| `docId` | 発行可能証明書 ID。 | integer | ○ |
| `holderDid` | 証明書を取得する Holder DID。 | string | ○ |
| `credentialOfferUrl` | 証明書発行に使用する Credential Offer URL。 | string | ○ |
| `authType` | 認可方式。`PRE_AUTHORIZED` または `AUTHORIZED` を指定する。 | string | ○ |
| `authorization` | 認可コードフローで使用する認可情報。`authType` が `AUTHORIZED` の場合に必須。 | object | △ |
| `authorization.authorizationCode` | 認可処理後に取得した Authorization Code。 | string | ○ |
| `authorization.credentialEndpoint` | Credential Endpoint URL。 | string | ○ |
| `authorization.nonceEndpoint` | Nonce Endpoint URL。 | string | ○ |
| `authorization.codeVerifier` | PKCE で使用する Code Verifier。 | string | ○ |
| `authorization.credentialConfigurationId` | 発行対象となる Credential Configuration ID。 | string | ○ |
| `authorization.credentialIssuerBaseUrl` | Credential Issuer のベース URL。 | string | ○ |

※ `authorization` 配下の項目は、`authType` が `AUTHORIZED` の場合に必須とする。

## 成功レスポンス

HTTPステータスコード：`200`

| プロパティ | 説明 | 型 | 必須 |
|---|---|---|---|
| `rsId` | リソース ID。発行した証明書を Cloud Wallet 上で識別する UUID。 | string | ○ |

## 処理内容

OID4VCI系API認証処理を実施する。

組織ユーザの場合、組織権限の認証を実施する。

—————————————————

リクエストパラメータから以下の情報を取得する。

- `certName`：証明書表示名
- `docId`：発行可能証明書 ID
- `holderDid`：Holder DID
- `credentialOfferUrl`：Credential Offer URL
- `authType`：認可方式
- `authorization`：認可情報

—————————————————

アクセストークンの Realm に応じて、リクエストユーザ情報を取得する。

■取得情報

- ユーザID
- ユーザ名

個人ユーザの場合、リクエストパラメータに指定されたユーザIDを使用する。

組織ユーザの場合、アクセストークン情報およびリクエストパラメータに指定された組織 Wallet ID を使用してユーザ情報を取得する。

—————————————————

取得したユーザIDをキーに個人ウォレットテーブルを検索し、Wallet 情報を取得する。

Wallet が存在しない場合、`WalletNotFoundError` を返却する。

取得した Wallet 情報から walt.id Wallet ID を取得する。

—————————————————

認可方式に応じて証明書を取得する。

【`authType` が `PRE_AUTHORIZED` の場合】

walt.id Wallet API を呼び出し、事前認可コードフローで証明書を取得する。

■エンドポイント

POST /wallet/{walletId}/credentials/receive

■パスパラメータ

- `walletId`：walt.id Wallet ID

■リクエスト情報

- Credential Offer URL：リクエストの `credentialOfferUrl`
- Holder DID：リクエストの `holderDid`

証明書取得結果から、Wallet2 内部の証明書 ID を取得する。

—————————————————

【`authType` が `AUTHORIZED` の場合】

認可コードフロー用設定を設定ファイルから取得する。

■取得情報

- `clientId`：Client ID
- `redirectUri`：Redirect URI

認可情報および設定情報から証明書取得用リクエスト情報を生成する。

■設定情報

- `code`：`authorization.authorizationCode`
- `credentialIssuer`：`authorization.credentialIssuerBaseUrl`
- `credentialEndpoint`：`authorization.credentialEndpoint`
- `credentialConfigurationId`：`authorization.credentialConfigurationId`
- `clientId`：設定ファイルから取得した Client ID
- `redirectUri`：設定ファイルから取得した Redirect URI
- `codeVerifier`：`authorization.codeVerifier`
- `nonceEndpoint`：`authorization.nonceEndpoint`
- `useDPoP`：`false`
- `did`：リクエストの `holderDid`

walt.id Wallet API を呼び出し、認可コードフローで証明書を取得する。

■エンドポイント

POST /wallet/{walletId}/credentials/receive/authorized

■パスパラメータ

- `walletId`：walt.id Wallet ID

証明書取得結果から、Wallet2 内部の証明書 ID を取得する。

—————————————————

取得した Wallet2 内部の証明書 ID を使用して、walt.id Wallet から証明書情報を取得する。

■エンドポイント

GET /wallet/{walletId}/credentials/{waltidCredentialId}

■パスパラメータ

- `walletId`：walt.id Wallet ID
- `waltidCredentialId`：証明書取得処理で返却された Wallet2 内部の証明書 ID

取得した証明書情報から `credentialData` を取得する。

`credentialData.vc` が存在する場合は `credentialData.vc` を VC Payload として使用する。

存在しない場合は `credentialData` を VC Payload として使用する。

—————————————————

VC Payload から以下の情報を取得する。

- `credentialSubject`：証明書主体情報
- `issuanceDate`：証明書発行日時
- `expirationDate`：証明書有効期限
- `issuer`：Issuer DID
- `subject`：`credentialSubject.id`

—————————————————

Cloud Wallet 上で証明書を識別するリソース ID を UUID で生成する。

—————————————————

`credentialSubject` を JSON 文字列化し、SHA-256 ハッシュ値を算出する。

算出したハッシュ値は、Cloud Wallet DB へ保存する証明書の重複判定および検証用情報として使用する。

—————————————————

VC Payload の `credentialStatus` から Status List 情報を取得する。

■取得情報

- Status List 情報
- Status List Credential URL
- Status List URL
- 証明書種別

`credentialStatus` の先頭要素を対象とする。

—————————————————

Issuer DID をキーに Issuer 情報テーブルを検索し、Issuer グループ ID を取得する。

■検索条件

- `did`：VC Payload から取得した Issuer DID

Issuer グループ ID が取得できない場合、`ResourceNotFoundError` を返却する。

—————————————————

DB トランザクションを開始する。

VCウォレットテーブルに取得した証明書情報を登録する。

■登録情報

- `rs_id`：生成したリソース ID
- `owner_id`：取得したユーザID
- `owner_name`：取得したユーザ名。存在しない場合は `null`
- `cert_name`：リクエストから取得した証明書表示名
- `cert_explanation`：`null`
- `doc_id`：リクエストから取得した発行可能証明書 ID
- `issuance_date`：VC Payload の発行日時
- `expiration_date`：VC Payload の有効期限
- `issuer`：VC Payload の Issuer DID
- `subject`：VC Payload の `credentialSubject.id`
- `waltid_credential_id`：Wallet2 内部の証明書 ID
- `hash`：`credentialSubject` の SHA-256 ハッシュ値

—————————————————

Status List テーブルに同一 Status List 情報が存在するか確認する。

■検索条件

- `group_id`：Issuer グループ ID
- `type`：Status List 情報から取得した証明書種別
- `status_list_credential_url`：Status List URL

対象情報が存在しない場合、Status List テーブルに登録する。

■登録情報

- `group_id`：Issuer グループ ID
- `type`：証明書種別
- `status_list_credential_url`：Status List URL

—————————————————

Status List 対象者テーブルに証明書情報を登録する。

■登録情報

- `group_id`：Issuer グループ ID
- `type`：証明書種別
- `status_list_credential_url`：Status List URL
- `index`：`credentialStatus.statusListIndex`
- `vc_id`：Wallet2 内部の証明書 ID
- `vc_name`：証明書表示名
- `user_id`：取得したユーザ名。存在しない場合は `null`

—————————————————

DB トランザクションをコミットする。

レスポンス情報を整理し、返却する。

■レスポンス情報

- `rsId`：生成したリソース ID

—————————————————

処理中にエラーが発生した場合、DB トランザクションをロールバックする。

walt.id Wallet に証明書が保存済みの場合、当該証明書を削除する。

■エンドポイント

DELETE /wallet/{walletId}/credentials/{waltidCredentialId}

■パスパラメータ

- `walletId`：walt.id Wallet ID
- `waltidCredentialId`：Wallet2 内部の証明書 ID

証明書削除処理でエラーが発生した場合はエラーログを出力し、元のエラーを優先して処理する。

サービス共通のエラーハンドリング処理を実施し、エラーを返却する。
