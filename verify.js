「VCウォレット管理API認証」処理を実施する。

—————————————————

パラメータ／ボディから以下の情報を取得する。

- ユーザID
- Realm名
- `image`：基本4情報VCに設定する画像データ

—————————————————

ユーザIDをキーに個人ウォレットテーブル（`priv_wallets`）を検索し、ウォレット情報が存在するか確認する。

■検索条件
- `user_id`：取得したユーザID

ウォレット情報が存在しない場合、`WalletNotFoundError` を返却する。

ウォレット情報が存在する場合、`waltid_wallet` を walt.id Wallet IDとして取得する。

—————————————————

PAT取得処理を実施し、SmartLiTA APIアクセス用のアクセストークンを取得する。

■取得条件
- Realm名：取得したRealm名

—————————————————

SmartLiTA APIへ基本4情報取得リクエストを行い、基本4情報を取得する。

■エンドポイント
GET /api/v1/users/{userId}/certificate/excerptFromResidentRegistration

■パスパラメータ
- `userId`：取得したユーザID

■リクエストヘッダ
- `Authorization`：Bearer {PAT取得処理で取得したアクセストークン}
- `Content-Type`：application/json

■取得情報
- `name`
- `address`
- `birthdate`
- `gender`
- `expiration_datetime`

SmartLiTA APIからエラーが返却された場合、以下のエラーとして処理する。
- 400：`Basic4InfoInvalidRequestError`
- 401：`Basic4InfoAuthenticationError`
- 403：`Basic4InfoForbiddenError`
- 404：`Basic4InfoNotFoundError`
- 500：`Basic4InfoInternalServerError`
- 503：`Basic4InfoUnavailableError`
- 上記以外：`InternalServerError`

—————————————————

取得した基本4情報の有効終了日を確認する。

`expiration_datetime` プロパティが存在しない場合、現在日時から1年後の日付を設定する。

`expiration_datetime` の値が `null` または `undefined` の場合、現在日時から1年後の日付を設定する。

—————————————————

取得した基本4情報について、各プロパティの値が `null` または `undefined` の場合、空文字に変換する。

■対象情報
- `name`
- `address`
- `birthdate`
- `gender`
- `expiration_datetime`

変換後、`expiration_datetime` が空の場合は、現在日時から1年後の日付を設定する。

—————————————————

Issuer設定情報から以下の情報を取得する。

■取得情報
- `issuerKey`：Issuer署名用Key
- `issuerDid`：Issuer DID
- `verificationMethodId`：署名に使用するVerification Method ID

—————————————————

証明書IDを生成する。

■生成形式
`urn:uuid:{UUID}`

—————————————————

有効終了日（`expiration_datetime`）から、日時フォーマットおよびタイムゾーン情報を取得する。

—————————————————

walt.id Wallet APIを呼び出し、Wallet情報を取得する。

■エンドポイント
GET /wallet/{walletId}

■パスパラメータ
- `walletId`：取得したwalt.id Wallet ID

取得したWallet情報の `defaultDidId` をHolder DIDとして取得する。

—————————————————

Holder DIDからPublic JWKを取得する。

■取得条件
- `walletId`：取得したwalt.id Wallet ID
- `did`：取得したHolder DID

取得したPublic JWKは、SD-JWT VCの `cnf.jwk` に設定する。

—————————————————

基本4情報および画像情報からDisclosureを生成する。

■Disclosure対象
- `name`
- `address`
- `birthdate`
- `gender`
- `image`
  - リクエストで指定されていない場合は空文字を設定する

各項目についてDisclosureおよびDigestを生成し、以下の配列へ保持する。
- `disclosures`：生成したDisclosure
- `digests`：生成したDigest

—————————————————

現在日時をUnix time（秒）で取得する。

—————————————————

基本4情報VC定義から `format` を除いたCredential情報を取得し、SD-JWT VC Payloadを生成する。

■Payload

- Credential定義情報：基本4情報VC定義の `format` を除いた情報
- `credentialSubject`
  - `id`：Holder DID
  - `expirationDate`：取得した基本4情報の有効終了日
  - `_sd`：基本4情報および画像から生成したDigest配列
- `id`：生成した証明書ID
- `nbf`：現在日時（Unix time／秒）
- `exp`：現在日時 + 365日（Unix time／秒）
- `sub`：Issuer DID
- `issuer`：Issuer DID
- `issuanceDate`：取得した日時フォーマットに従った現在日時
- `expirationDate`：取得した基本4情報の有効終了日
- `iss`：Issuer DID
- `cnf.jwk`：Holder DIDから取得したPublic JWK
- `display`：空配列

—————————————————

Issuerの署名鍵を使用し、生成したPayloadにES256署名を実施してJWSを生成する。

■Protected Header
- `alg`：`ES256`
- `kid`：Issuer設定情報から取得した `verificationMethodId`
- `typ`：SD-JWT VC用のタイプ

■署名鍵
- Issuer設定情報の `issuerKey.jwk`

—————————————————

生成したJWSの末尾に、基本4情報および画像から生成したDisclosureを `~` 区切りで付加し、SD-JWTを生成する。

生成形式：
`{JWS}~{Disclosure1}~{Disclosure2}~...`

—————————————————

以下の情報をレスポンスとして返却する。

■レスポンス情報
- `jwt`：生成したSD-JWT

—————————————————

処理中にエラーが発生した場合、`InternalServerError` を返却する。
