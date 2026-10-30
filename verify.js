
"処理内容","備考"
"個人ユーザ専用API認証処理を実施する。","共通処理「個人ユーザ専用API認証」参照"
"リクエストパラメータの必須チェックを実施する。

必須情報が存在しない場合は、RequireParamsNotFoundErrorを返却する。",""
"リクエストパラメータから以下の情報を取得する。

・グループID
・発行する証明書の情報
・追加可能証明書カテゴリ
・対象者
・証明書名
・Credential Offer Endpoint URL

発行する証明書の情報から以下を取得する。
・Credential Configuration ID
・Credential Data
・認証方式
・証明書タイプ",""
"issuerテーブルに、指定されたグループIDと一致する情報が存在するか確認する。

存在しない場合はInvalidParamsErrorを返却する。
存在する場合は以降の処理を継続する。",""
"設定ファイルから以下のデフォルトIssuer情報を取得する。

・Issuer Key
・Issuer DID

デフォルトIssuer情報が未設定または空の場合は、Issuer Key及びIssuer DIDを未指定として扱う。

Issuer情報が未指定の場合は、Credential Profileに定義されたIssuer情報を使用する。",""
"リクエストで指定された認証方式を、walt.id Issuer2 APIで使用する認証方式に変換する。

事前認可方式の場合：
・PRE_AUTHORIZEDを指定する。

認可コード方式の場合：
・AUTHORIZEDを指定する。

対応していない認証方式が指定された場合はエラーを返却する。","認証方式の変換はCloud Walletとwalt.idの対応定義に従う。"
"walt.id Issuer2 APIから、指定されたCredential Configuration IDに対応するCredential Profileを取得する。

Credential Profileが存在しない場合、または同一のCredential Configuration IDに対応するProfileを一意に特定できない場合はエラーを返却する。

取得したProfileのCredential Configuration IDが指定値と一致することを確認する。","Credential Profile取得先：
GET /issuer2/profiles"
"walt.id Issuer2 APIからCredential Issuer Metadataを取得する。

Credential Issuer Metadataのcredential_configurations_supportedから、指定されたCredential Configuration IDに対応する証明書設定情報を取得する。

対象の証明書設定情報が存在しない場合はエラーを返却する。","Credential Issuer Metadata取得先：
GET /.well-known/openid-credential-issuer/openid4vci"
"取得した証明書設定情報からフォーマットを取得し、Credential Configuration IDと一致することを確認する。

対象フォーマット：
・JWT VC：jwt_vc_json
・SD-JWT VC：dc+sd-jwt

Credential Configuration IDの末尾が「_」と取得したフォーマットを連結した値と一致することを確認する。

フォーマットが未対応の場合、またはCredential Configuration IDと一致しない場合はエラーを返却する。","Credential Configuration IDの例：
Awards_jwt_vc_json
Awards_dc+sd-jwt"
"Credential Issuer Metadataから証明書タイプを取得する。

JWT VCの場合：
・credential_definition.typeの最後の要素を証明書タイプとして取得する。
・Credential ProfileのcredentialData.typeの最後の要素が取得した証明書タイプと一致することを確認する。

SD-JWT VCの場合：
・vctの最後の「/」以降の値を証明書タイプとして取得する。

Credential Configuration IDからフォーマット部分を除いた値が、取得した証明書タイプと一致することを確認する。

リクエストで証明書タイプが指定されている場合は、取得した証明書タイプと一致することを確認する。

一致しない場合、または証明書タイプを取得できない場合はエラーを返却する。","証明書タイプの例：
Awards

JWT VCとSD-JWT VCで証明書タイプの取得元が異なる。"
"検証済みの証明書設定情報として以下を保持する。

・Credential Profile
・証明書タイプ
・証明書フォーマット
・Credential Metadata

Credential Metadataは、対象の証明書設定情報に定義されたcredential_metadataから取得する。",""
"Credential Metadataのclaimsから、有効期限に該当する項目のPathを取得する。

取得したPathに従って、リクエストのCredential Dataから有効期限を取得する。

対象のPathが存在しない場合は、有効期限を取得しない。

また、有効期限がリクエストに明示的に指定されているか確認する。","Pathの最終要素がexpirationDateに一致する項目を対象とする。"
"発行日時及び有効期限を準備する。

有効期限が指定されている場合：
・指定された有効期限のフォーマットを取得する。
・同じフォーマットで現在日時を取得し、発行日時とする。
・有効期限が発行日時以前の場合はInvalidParamsErrorを返却する。

有効期限が指定されていない場合：
・現在日時を発行日時として取得する。

取得した発行日時及び有効期限を以降の処理に使用する。","有効期限がリクエストに明示的に指定されていない場合、Credential Profileのデフォルト有効期限設定を保持する。"
"取得した証明書フォーマットをCloud Walletで使用するフォーマットに変換する。

JWT VCの場合：
・jwt_vc_jsonを使用する。

SD-JWT VCの場合：
・dc+sd-jwtをvc+sd-jwtに変換する。

変換後のフォーマットを追加可能証明書情報テーブルへの登録に使用する。

対応していないフォーマットの場合はエラーを返却する。",""
"状態リストテーブルから、以下の条件に一致する状態リスト情報が存在するか確認する。

検索条件：
・グループID：指定されたグループID
・証明書タイプ：検証済みの証明書タイプ

状態リスト情報が存在する場合は、新規作成を行わない。

存在しない場合は、対象証明書タイプの状態リストを新規作成し、取得した状態リストURLを保持する。","既存の状態リスト管理処理を継続する。"
"DBトランザクションを開始する。","★トランザクション開始"
"状態リストが未登録の場合、状態リストテーブルに以下の情報を登録する。

・グループID：指定されたグループID
・証明書タイプ：検証済みの証明書タイプ
・状態リストURL：取得した状態リストURL

状態リストが登録済みの場合は、登録処理を実施しない。",""
"追加可能証明書情報テーブルに以下の情報を登録する。

・追加可能証明書ID：自動採番されたID
・グループID：指定されたグループID
・カテゴリ：指定された追加可能証明書カテゴリ
・証明書情報：空文字
・Credential Offer URL：空文字
・Issuer DID：設定ファイルから取得したIssuer DID
・証明書タイプ：検証済みの証明書タイプ
・証明書フォーマット：Cloud Wallet形式に変換したフォーマット
・認証方式：リクエストで指定された認証方式を小文字に変換した値
・証明書名：指定された証明書名

登録結果から追加可能証明書IDを取得する。","テーブル：add_cert"
"Credential Offerに使用するCredential Dataを準備する。

取得したCredential ProfileのcredentialDataを基準として、リクエストで指定されたcredentialDataを統合する。

同一項目が存在する場合は、リクエストで指定された値を優先する。

オブジェクト形式の項目は、階層構造を保持したまま再帰的に統合する。

Credential Profileに定義されていない項目についても、リクエストに指定されている場合は追加する。

リクエストに指定されていないProfileの既存項目は保持する。","Credential Profileの定義を基本とし、必要な情報のみ上書きする。"
"Credential Metadataのclaimsから、以下の項目に対応するPathを取得する。

・証明書タイプ（type）
・追加可能証明書ID（docId）
・発行日時（issuanceDate）
・有効期限（expirationDate）
・証明書画像（image）

各Pathの最終要素が対象項目名と一致する情報を取得する。

対象のPathが存在しない場合は、その項目に対するPath指定の設定処理を実施しない。",""
"発行日時をCredential Dataに設定する。

発行日時のPathが取得できた場合：
・取得したPathに従って、準備した発行日時を設定する。
・Credential Profileの発行日時に対応する動的Mappingを削除する。

発行日時のPathが取得できない場合は、Credential Profileの既存設定を保持する。","発行日時の動的Mappingを変更する場合は、対応する発行日時の設定のみを対象とする。"
"有効期限をCredential Dataに設定する。

有効期限が明示的に指定され、Pathが取得できた場合：
・有効期限が存在する場合は、取得したPathに従って設定する。
・無期限が明示的に指定された場合は、対象Pathの有効期限を削除する。
・Credential Profileの有効期限に対応する動的Mappingを削除する。

有効期限が明示的に指定されていない場合：
・Credential Profileの既存設定及び動的Mappingを保持する。",""
"追加可能証明書IDをCredential Dataに設定する。

Credential MetadataにdocIdのPathが存在する場合は、取得した追加可能証明書IDを指定されたPathに設定する。

docIdのPathが存在しない場合は、追加可能証明書IDの設定を行わない。",""
"証明書タイプをCredential Dataに設定する。

Credential Metadataに業務項目としてのtypeのPathが存在する場合は、検証済みの証明書タイプに対応する値を設定する。

JWT VCのトップレベルtypeは証明書の種類を表す配列として保持し、業務項目の文字列で上書きしない。",""
"証明書画像をCredential Dataに設定する。

以下の優先順位で画像データを取得する。
・リクエストで指定された証明書画像
・Credential Profileに定義された証明書画像
・設定ファイルに定義されたデフォルト証明書画像

画像が取得でき、Credential MetadataにimageのPathが存在する場合は、指定されたPathに画像データを設定する。

画像が取得できない場合は、画像の追加処理を行わない。","デフォルト証明書画像は設定ファイルに定義された画像データから取得する。"
"Credential Profileに定義されたMappingを取得する。

以下の項目以外については、Profileの既存Mappingを保持する。

・id
・issuanceDate
・expirationDate

発行日時及び有効期限に対する動的Mappingは、Credential Dataへの明示的な設定内容に応じて必要な場合のみ変更する。

Issuer DID及びCredential Subject DID等の既存Mappingは保持する。","Profileに定義された動的Mappingを基本として使用する。"
"Credential Status Webhook用の情報を設定する。

Credential IDをUUID形式で生成する。

設定ファイルからCredential Status Webhook URLを取得する。

Webhook URLに以下のクエリパラメータを設定する。
・type：検証済みの証明書タイプ
・issuerDid：指定されたIssuer DID。未指定の場合はCredential ProfileのIssuer DID
・credentialId：生成したCredential ID

取得したWebhook URLを動的データ取得用の形式に変換する。

Credential ProfileのMappingに以下の情報を設定する。
・id：生成したCredential ID
・credentialStatus：Webhookによる動的データ取得情報

その他のMappingは保持する。

Credential Status WebhookはすべてのCredential Offerに設定する。","Webhook URLは設定ファイルから取得する。

Credential Status Webhookの利用有無による分岐処理は行わない。"
"Credential Offer作成用のリクエスト情報を生成する。

以下の情報を設定する。
・Credential Profile ID：取得したProfileのID
・認証方式：walt.id形式に変換した認証方式
・Credential Data：統合及び編集したCredential Data
・Mapping：Credential Status Webhook等を設定したMapping

Credential ProfileにSelective Disclosureが定義されている場合は、その情報を設定する。

Issuer DID及びIssuer Keyが指定されている場合は、Profileの設定を上書きする情報として設定する。

Issuer DID及びIssuer Keyが未指定の場合は、Profileの既存設定を使用する。

Credential OfferのValue ModeにはBY_REFERENCEを使用する。","Selective DisclosureはCredential Profileの定義を使用する。"
"walt.id Issuer2 APIにCredential Offer作成を要求する。

エンドポイント：
POST /issuer2/credential-offers

リクエストには以下の情報を指定する。
・Credential Profile ID
・認証方式
・Value Mode：BY_REFERENCE
・Credential Data及びMapping等の上書き情報

レスポンスからCredential Offer URL及びOffer IDを取得する。

取得したCredential Offer URLを以降の処理に使用する。

Credential Offer URLが取得できない場合はエラーを返却する。","JWT VC及びSD-JWT VCは同一のIssuer2 APIで作成する。"
"Credential Offer Endpoint URLが指定されている場合、Credential Offer Endpoint管理テーブルから該当する情報を取得する。

検索条件：
・グループID：指定されたグループID
・Credential Offer Endpoint URL：指定されたEndpoint URL

取得情報：
・Credential Offer Endpoint URL
・Credential Offer Endpointの表示名

対象情報が存在しない場合はエラーを返却する。

Credential Offer Endpoint URLが指定されていない場合は、本処理を実施しない。","グループ共通設定を含む既存の検索条件に従う。"
"Credential Offer Endpoint URLが指定されている場合、発行されたCredential Offer URLからクエリ文字列を取得する。

取得したクエリ文字列を指定されたCredential Offer Endpoint URLに付加し、Credential Offer Endpointを生成する。

生成結果として以下の情報を保持する。
・Credential Offer Endpointの表示名
・Credential Offer Endpoint URL",""
"追加可能証明書情報テーブルの対象レコードを更新する。

更新条件：
・追加可能証明書ID：取得した追加可能証明書ID

更新内容：
・Credential Offer URL：発行されたCredential Offer URL
・証明書情報：Credential Offer作成時に指定したリクエスト情報をJSON文字列に変換した値
・Credential Offer Endpoint：生成したCredential Offer Endpoint URL

Credential Offer Endpointが生成されていない場合はnullを設定する。","テーブル：add_cert"
"リクエストで指定された対象者ごとに、追加可能証明書対象者情報テーブルに情報を登録する。

登録情報：
・追加可能証明書ID：取得した追加可能証明書ID
・グループID：指定されたグループID
・ユーザID：指定された対象者ID

対象者が複数の場合は、対象者ごとに登録する。","テーブル：add_cert_user"
"DBトランザクションを終了する。","★トランザクション終了"
"発行結果として以下の情報を設定し、成功レスポンスを返却する。

・Credential Offer URL
・追加可能証明書ID
・Credential Offer Endpoint情報",""
"処理中にエラーが発生した場合は、エラー情報をログに出力し、上位処理に通知する。

DBトランザクション中にエラーが発生した場合は、DBの登録・更新処理をロールバックする。

ただし、walt.id Issuer2 APIで作成済みのCredential OfferはDBロールバックの対象外とする。","エラーレスポンスは共通エラー処理に従う。"
