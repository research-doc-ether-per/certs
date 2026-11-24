基本4情報管理API認証処理を実施する。

—————————————————

パラメータから以下の情報を取得する。

- ユーザID
- Keycloakアクセストークン
- Realm名
- リクエストボディ

—————————————————

Realm名に応じてリクエスト用ユーザ情報を取得する。

【取得情報】

- `userId`：ユーザID
- `userName`：ユーザ名

—————————————————

ユーザIDをキーに個人ウォレットテーブル（`priv_wallets`）を検索し、ウォレット情報が存在するか確認する。

■検索条件

- `user_id`：取得したユーザID

ウォレット情報が存在しない場合、`WalletNotFoundError` を返却する。

ウォレット情報が存在する場合、`waltid_wallet` を walt.id Wallet ID として取得する。

—————————————————

特別Issuer APIの「基本4情報VC発行」を呼び出し、基本4情報VCを取得する。

■エンドポイント

POST /issuer/{userId}/sp/b4dvc

■パスパラメータ

- `userId`：取得したユーザID

■ヘッダ

- Authorization：Keycloakアクセストークン

■リクエストボディ

本APIのリクエストボディをそのまま設定する。

正常時、HTTPステータスが `200` かつレスポンスボディが空でないオブジェクトであることを確認する。

条件を満たさない場合、以下のエラーとして処理する。

- HTTPステータスなし：`InternalServerError`
- 400：`Basic4InfoInvalidRequestError`
- 401：`Basic4InfoAuthenticationError`
- 403：`Basic4InfoForbiddenError`
- 404：`Basic4InfoNotFoundError`
- 500：`Basic4InfoInternalServerError`
- 503：`Basic4InfoUnavailableError`
- 上記以外：`InternalServerError`

—————————————————

特別Issuer APIのレスポンスから `jwt` を取得する。

取得したJWTを解析し、Credential情報を取得する。

■取得情報

- `credentialSubject`
- `issuanceDate`
- `expirationDate`
- `issuer`
- `subject`

Credential情報は以下のルールで取得する。

- Credential本体：`payload.vc` が存在する場合は `payload.vc`、存在しない場合は `payload`
- `credentialSubject`：Credential本体の `credentialSubject`
- `issuanceDate`：Credential本体の `issuanceDate`。存在しない場合は `null`
- `expirationDate`：Credential本体の `expirationDate`。存在しない場合は `null`
- `issuer`：Credential本体の `issuer`。存在しない場合は `null`
- `subject`：`credentialSubject.id`。存在しない場合は `null`

—————————————————

`credentialSubject` をJSON文字列化し、SHA-256ハッシュ値を生成する。

—————————————————

基本4情報VC用の `docId` を取得する。

また、新しいリソースID（UUID）を生成する。

—————————————————

DBトランザクションを開始する。

—————————————————

VCウォレットテーブル（`vc_wallets`）から既存の基本4情報VCを検索する。

■検索条件

- `owner_id`：取得したユーザID
- `doc_id`：基本4情報VC用のdocId

■取得情報

- `rs_id`
- `waltid_credential_id`

—————————————————

既存の基本4情報VCが存在する場合、既存データを削除する。

walt.id Wallet APIを呼び出し、既存の証明書を削除する。

■エンドポイント

DELETE /wallet/{walletId}/credentials/{credentialId}

■パスパラメータ

- `walletId`：取得したwalt.id Wallet ID
- `credentialId`：既存基本4情報VCの `waltid_credential_id`

—————————————————

VCウォレットテーブル（`vc_wallets`）から既存の基本4情報VCを削除する。

■削除条件

- `owner_id`：取得したユーザID
- `rs_id`：既存基本4情報VCのリソースID

—————————————————

walt.id Wallet APIを呼び出し、特別Issuer APIから取得したJWTをWalletへインポートする。

■エンドポイント

POST /wallet/{walletId}/credentials/import

■パスパラメータ

- `walletId`：取得したwalt.id Wallet ID

■リクエストボディ

- `rawCredential`：特別Issuer APIから取得したJWT

レスポンスの `id` を walt.id Credential ID として取得する。

—————————————————

VCウォレットテーブル（`vc_wallets`）へ基本4情報VCを登録する。

■登録情報

- `rs_id`：生成したリソースID
- `owner_id`：取得したユーザID
- `owner_name`：取得したユーザ名
- `cert_name`：基本4情報VC名
- `cert_explanation`：基本4情報VC名
- `doc_id`：基本4情報VC用docId
- `img_url`：`null`
- `issuance_date`：取得した有効開始日時
- `expiration_date`：取得した有効終了日時
- `issuer`：取得したIssuer
- `subject`：取得したSubject
- `waltid_credential_id`：walt.id WalletへのImport結果から取得したCredential ID
- `hash`：`credentialSubject` のSHA-256ハッシュ値に `0x` を付与した値

—————————————————

トランザクションをコミットする。

処理途中でエラーが発生した場合、ロールバックする。

また、walt.id WalletへのImport完了後に後続処理でエラーが発生した場合、Importした証明書をwalt.id Walletから削除する。

■エンドポイント

DELETE /wallet/{walletId}/credentials/{credentialId}

—————————————————

以下の情報をレスポンスとして返却する。

■レスポンス情報

- `rsId`：生成したリソースID

処理中に上記以外のエラーが発生した場合、`InternalServerError` を返却する。
