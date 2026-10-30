■有効期限が指定されている場合
・指定された有効期限をCredential Dataに設定する。

■有効期限が指定されていない場合
・Credential Dataから有効期限を削除する。

Credential Profileの有効期限に対応する動的Mappingを削除する。





"処理内容","備考"
"管理者ユーザ専用API認証処理を実施する。","共通処理「管理者ユーザ専用API認証」参照"
"リクエストパラメータの必須チェックを実施する。

必須情報が存在しない場合は、RequireParamsNotFoundErrorを返却する。",""
"リクエストパラメータから以下の情報を取得する。

・グループID（groupId）
・発行する証明書の情報（offerData）
・追加可能証明書カテゴリ（category）
・対象者（targets）
・証明書名（certName）
・証明書画像（imageData）

発行する証明書の情報から以下を取得する。

・Credential Configuration ID
・Credential Data
・認証方式
・証明書タイプ",""
"issuerテーブルに、指定されたグループIDと一致する情報が存在するか確認する。

存在しない場合はInvalidParamsErrorを返却する。","テーブル：issuer"
"設定ファイルからデフォルトIssuer情報を取得する。

・Issuer Key（issuerKey）
・Issuer DID（issuerDid）

デフォルトIssuer情報がnullまたは空の場合は、Issuer Key及びIssuer DIDをnullとして扱う。",""
"リクエストで指定された認証方式をwalt.id Issuer2形式に変換する。

■変換内容
・事前認可方式：PRE_AUTHORIZED
・認可コード方式：AUTHORIZED

対応していない認証方式の場合はエラーを返却する。",""
"walt.id Issuer2 APIからCredential Profileの一覧を取得する。

■エンドポイント
GET /issuer2/profiles

指定されたCredential Configuration IDと一致するProfileを取得する。

対象のProfileが存在しない場合、または複数存在する場合はエラーを返却する。",""
"Credential Issuer Metadataを取得する。

■エンドポイント
GET /.well-known/openid-credential-issuer/openid4vci

credential_configurations_supportedから、指定されたCredential Configuration IDに対応する設定情報を取得する。

対象の設定情報が存在しない場合はエラーを返却する。",""
"Credential Configuration ID及び証明書フォーマットを検証する。

■対応フォーマット
・JWT VC：jwt_vc_json
・SD-JWT VC：dc+sd-jwt

取得したフォーマットがCredential Configuration IDの末尾と一致することを確認する。

また、Credential ProfileのCredential Configuration IDが指定値と一致することを確認する。

一致しない場合、または未対応のフォーマットの場合はエラーを返却する。","Credential Configuration IDの例：
・Awards_jwt_vc_json
・Awards_dc+sd-jwt"
"Credential Issuer Metadataから証明書タイプを取得し、検証する。

■JWT VCの場合
・credential_definition.typeの最後の要素を取得する。
・Credential ProfileのcredentialData.typeの最後の要素と一致することを確認する。

■SD-JWT VCの場合
・vctの最後の「/」以降の値を取得する。

取得した証明書タイプがCredential Configuration IDのタイプ部分と一致することを確認する。

リクエストで証明書タイプが指定されている場合は、その値とも比較する。

一致しない場合、または証明書タイプを取得できない場合はエラーを返却する。

検証結果としてProfile、証明書タイプ、フォーマット及びCredential Metadataを保持する。",""
"Credential Metadataのclaimsから、有効期限（expirationDate）のPathを取得する。

取得したPathに従って、リクエストのCredential Dataから有効期限を取得する。

有効期限が指定されていない場合は、有効期限なしとして扱う。",""
"有効期限を確認し、発行日時を取得する。

■有効期限が指定されている場合
・指定された有効期限と同じ日付フォーマットで現在日時を取得する。
・有効期限が現在日時以前の場合はInvalidParamsErrorを返却する。

■有効期限が指定されていない場合
・現在日時を取得し、有効期限は設定しない。",""
"証明書フォーマットをCloud Wallet形式に変換する。

・jwt_vc_json → jwt_vc_json
・dc+sd-jwt → vc+sd-jwt

変換したフォーマットをDB登録に使用する。",""
"状態リストテーブルから、対象の状態リスト情報を確認する。

■検索条件（AND）
・グループID：指定されたグループID
・証明書タイプ：検証済みの証明書タイプ

■取得情報
・状態リストURL

対象情報が存在しない場合は、状態リストを新規作成する。","テーブル：status_list"
"状態リストが未登録の場合、VC Registry APIに状態リストの作成を要求する。

■エンドポイント
POST /issuers/{issuer_did}/bsl/issueCredential

■リクエストボディ
・証明書タイプ：検証済みの証明書タイプ

■レスポンス
・bslVcUrl：状態リストURL
・statusPurpose：状態リストの用途

■statusPurpose
・revocation：失効
・suspension：停止

失効状態リスト及び停止状態リストが返却された場合は、失効状態リストのURLを取得する。

■エラー処理
・409：登録済みとして処理を継続する。
・400：VdrBadRequestError
・401：VdrAuthenticationError
・403：VdrForbiddenError
・500：VdrInternalServerError
・502：VdrExternalServiceError
・503：VdrUnavailableError
・上記以外：InternalServerError",""
"DBトランザクションを開始する。","★トランザクション開始"
"状態リストが未登録の場合、以下の情報を状態リストテーブルに登録する。

■登録情報
・グループID
・証明書タイプ
・状態リストURL

登録する状態リストURLが取得できない場合はエラーを返却する。","テーブル：status_list"
"追加可能証明書情報テーブルに以下の情報を登録する。

■登録情報
・グループID：指定されたグループID
・カテゴリ：指定されたカテゴリ
・証明書情報：空文字
・Issuer DID：デフォルトIssuer DID。未指定の場合はCredential ProfileのIssuer DID
・証明書タイプ：検証済みの証明書タイプ
・証明書フォーマット：Cloud Wallet形式に変換したフォーマット
・認証方式：指定された認証方式を小文字に変換した値
・証明書名：指定された証明書名

登録結果から追加可能証明書ID（docId）を取得する。","テーブル：add_cert"
"Credential ProfileのcredentialDataと、リクエストで指定されたcredentialDataを統合する。

■統合条件
・同一項目はリクエストの値を優先する。
・オブジェクト形式の項目は再帰的に統合する。
・リクエストで追加された項目も反映する。
・リクエストで指定されていないProfileの項目は保持する。",""
"Credential Metadataのclaimsから以下の項目のPathを取得し、Credential Dataを設定する。

■対象項目
・type
・docId
・issuanceDate
・expirationDate
・image

■設定内容
・docId：取得した追加可能証明書IDを設定する。
・type：検証済みの証明書タイプに対応する業務項目の値を設定する。
・issuanceDate：取得した発行日時を設定する。
・expirationDate：指定された場合は指定日を設定し、未指定の場合は削除する。

対象のPathが存在しない場合は、その項目の設定を行わない。

JWT VCのトップレベルtype配列は上書きしない。",""
"証明書画像を設定する。

■画像の取得優先順位
・管理者が指定した画像（imageData）
・リクエストのCredential Dataに設定された画像
・Credential Profileに定義された画像
・設定ファイルのデフォルト画像

取得した画像をCredential Metadataのimageに対応するPathに設定する。

画像またはPathが存在しない場合は設定を行わない。","管理者が指定したimageDataを最優先する。"
"Credential ProfileのMappingを取得し、発行日時及び有効期限の設定に応じて変更する。

・issuanceDate：発行日時をCredential Dataに設定した場合は、対応する動的Mappingを削除する。
・expirationDate：指定の有無にかかわらず、動的Mappingを削除する。

その他のMappingは保持する。",""
"Credential Status Webhook用の情報を設定する。

Credential IDをUUID形式で生成し、設定ファイルからWebhook URLを取得する。

■Webhook URLのクエリパラメータ
・type：検証済みの証明書タイプ
・issuerDid：デフォルトIssuer DID。未指定の場合はCredential ProfileのIssuer DID
・credentialId：生成したCredential ID

■Mappingの設定内容
・id：生成したCredential ID
・credentialStatus：「<webhook-json:URL>」形式の値

その他のMappingは保持する。",""
"Credential Offer作成用Payloadを準備する。

■設定情報
・profileId：Credential Profile ID
・authMethod：変換済み認証方式
・credentialData：統合及び編集したCredential Data
・mapping：編集したMapping

Selective DisclosureがProfileに定義されている場合は、その設定を使用する。

Issuer DID及びIssuer Keyが指定されている場合は、上書き用の情報として設定する。",""
"追加可能証明書情報テーブルの対象レコードを更新する。

■更新条件
・追加可能証明書ID：取得したdocId

■更新内容
・証明書情報（vc_info）：準備したPayloadをJSON文字列に変換した値","テーブル：add_cert"
"指定された対象者ごとに、追加可能証明書対象者情報テーブルに以下の情報を登録する。

■登録情報
・追加可能証明書ID
・グループID
・ユーザID","テーブル：add_cert_user"
"DBトランザクションを終了する。","★トランザクション終了"
"発行可能証明書情報の登録を完了し、正常終了する。","戻り値：なし"
"処理中にエラーが発生した場合は、エラーログを出力し、例外を上位処理に通知する。

DBトランザクション内でエラーが発生した場合はロールバックする。","共通エラー処理に従う。"


"処理内容","備考"
"管理者ユーザ専用API認証処理を実施する。","共通処理「管理者ユーザ専用API認証」参照"
"リクエストパラメータの必須チェックを実施する。

必須情報が存在しない場合は、RequireParamsNotFoundErrorを返却する。",""
"リクエストパラメータから以下の情報を取得する。

・グループID（groupId）
・発行する証明書の情報（offerData）
・追加可能証明書カテゴリ（category）
・対象者（targets）
・証明書名（certName）
・証明書画像（imageData）

発行する証明書の情報から以下を取得する。

・Credential Configuration ID
・Credential Data
・認証方式
・証明書タイプ",""
"issuerテーブルに、指定されたグループIDと一致する情報が存在するか確認する。

存在しない場合はInvalidParamsErrorを返却する。","テーブル：issuer"
"設定ファイルからデフォルトIssuer情報を取得する。

・Issuer Key（issuerKey）
・Issuer DID（issuerDid）

デフォルトIssuer情報がnullまたは空の場合は、Issuer Key及びIssuer DIDをnullとして扱う。",""
"リクエストで指定された認証方式をwalt.id Issuer2形式に変換する。

■変換内容
・事前認可方式：PRE_AUTHORIZED
・認可コード方式：AUTHORIZED

対応していない認証方式の場合はエラーを返却する。",""
"walt.id Issuer2 APIからCredential Profileの一覧を取得する。

■エンドポイント
GET /issuer2/profiles

指定されたCredential Configuration IDと一致するProfileを取得する。

対象のProfileが存在しない場合、または複数存在する場合はエラーを返却する。",""
"Credential Issuer Metadataを取得する。

■エンドポイント
GET /.well-known/openid-credential-issuer/openid4vci

credential_configurations_supportedから、指定されたCredential Configuration IDに対応する設定情報を取得する。

対象の設定情報が存在しない場合はエラーを返却する。",""
"Credential Configuration ID及び証明書フォーマットを検証する。

■対応フォーマット
・JWT VC：jwt_vc_json
・SD-JWT VC：dc+sd-jwt

取得したフォーマットがCredential Configuration IDの末尾と一致することを確認する。

また、Credential ProfileのCredential Configuration IDが指定値と一致することを確認する。

一致しない場合、または未対応のフォーマットの場合はエラーを返却する。","Credential Configuration IDの例：
・Awards_jwt_vc_json
・Awards_dc+sd-jwt"
"Credential Issuer Metadataから証明書タイプを取得し、検証する。

■JWT VCの場合
・credential_definition.typeの最後の要素を取得する。
・Credential ProfileのcredentialData.typeの最後の要素と一致することを確認する。

■SD-JWT VCの場合
・vctの最後の「/」以降の値を取得する。

取得した証明書タイプがCredential Configuration IDのタイプ部分と一致することを確認する。

リクエストで証明書タイプが指定されている場合は、その値とも比較する。

一致しない場合、または証明書タイプを取得できない場合はエラーを返却する。

検証結果としてProfile、証明書タイプ、フォーマット及びCredential Metadataを保持する。",""
"Credential Metadataのclaimsから、有効期限（expirationDate）のPathを取得する。

取得したPathに従って、リクエストのCredential Dataから有効期限を取得する。

有効期限が指定されていない場合は、有効期限なしとして扱う。",""
"有効期限を確認し、発行日時を取得する。

■有効期限が指定されている場合
・指定された有効期限と同じ日付フォーマットで現在日時を取得する。
・有効期限が現在日時以前の場合はInvalidParamsErrorを返却する。

■有効期限が指定されていない場合
・現在日時を取得し、有効期限は設定しない。",""
"証明書フォーマットをCloud Wallet形式に変換する。

・jwt_vc_json → jwt_vc_json
・dc+sd-jwt → vc+sd-jwt

変換したフォーマットをDB登録に使用する。",""
"状態リストテーブルから、対象の状態リスト情報を確認する。

■検索条件（AND）
・グループID：指定されたグループID
・証明書タイプ：検証済みの証明書タイプ

■取得情報
・状態リストURL

対象情報が存在しない場合は、状態リストを新規作成する。","テーブル：status_list"
"状態リストが未登録の場合、VC Registry APIに状態リストの作成を要求する。

■エンドポイント
POST /issuers/{issuer_did}/bsl/issueCredential

■リクエストボディ
・証明書タイプ：検証済みの証明書タイプ

■レスポンス
・bslVcUrl：状態リストURL
・statusPurpose：状態リストの用途

■statusPurpose
・revocation：失効
・suspension：停止

失効状態リスト及び停止状態リストが返却された場合は、失効状態リストのURLを取得する。

■エラー処理
・409：登録済みとして処理を継続する。
・400：VdrBadRequestError
・401：VdrAuthenticationError
・403：VdrForbiddenError
・500：VdrInternalServerError
・502：VdrExternalServiceError
・503：VdrUnavailableError
・上記以外：InternalServerError",""
"DBトランザクションを開始する。","★トランザクション開始"
"状態リストが未登録の場合、以下の情報を状態リストテーブルに登録する。

■登録情報
・グループID
・証明書タイプ
・状態リストURL

登録する状態リストURLが取得できない場合はエラーを返却する。","テーブル：status_list"
"追加可能証明書情報テーブルに以下の情報を登録する。

■登録情報
・グループID：指定されたグループID
・カテゴリ：指定されたカテゴリ
・証明書情報：空文字
・Issuer DID：デフォルトIssuer DID。未指定の場合はCredential ProfileのIssuer DID
・証明書タイプ：検証済みの証明書タイプ
・証明書フォーマット：Cloud Wallet形式に変換したフォーマット
・認証方式：指定された認証方式を小文字に変換した値
・証明書名：指定された証明書名

登録結果から追加可能証明書ID（docId）を取得する。","テーブル：add_cert"
"Credential ProfileのcredentialDataと、リクエストで指定されたcredentialDataを統合する。

■統合条件
・同一項目はリクエストの値を優先する。
・オブジェクト形式の項目は再帰的に統合する。
・リクエストで追加された項目も反映する。
・リクエストで指定されていないProfileの項目は保持する。",""
"Credential Metadataのclaimsから以下の項目のPathを取得し、Credential Dataを設定する。

■対象項目
・type
・docId
・issuanceDate
・expirationDate
・image

■設定内容
・docId：取得した追加可能証明書IDを設定する。
・type：検証済みの証明書タイプに対応する業務項目の値を設定する。
・issuanceDate：取得した発行日時を設定する。
・expirationDate：指定された場合は指定日を設定し、未指定の場合は削除する。

対象のPathが存在しない場合は、その項目の設定を行わない。

JWT VCのトップレベルtype配列は上書きしない。",""
"証明書画像を設定する。

■画像の取得優先順位
・管理者が指定した画像（imageData）
・リクエストのCredential Dataに設定された画像
・Credential Profileに定義された画像
・設定ファイルのデフォルト画像

取得した画像をCredential Metadataのimageに対応するPathに設定する。

画像またはPathが存在しない場合は設定を行わない。","管理者が指定したimageDataを最優先する。"
"Credential ProfileのMappingを取得し、発行日時及び有効期限の設定に応じて変更する。

・issuanceDate：発行日時をCredential Dataに設定した場合は、対応する動的Mappingを削除する。
・expirationDate：指定の有無にかかわらず、動的Mappingを削除する。

その他のMappingは保持する。",""
"Credential Status Webhook用の情報を設定する。

Credential IDをUUID形式で生成し、設定ファイルからWebhook URLを取得する。

■Webhook URLのクエリパラメータ
・type：検証済みの証明書タイプ
・issuerDid：デフォルトIssuer DID。未指定の場合はCredential ProfileのIssuer DID
・credentialId：生成したCredential ID

■Mappingの設定内容
・id：生成したCredential ID
・credentialStatus：「<webhook-json:URL>」形式の値

その他のMappingは保持する。",""
"Credential Offer作成用Payloadを準備する。

■設定情報
・profileId：Credential Profile ID
・authMethod：変換済み認証方式
・credentialData：統合及び編集したCredential Data
・mapping：編集したMapping

Selective DisclosureがProfileに定義されている場合は、その設定を使用する。

Issuer DID及びIssuer Keyが指定されている場合は、上書き用の情報として設定する。",""
"追加可能証明書情報テーブルの対象レコードを更新する。

■更新条件
・追加可能証明書ID：取得したdocId

■更新内容
・証明書情報（vc_info）：準備したPayloadをJSON文字列に変換した値","テーブル：add_cert"
"指定された対象者ごとに、追加可能証明書対象者情報テーブルに以下の情報を登録する。

■登録情報
・追加可能証明書ID
・グループID
・ユーザID","テーブル：add_cert_user"
"DBトランザクションを終了する。","★トランザクション終了"
"発行可能証明書情報の登録を完了し、正常終了する。","戻り値：なし"
"処理中にエラーが発生した場合は、エラーログを出力し、例外を上位処理に通知する。

DBトランザクション内でエラーが発生した場合はロールバックする。","共通エラー処理に従う。"
