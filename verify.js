
"処理内容","備考"
"個人ユーザ専用API認証処理を実施する。","共通処理「個人ユーザ専用API認証」参照"
"リクエストパラメータの必須チェックを実施する。

必須情報が存在しない場合は、RequireParamsNotFoundErrorを返却する。",""
"リクエストパラメータから以下の情報を取得する。

・グループID（groupId）
・追加可能証明書ID（docId）
・ユーザ名（userName）",""
"issuerテーブルに、指定されたグループIDと一致する情報が存在するか確認する。

存在しない場合はInvalidParamsErrorを返却する。","テーブル：issuer"
"追加可能証明書情報テーブル、issuerテーブル及び追加可能証明書対象者情報テーブルから、以下の条件に一致する証明書情報を取得する。

■検索条件（AND）
・追加可能証明書情報のグループID：指定されたgroupId
・追加可能証明書ID：指定されたdocId
・対象者のユーザID：指定されたuserName
・追加可能証明書情報のCredential Offer URL：NULL
・追加可能証明書情報とissuer情報のグループIDが一致すること
・追加可能証明書情報と対象者情報の追加可能証明書ID及びグループIDが一致すること

■取得情報
・追加可能証明書情報
・Issuer名
・対象者のユーザID

対象情報が存在しない場合はInvalidParamsErrorを返却する。","テーブル：
・add_cert
・issuer
・add_cert_user"
"取得した追加可能証明書情報の証明書情報（vc_info）をJSON形式に変換し、Credential Offer作成用Payloadを取得する。",""
"Credential Offer発行時にCredential Status Webhook用の情報を設定する。

Credential IDをUUID形式で生成し、設定ファイルからCredential Status Webhook URLを取得する。

■Webhook URLのクエリパラメータ
・type：取得した追加可能証明書情報の証明書タイプ
・issuerDid：Payloadに指定されたIssuer DID。未指定の場合は追加可能証明書情報に登録されたIssuer DID
・credentialId：生成したCredential ID

■Mappingの設定内容
・id：生成したCredential ID
・credentialStatus：「<webhook-json:URL>」形式の値

取得したPayloadの既存Mappingを保持し、id及びcredentialStatusを設定する。","Webhook URLは設定ファイルから取得する。"
"walt.id Issuer2 APIにCredential Offerの作成を要求する。

■エンドポイント
POST /issuer2/credential-offers

■リクエストボディ
・profileId：登録済みPayloadのCredential Profile ID
・authMethod：登録済みPayloadの認証方式
・valueMode：BY_REFERENCE
・runtimeOverrides：Credential Data、Mapping等の上書き情報

■レスポンス
・credentialOffer：Credential Offer URL
・offerId：Offer ID

レスポンスからCredential Offer URLを取得する。

Credential Offer URLが取得できない場合はエラーを返却する。",""
"Credential Offer作成成功後、追加可能証明書情報テーブルの対象レコードを更新する。

■更新条件
・追加可能証明書ID：指定されたdocId

■更新内容
・証明書情報（vc_info）：Credential Status Webhook情報を設定したPayloadをJSON文字列に変換した値","テーブル：add_cert"
"発行結果として以下の情報を設定し、成功レスポンスを返却する。

■返却情報
・url：発行されたCredential Offer URL
・docId：指定された追加可能証明書ID",""
"処理中にエラーが発生した場合は、エラー情報をログに出力し、例外を上位処理に通知する。","エラーレスポンスへの変換は共通エラー処理に従う。"
