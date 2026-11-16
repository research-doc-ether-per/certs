「VC追加・更新API認証」処理を実施する。

共通処理「VC追加・更新API認証」参照。

————————

パラメータ／ボディの必須チェックを実施する。

以下の場合、エラーを返却する。
- 必須情報が存在しない場合：RequireParamsNotFoundError

————————

リクエストボディ、アクセストークンから以下の情報を取得する。

- ユーザーID：アクセストークンのsub（accessToken.sub）
- 証明書データ：certJwt
- 証明書名：certName
- 証明書の補足説明：certExplanation
- ドキュメントID：docId
- 所有者名：アクセストークンのpreferred_username

————————

ユーザーIDをキーに個人ウォレットテーブル（priv_wallets）を検索し、ウォレットの存在を確認する。

ウォレットが存在しない場合、以下のエラーを返却する。
- WalletNotFoundError

ウォレットが存在する場合、以下の情報を取得する。
- Walt.idウォレットID：waltid_wallet

————————

証明書データ（certJwt）の形式を検証し、JWTまたはSD-JWTを解析する。

共通処理「parseCredentialForAdd」参照。

解析に失敗した場合、以下のエラーを返却する。
- CertificateAddFailedError

解析結果から以下の情報を取得する。
- 証明書フォーマット
- JWTヘッダー
- JWTペイロード
- JWT署名
- Disclosures
- Key Binding JWT

————————

解析した証明書情報から、以下の情報を取得する。

- 発行日時
- 有効期限終了日時
- 発行者DID
- 対象者DID
- 証明書の種別
- 証明書ID

取得できない任意項目にはnullを設定する。

————————

証明書の種別およびフォーマットに基づいて、基本4情報の証明書であるかを判定する。

SD-JWT形式の場合、VCTの末尾のパス要素が基本4情報の識別子に一致するかを確認する。

————————

基本4情報以外の証明書の場合、証明書IDをキーに、既に同一証明書が登録されているかを確認する。

同一証明書が存在する場合、以下のエラーを返却する。
- CredentialAlreadyExistsError

————————

基本4情報の証明書の場合、既存の基本4情報証明書を確認する。

既存の基本4情報証明書が存在する場合、発行日時を比較する。

- 追加対象の発行日時が既存の発行日時より古い場合：Basic4InfoOldIssueDateErrorを返却する。
- 追加対象の発行日時が既存の発行日時以降の場合：既存の基本4情報証明書を削除対象とする。

————————

Walt.id Wallet APIを呼び出し、証明書をインポートする。

■ 使用API
- エンドポイント：/wallet/{walletId}/credentials/import
- メソッド：POST

■ パスパラメータ
- walletId：取得したWalt.idウォレットID

■ リクエストボディ
- rawCredential：リクエストで指定されたcertJwt
- label：証明書の表示名称（certName）

JWT形式、SD-JWT形式のいずれの場合も、証明書データ全体をrawCredentialに指定する。

SD-JWT形式の場合、Disclosures部分を含む文字列を指定する。

————————

Walt.idから返却された証明書IDを取得する。

取得した証明書IDを、VCウォレットテーブル（vc_wallets）に登録する証明書の識別子として使用する。

————————

以下の情報をVCウォレットテーブル（vc_wallets）に登録する。

- rs_id：生成したリソースID
- owner_id：ユーザーID
- owner_name：所有者名
- cert_name：証明書名
- cert_explanation：証明書の補足説明
- doc_id：ドキュメントID
- issuance_date：発行日時
- expiration_date：有効期限終了日時
- issuer：発行者DID
- subject：対象者DID
- waltid_credential_id：Walt.id証明書ID
- hash：証明書の対象者情報から取得したハッシュ値

基本4情報の証明書の場合、doc_idには0を設定する。

基本4情報以外の証明書でdocIdが指定されていない場合、doc_idには999を設定する。

————————

基本4情報の証明書を更新する場合、既存の基本4情報証明書に対応する情報を削除する。

————————

登録したリソースID（rsId）をレスポンスに設定し、成功レスポンスを返却する。

————————

処理中にエラーが発生した場合、エラーを上位処理へ通知する。
