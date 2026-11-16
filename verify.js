「VC参照API認証」処理を実施する。

共通処理「VC参照API認証」参照。

————————

パラメータの必須チェックを実施する。

以下の場合、エラーを返却する。
- 必須情報が存在しない場合：RequireParamsNotFoundError

————————

リクエストパラメータ、アクセストークンから以下の情報を取得する。

- ユーザーID：アクセストークンのsub（accessToken.sub）
- ドキュメントID：リクエストパラメータのdocId（任意）

————————

ユーザーIDをキーに個人ウォレットテーブル（priv_wallets）を検索し、ウォレットの存在を確認する。

ウォレットが存在しない場合、以下のエラーを返却する。
- WalletNotFoundError

ウォレットが存在する場合、ウォレット情報から以下を取得する。
- Walt.idウォレットID：waltid_wallet

————————

以下の検索条件に基づいて、VCウォレットテーブル（vc_wallets）から証明書情報を取得する。

■ 検索条件
- 所有者ユーザーID（owner_id）＝ユーザーID
- ドキュメントID（doc_id）＝指定されたdocId（指定されている場合のみ）

■ ソート条件
- 更新日時（update_date）

■ 取得情報
- リソースID（rs_id）
- 所有者ユーザーID（owner_id）
- 所有者名（owner_name）
- 証明書名（cert_name）
- 証明書の補足説明（cert_explanation）
- ドキュメントID（doc_id）
- 画像URL（img_url）
- 発行日時（issuance_date）
- 有効期限終了日時（expiration_date）
- 発行者（issuer）
- 対象者（subject）
- Walt.id証明書ID（waltid_credential_id）
- 更新日時（update_date）
- 作成日時（create_date）

————————

取得したVC情報を1件ずつ処理し、Walt.idから証明書情報を取得する。

■ 使用API
- エンドポイント：/wallet/{walletId}/credentials/{credentialId}
- メソッド：GET

■ パスパラメータ
- walletId：取得したWalt.idウォレットID
- credentialId：VCウォレットテーブルのwaltid_credential_id

————————

Walt.idから取得した証明書情報に基づいて、証明書データを取得する。

■ 証明書データ（jwt）
- 証明書フォーマットが「dc+sd-jwt」の場合：credential.signedWithDisclosures
- 上記以外の場合：credential.signed

SD-JWT形式の場合、Disclosures部分を含む証明書データを取得する。

————————

証明書フォーマットに応じて、証明書種別（type）を取得する。

以下の情報を使用し、共通処理「extractCredentialType」を実施する。

- 証明書タイプ：credential.credentialData.type
- VCT：credential.credentialData.vct
- 証明書フォーマット：credential.format

————————

取得した証明書情報をレスポンス用の証明書一覧（certList）に追加する。

■ 設定情報
- rsId：リソースID
- ownerId：所有者ユーザーID
- ownerName：所有者名
- certName：証明書名
- certExplanation：証明書の補足説明
- docId：ドキュメントID
- imgUrl：画像URL
- issuanceDate：発行日時（UTC Unix時刻に変換）
- expirationDate：有効期限終了日時（UTC Unix時刻に変換）
- issuer：発行者
- issuerName：null
- subject：対象者
- jwt：取得したJWTまたはSD-JWT
- type：証明書種別
- updateDate：更新日時（UTC Unix時刻に変換）
- createDate：作成日時（UTC Unix時刻に変換）

————————

取得したすべての証明書について上記処理を繰り返す。

処理完了後、証明書一覧を返却する。

■ レスポンス
- certList：証明書情報の配列

対象の証明書が存在しない場合、空配列を返却する。

————————

処理中にエラーが発生した場合、エラーを上位処理へ通知する。
