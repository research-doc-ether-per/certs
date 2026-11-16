「VC追加・更新API認証」処理を実施する。

共通処理「VC追加・更新API認証」参照。

————————

パラメータおよびリクエストボディの必須チェックを実施する。

以下の場合、エラーを返却する。
- 必須情報が存在しない場合：RequireParamsNotFoundError

————————

リクエストパラメータ、リクエストボディ、アクセストークンから以下の情報を取得する。

■ リクエスト情報
- 証明書データ：certJwt
- 証明書名：certName
- 証明書の補足説明：certExplanation
- ドキュメントID：docId
- リソースID：rsId（指定されている場合）

Realm名に応じて、所有者情報を取得する。

【個人ユーザーの場合】
- 所有者ユーザーID：リクエストユーザーID（アクセストークンのsub）
- 所有者名：Keycloakユーザー情報のpreferred_username

【組織ユーザーの場合】
- 所有者ユーザーID：Keycloakユーザー情報のissと、リクエストで指定されたグループIDを連結した文字列
- 所有者名：リクエストで指定されたグループID
- グループID：リクエストで指定されたグループID

対応していないRealm名の場合、以下のエラーを返却する。
- InvalidParamsError

————————

取得した所有者ユーザーIDをキーに、個人ウォレットテーブル（priv_wallets）を検索し、ウォレットの存在を確認する。

■ 検索条件
- user_id：取得した所有者ユーザーID

ウォレットが存在しない場合、以下のエラーを返却する。
- WalletNotFoundError

ウォレットが存在する場合、以下の情報を取得する。
- Walt.idウォレットID：waltid_wallet

————————

証明書データ（certJwt）の形式チェックおよび解析を実施する。

■ 形式チェック

証明書データが空文字列ではない文字列であることを確認する。

証明書データに「~」が含まれる場合、SD-JWT形式として処理する。それ以外の場合、JWT形式として処理する。

JWT部分について、以下を確認する。
- 「.」で区切られた3つの要素で構成されていること
- HeaderおよびPayloadが有効なBase64URL形式であること
- HeaderおよびPayloadをJSONデータとして解析できること
- 署名部分が所定の形式であること

SD-JWT形式の場合、以下を確認する。
- JWT部分とDisclosures部分が「~」で区切られていること
- 各Disclosureが有効なBase64URL形式であること
- デコードしたDisclosureが2要素または3要素の配列であること
- Key Binding JWTが存在する場合、そのJWT形式が正しいこと

■ 解析処理

JWT部分のHeaderおよびPayloadをBase64URLデコードし、JSONデータとして取得する。

SD-JWT形式の場合、Disclosuresをデコードして解析する。

Key Binding JWTが存在する場合、その情報を取得する。

解析に失敗した場合、以下のエラーを返却する。
- CertificateAddFailedError

※ 本処理ではJWT／SD-JWTの形式チェックおよびデコードを行い、電子署名の検証は行わない。

————————

解析したJWTペイロードから、証明書情報を取得する。

JWTペイロードにvcが存在する場合、vcを証明書情報として使用する。

vcが存在しない場合、JWTペイロード自体を証明書情報として使用する。

■ 取得情報
- 証明書情報：payload.vc または payload
- 証明書対象者情報：credential.credentialSubject
- VCT：credential.vct
- 発行日時：credential.issuanceDate
- 有効期限終了日時：credential.expirationDate
- 発行者：credential.issuer
- 対象者：credential.credentialSubject.id

発行日時、有効期限終了日時、発行者、対象者が取得できない場合、nullを設定する。

————————

リクエストでリソースID（rsId）が指定されていない場合、UUIDを生成して設定する。

証明書ID（credentialId）を取得する。

- 証明書情報にidが存在する場合、その値を使用する。
- idが存在しない場合、「urn:uuid:」とリソースIDを連結した文字列を設定する。

————————

証明書対象者情報（credentialSubject）をJSON文字列に変換し、SHA-256ハッシュ値を生成する。

生成したハッシュ値は、VCウォレットテーブル登録時に先頭へ「0x」を付与して設定する。

————————

証明書のVCTに基づいて、基本4情報の証明書であるかを判定する。

基本4情報判定処理「isBase4InfoCredential」を実施する。

判定結果に応じて、後続の既存証明書確認処理を分岐する。

————————

DBトランザクションを開始する。

以降のVCウォレットテーブルの検索、削除および登録処理を同一DBトランザクション内で実施する。

————————

【証明書が基本4情報の場合】

ドキュメントID（docId）に基本4情報の固定値（docIds.b4d）を設定する。

VCウォレットテーブル（vc_wallets）を検索し、既存の基本4情報証明書が存在するかを確認する。

■ 検索テーブル
- vc_wallets

■ 検索条件
- owner_id：所有者ユーザーID
- doc_id：基本4情報の固定値（docIds.b4d）

既存の基本4情報証明書が存在する場合、取得結果の先頭レコードから以下の情報を取得する。

■ 取得情報
- issuance_date：既存証明書の発行日時
- waltid_credential_id：既存証明書のWalt.id証明書ID
- rs_id：既存証明書のリソースID

追加対象証明書の発行日時と、既存証明書の発行日時を比較する。

【追加対象の発行日時が既存証明書の発行日時と同じ、または古い場合】

以下のエラーを返却する。
- Basic4InfoOldIssueDateError

DBトランザクションをロールバックし、証明書追加処理を終了する。

【追加対象の発行日時が既存証明書の発行日時より新しい場合】

既存の基本4情報証明書を削除する。

VCウォレットテーブル（vc_wallets）から既存レコードを削除する。

■ 削除テーブル
- vc_wallets

■ 削除条件
- owner_id：所有者ユーザーID
- rs_id：既存証明書のリソースID

続いて、Walt.id Wallet APIを呼び出し、既存の証明書をウォレットから削除する。

■ 使用API
- メソッド：DELETE
- エンドポイント：/wallet/{walletId}/credentials/{credentialId}

■ パスパラメータ
- walletId：Walt.idウォレットID
- credentialId：既存レコードのwaltid_credential_id

削除処理が正常に完了した場合、後続の証明書登録処理を実施する。

既存の基本4情報証明書が存在しない場合、削除処理を行わず、後続の証明書登録処理を実施する。

————————

【証明書が基本4情報以外の場合】

Walt.id Wallet APIを呼び出し、追加対象と同じ証明書IDの証明書がウォレットに存在するかを確認する。

■ 使用API
- メソッド：GET
- エンドポイント：/wallet/{walletId}/credentials/{credentialId}

■ パスパラメータ
- walletId：Walt.idウォレットID
- credentialId：追加対象の証明書ID

同一証明書が存在する場合、以下のエラーを返却する。
- CredentialAlreadyExistsError（HTTP 409）

DBトランザクションをロールバックし、証明書追加処理を終了する。

証明書の取得時にエラーが発生した場合、既存証明書なしとして後続の登録処理を実施する。

————————

VCウォレットテーブル（vc_wallets）に追加対象の証明書情報を登録する。

■ 登録テーブル
- vc_wallets

■ 登録情報
- rs_id：リソースID
- owner_id：所有者ユーザーID
- owner_name：所有者名
- cert_name：証明書名
- cert_explanation：証明書の補足説明
- doc_id：ドキュメントID
- issuance_date：発行日時
- expiration_date：有効期限終了日時
- issuer：発行者
- subject：対象者
- waltid_credential_id：追加対象の証明書ID
- hash：証明書対象者情報のSHA-256ハッシュ値（先頭に「0x」を付与）

ドキュメントID（doc_id）は、値がundefined、null、空文字列のいずれでもない場合のみ登録項目に含める。

基本4情報の場合、doc_idには基本4情報の固定値（docIds.b4d）を設定する。

————————

Walt.id Wallet APIを呼び出し、証明書をウォレットへインポートする。

■ 使用API
- メソッド：POST
- エンドポイント：/wallet/{walletId}/credentials/import

■ パスパラメータ
- walletId：Walt.idウォレットID

■ リクエストボディ
- rawCredential：リクエストで指定された証明書データ（certJwt）

JWT形式の場合、JWT文字列を指定する。

SD-JWT形式の場合、Disclosuresを含むSD-JWT文字列を指定する。

インポートAPIの返却値による証明書IDの再設定は行わない。

————————

証明書の登録およびインポート処理が正常に完了した場合、DBトランザクションをコミットする。

DBトランザクション内でエラーが発生した場合、DBの変更をロールバックする。

なお、Walt.id Wallet APIによる証明書の削除およびインポート処理は、DBトランザクションのロールバック対象外とする。

————————

登録したリソースID（rsId）をレスポンスに設定し、成功レスポンスを返却する。

■ レスポンス
- rsId：登録した証明書のリソースID

————————

処理中にエラーが発生した場合、エラー情報をログに出力し、上位処理へ通知する。
