# 追加可能証明書一覧取得

## API情報

API名：追加可能証明書一覧取得

API ID：cwa0035

URL：

`/vc/wallets/{ユーザID または 組織ウォレットID}/oid4vci/offers`

メソッド：

GET

ヘッダ：

- Content-Type: application/json
- Authorization: Bearer {AccessToken}

## 概要

指定されたユーザまたは組織 Wallet について、Issuer から取得可能な Credential Offer または発行可能な証明書情報の一覧を取得する。

Credential Offer URL が未発行の証明書、および Credential Offer の有効期限内である証明書を取得対象とする。

一覧は作成日時の降順で返却する。

## リクエストパラメータ

なし

## 成功レスポンス

HTTPステータスコード：`200`

| プロパティ | 説明 | 型 | 必須 |
|---|---|---|---|
| `list` | 追加可能証明書一覧。 | Array<object> | ○ |
| `list[].docId` | 追加可能証明書 ID。 | integer | ○ |
| `list[].category` | 証明書カテゴリ。 | string | ○ |
| `list[].vcInfo` | 証明書情報。発行可能な証明書情報が JSON 文字列として指定される。 | string | ○ |
| `list[].credentialOfferUrl` | Credential Offer URL。未発行の場合は `null`。 | string / null |  |
| `list[].credentialOfferEndpoint` | Credential Offer Endpoint URL。設定されていない場合は `null`。 | string / null |  |
| `list[].credentialOfferId` | Credential Offer ID。Credential Offer 未発行の場合は `null`。 | string / null |  |
| `list[].credentialOfferExpiresAt` | Credential Offer の有効期限。Unix time（ミリ秒）で指定される。有効期限が設定されていない場合は `null`。 | integer / null |  |
| `list[].issuer` | 発行者 DID。 | string | ○ |
| `list[].type` | 証明書種別。 | string | ○ |
| `list[].format` | 証明書フォーマット種別。 | string | ○ |
| `list[].authType` | 認可方式。 | string | ○ |
| `list[].certName` | 証明書の表示名称。 | string | ○ |
| `list[].imageUrl` | 証明書画像 URL。現在未使用のため常に `null`。 | string / null |  |
| `list[].name` | 発行者名。現在未使用のため常に `null`。 | string / null |  |
| `list[].userId` | Credential Offer または証明書の取得対象となるユーザ ID。個人ユーザの場合に指定される。 | string | △ |
| `list[].orgWalletDid` | Credential Offer または証明書の取得対象となる組織 Wallet DID。組織ユーザの場合に指定される。 | string | △ |
| `list[].updateDate` | 更新日時。Unix time で指定される。 | integer | ○ |
| `list[].createDate` | 作成日時。Unix time で指定される。 | integer | ○ |

## 処理内容

OID4VCI系API認証処理を実施する。

組織ユーザの場合、組織権限の認証を実施する。

—————————————————

アクセストークンの Realm に応じて、リクエスト用ユーザ情報を取得する。

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

【個人ユーザの場合】

追加可能証明書テーブル、Issuer 情報テーブル、追加可能証明書対象者情報テーブルを結合し、追加可能証明書一覧を取得する。

■結合条件

- 追加可能証明書テーブル.`group_id` ＝ Issuer 情報テーブル.`group_id`
- 追加可能証明書テーブル.`doc_id` ＝ 追加可能証明書対象者情報テーブル.`doc_id`
- 追加可能証明書テーブル.`group_id` ＝ 追加可能証明書対象者情報テーブル.`group_id`

■検索条件

- 追加可能証明書対象者情報テーブル.`user_id` ＝ 取得したユーザ名
- 以下のいずれかの条件を満たすこと
  - Credential Offer URL が設定されていない
  - Credential Offer 有効期限が設定されていない
  - Credential Offer 有効期限が現在日時より後である

Credential Offer 有効期限の比較には、現在日時を Unix time（ミリ秒）に変換した値を使用する。

判定条件：

`credential_offer_expires_at > (EXTRACT(EPOCH FROM NOW()) * 1000)`

■取得情報

- 追加可能証明書 ID
- 証明書カテゴリ
- 証明書情報
- Credential Offer URL
- Credential Offer Endpoint URL
- Credential Offer ID
- Credential Offer 有効期限
- 発行者 DID
- 証明書種別
- 証明書フォーマット
- 認可方式
- 証明書表示名
- 作成日時
- 更新日時
- ユーザ ID

■ソート条件

- 作成日時の降順

—————————————————

【組織ユーザの場合】

組織 Wallet のデフォルト DID を取得する。

■エンドポイント

GET /wallet/{walletId}

■パスパラメータ

- `walletId`：walt.id Wallet ID

取得した Wallet 情報からデフォルト DID を取得する。

—————————————————

組織追加可能証明書テーブル、Issuer 情報テーブル、組織追加可能証明書対象者情報テーブルを結合し、追加可能証明書一覧を取得する。

■結合条件

- 組織追加可能証明書テーブル.`group_id` ＝ Issuer 情報テーブル.`group_id`
- 組織追加可能証明書テーブル.`doc_id` ＝ 組織追加可能証明書対象者情報テーブル.`doc_id`
- 組織追加可能証明書テーブル.`group_id` ＝ 組織追加可能証明書対象者情報テーブル.`group_id`

■検索条件

- 組織追加可能証明書対象者情報テーブル.`org_wallet_did` ＝ 組織 Wallet のデフォルト DID
- 以下のいずれかの条件を満たすこと
  - Credential Offer URL が設定されていない
  - Credential Offer 有効期限が設定されていない
  - Credential Offer 有効期限が現在日時より後である

Credential Offer 有効期限の比較には、現在日時を Unix time（ミリ秒）に変換した値を使用する。

判定条件：

`credential_offer_expires_at > (EXTRACT(EPOCH FROM NOW()) * 1000)`

■取得情報

- 追加可能証明書 ID
- 証明書カテゴリ
- 証明書情報
- Credential Offer URL
- Credential Offer Endpoint URL
- Credential Offer ID
- Credential Offer 有効期限
- 発行者 DID
- 証明書種別
- 証明書フォーマット
- 認可方式
- 証明書表示名
- 作成日時
- 更新日時
- 組織 Wallet DID

■ソート条件

- 作成日時の降順

—————————————————

取得した各レコードについて、レスポンス情報を整理する。

以下の項目を設定する。

- `imageUrl`：`null`
- `name`：`null`
- `updateDate`：更新日時を Unix time に変換した値
- `createDate`：作成日時を Unix time に変換した値

その他の取得項目は、取得した値をそのまま設定する。

—————————————————

取得した一覧を `list` に設定し、レスポンスとして返却する。

処理中にエラーが発生した場合、エラーを返却する。
