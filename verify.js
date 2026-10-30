
"処理内容","備考"
"個人ユーザ専用API認証処理を実施する。","共通処理「個人ユーザ専用API認証」参照"
"リクエストパラメータの必須チェックを実施する。

必須情報が存在しない場合は、RequireParamsNotFoundErrorを返却する。",""
"リクエストパラメータから以下の情報を取得する。

・グループID（groupId）
・発行する証明書の情報（offerData）
・追加可能証明書カテゴリ（category）
・対象者（targets）
・証明書名（certName）
・Credential Offer Endpoint URL（endpointUrl）

発行する証明書の情報から以下を取得する。

・Credential Configuration ID（credentialConfigurationId）
・Credential Data（credentialData）
・認証方式（authenticationMethod）
・証明書タイプ（type）",""
"issuerテーブルに、指定されたグループIDと一致する情報が存在するか確認する。

・存在しない場合：InvalidParamsErrorを返却する。
・存在する場合：以降の処理を継続する。","テーブル：issuer"
"設定ファイルからデフォルトIssuer情報を取得する。

■取得情報
・Issuer Key（issuerKey）
・Issuer DID（issuerDid）

デフォルトIssuer情報がnullまたは空オブジェクトの場合は、Issuer Key及びIssuer DIDをnullとして扱う。

Issuer Key及びIssuer DIDが指定されていない場合は、Credential Profileに定義されたIssuer情報を使用する。",""
"リクエストで指定された認証方式を、walt.id Issuer2 APIで使用する認証方式に変換する。

■変換内容
・事前認可方式：PRE_AUTHORIZED

対応していない認証方式が指定された場合はエラーを返却する。",""
"walt.id Issuer2 APIからCredential Profileの一覧を取得する。

■エンドポイント
GET /issuer2/profiles

取得したCredential Profileの一覧から、指定されたCredential Configuration IDと一致する情報を検索する。

■確認内容
・対象のCredential Profileが存在すること。
・対象のCredential Profileを一意に特定できること。
・取得したCredential ProfileのCredential Configuration IDが指定値と一致すること。

対象のCredential Profileが存在しない場合、複数存在する場合、またはCredential Configuration IDが一致しない場合はエラーを返却する。",""
"walt.id Issuer2 APIからCredential Issuer Metadataを取得する。

■エンドポイント
GET /.well-known/openid-credential-issuer/openid4vci

取得したMetadataのcredential_configurations_supportedから、指定されたCredential Configuration IDに対応する証明書設定情報を取得する。

対象の証明書設定情報が存在しない場合はエラーを返却する。",""
"取得した証明書設定情報から証明書フォーマットを取得する。

■対応フォーマット
・JWT VC：jwt_vc_json
・SD-JWT VC：dc+sd-jwt

Credential Configuration IDの末尾が「_」と取得したフォーマットを連結した値と一致することを確認する。

■エラー条件
・取得したフォーマットが未対応の場合
・Credential Configuration IDとフォーマットが一致しない場合

上記の場合はエラーを返却する。","Credential Configuration IDの例：
・Awards_jwt_vc_json
・Awards_dc+sd-jwt"
"Credential Issuer Metadataから証明書タイプを取得する。

■JWT VCの場合
・credential_definition.typeの最後の要素を証明書タイプとして取得する。
・Credential ProfileのcredentialData.typeの最後の要素が、取得した証明書タイプと一致することを確認する。

■SD-JWT VCの場合
・vctの最後の「/」以降の値を証明書タイプとして取得する。

Credential Configuration IDからフォーマット部分を除いた値が、取得した証明書タイプと一致することを確認する。

リクエストで証明書タイプが指定されている場合は、取得した証明書タイプと一致することを確認する。

■エラー条件
・証明書タイプを取得できない場合
・Credential Configuration IDと証明書タイプが一致しない場合
・リクエストで指定された証明書タイプと一致しない場合
・JWT VCのProfileに定義された証明書タイプと一致しない場合

上記の場合はエラーを返却する。","証明書タイプの例：Awards"
"検証済みの証明書設定情報として以下を保持する。

■取得情報
・Credential Profile
・証明書タイプ（type）
・証明書フォーマット（format）
・Credential Metadata（credentialMetadata）

Credential Metadataは、対象の証明書設定情報に定義されたcredential_metadataから取得する。",""
"Credential Metadataのclaimsから、有効期限（expirationDate）に対応するPathを取得する。

各claimsに定義されたPathの最後の要素を確認し、expirationDateに一致するPathを取得する。

取得したPathに従って、リクエストのCredential Dataから有効期限を取得する。

■確認内容
・有効期限が指定されているか。
・有効期限が明示的にnullまたは空として指定されているか。

Pathが存在しない場合は、有効期限を取得しない。",""
"有効期限を確認し、発行日時を取得する。

■有効期限が指定されている場合
・指定された有効期限の日付フォーマットを取得する。
・同じフォーマットで現在日時を取得し、発行日時とする。
・有効期限が発行日時以前の場合はInvalidParamsErrorを返却する。

■有効期限が指定されていない場合
・現在日時を発行日時として取得する。

■取得情報
・発行日時（issuanceDate）
・有効期限（expirationDate）

有効期限が明示的に指定されていない場合は、Credential Profileのデフォルト有効期限設定を保持する。",""
"取得した証明書フォーマットをCloud Walletで使用するフォーマットに変換する。

■JWT VCの場合
・jwt_vc_jsonを使用する。

■SD-JWT VCの場合
・dc+sd-jwtをvc+sd-jwtに変換する。

変換後のフォーマットを追加可能証明書情報テーブルへの登録に使用する。

未対応のフォーマットの場合はエラーを返却する。",""
"状態リストテーブルから、以下の条件に一致する状態リスト情報が存在するか確認する。

■検索条件（AND）
・グループID：IssuerのグループID
・証明書タイプ：検証済みの証明書タイプ

■取得情報
・状態リストURL

■確認結果
・対象情報が存在する場合：新規作成を行わず、以降の処理を継続する。
・対象情報が存在しない場合：状態リストを新規作成する。","テーブル：status_list"
"状態リストが未登録の場合、VC Registry APIに状態リストの作成を要求する。

■エンドポイント
POST /issuers/{issuer_did}/bsl/issueCredential

■リクエストボディ
・証明書タイプ：検証済みの証明書タイプ

■レスポンス
状態リスト情報の配列を取得する。

・bslVcUrl：状態リストURL
・statusPurpose：状態リストの用途

■statusPurposeの値
・revocation：失効状態リスト
・suspension：停止状態リスト

失効状態リスト及び停止状態リストが返却された場合は、失効状態リストのURLを取得する。

■エラー処理
・409エラーの場合：登録済みとして扱い、処理を継続する。
・409以外のエラーの場合：エラーを返却する。

■主なエラー
・400：VdrBadRequestError
・401：VdrAuthenticationError
・403：VdrForbiddenError
・500：VdrInternalServerError
・502：VdrExternalServiceError
・503：VdrUnavailableError
・上記以外：InternalServerError","レスポンス例：
[
  {
    ""bslVcUrl"": ""https://example.com/status/Awards/revocation/1"",
    ""statusPurpose"": ""revocation""
  },
  {
    ""bslVcUrl"": ""https://example.com/status/Awards/suspension/1"",
    ""statusPurpose"": ""suspension""
  }
]"
"DBトランザクションを開始する。","★トランザクション開始"
"状態リストが未登録の場合、状態リストテーブルに以下の情報を登録する。

■登録情報
・グループID：IssuerのグループID
・証明書タイプ：検証済みの証明書タイプ
・状態リストURL：取得または作成した状態リストURL

状態リストが登録済みの場合は、登録処理を実施しない。","テーブル：status_list"
"追加可能証明書情報テーブルに以下の情報を登録する。

■登録情報
・グループID：指定されたグループID
・カテゴリ：指定された追加可能証明書カテゴリ
・証明書情報：空文字
・Credential Offer URL：空文字
・Issuer DID：設定ファイルから取得したIssuer DID
・証明書タイプ：検証済みの証明書タイプ
・証明書フォーマット：Cloud Wallet形式に変換したフォーマット
・認証方式：リクエストで指定された認証方式を小文字に変換した値
・証明書名：指定された証明書名

登録結果から、自動採番された追加可能証明書ID（docId）を取得する。","テーブル：add_cert"
"Credential Offer用のCredential Dataを準備する。

Credential ProfileのcredentialDataを基準として、リクエストで指定されたcredentialDataを統合する。

■統合条件
・同一項目が存在する場合は、リクエストで指定された値を優先する。
・オブジェクト形式の項目は、階層構造を保持したまま再帰的に統合する。
・Credential Profileに定義されていない項目でも、リクエストで指定されている場合は追加する。
・リクエストで指定されていないProfileの既存項目は保持する。",""
"Credential Metadataのclaimsから、以下の項目に対応するPathを取得する。

■対象項目
・証明書タイプ（type）
・追加可能証明書ID（docId）
・発行日時（issuanceDate）
・有効期限（expirationDate）
・証明書画像（image）

各Pathの最後の要素が対象項目名と一致する情報を取得する。

対応するPathが存在しない場合は、その項目に対するPath指定の設定処理を行わない。",""
"発行日時をCredential Dataに設定する。

■設定条件
・発行日時のPathが存在すること。
・発行日時が取得できていること。

■設定内容
・取得したPathに従って、準備した発行日時を設定する。
・Credential Profileの発行日時に対応する動的Mappingを削除する。

発行日時のPathが存在しない場合は、Credential Profileの既存設定を保持する。",""
"有効期限をCredential Dataに設定する。

■有効期限が明示的に指定されている場合
・有効期限のPathが存在することを確認する。
・有効期限が存在する場合は、取得したPathに従って設定する。
・無期限が明示的に指定された場合は、対象Pathの有効期限を削除する。
・Credential Profileの有効期限に対応する動的Mappingを削除する。

■有効期限が明示的に指定されていない場合
・Credential Profileの既存設定を保持する。
・有効期限の動的Mappingを保持する。",""
"追加可能証明書IDをCredential Dataに設定する。

Credential MetadataにdocIdのPathが存在する場合は、取得した追加可能証明書IDを指定されたPathに設定する。

対象のPathが存在しない場合は、追加可能証明書IDの設定を行わない。",""
"証明書タイプをCredential Dataに設定する。

Credential Metadataに業務項目としてのtypeのPathが存在する場合は、検証済みの証明書タイプに対応する値を指定されたPathに設定する。

JWT VCのトップレベルtypeは証明書の種類を表す配列として保持し、業務項目の文字列で上書きしない。",""
"証明書画像をCredential Dataに設定する。

■画像データの取得優先順位
・リクエストで指定された証明書画像
・Credential Profileに定義された証明書画像
・設定ファイルに定義されたデフォルト証明書画像

画像データが存在し、Credential MetadataにimageのPathが定義されている場合は、取得したPathに従って画像データを設定する。

画像データが存在しない場合は、画像の追加処理を行わない。",""
"Credential Profileに定義されたMappingを取得する。

Profileの既存Mappingを基本として使用し、必要な情報のみ変更する。

■変更対象
・id
・issuanceDate
・expirationDate

■保持対象
・Issuer DIDに関するMapping
・Credential Subject DIDに関するMapping
・その他のProfileに定義されたMapping

発行日時及び有効期限の動的Mappingは、Credential Dataへの設定内容に応じて必要な場合のみ削除する。

その他のMappingは保持する。",""
"Credential Status Webhook用の情報を設定する。

Credential IDをUUID形式で生成する。

設定ファイルからCredential Status Webhook URLを取得する。

Webhook URLに以下のクエリパラメータを設定する。

・type：検証済みの証明書タイプ
・issuerDid：設定ファイルから取得したIssuer DID。未指定の場合はCredential ProfileのIssuer DID
・credentialId：生成したCredential ID

■Mappingの設定内容
・id：生成したCredential ID
・credentialStatus：Webhook URLを使用する動的データ取得情報

credentialStatusには「<webhook-json:URL>」形式の値を設定する。

Profileのその他のMappingは保持する。

Credential Status WebhookはすべてのCredential Offerに設定する。","Webhook URLはCloud Walletの設定ファイルから取得する。"
"Credential Offer作成用のリクエスト情報を生成する。

■設定情報
・Credential Profile ID：取得したCredential ProfileのID
・認証方式：walt.id形式に変換した認証方式
・Credential Data：統合及び編集したCredential Data
・Mapping：Credential Status Webhook等を設定したMapping

Credential ProfileにSelective Disclosureが定義されている場合は、その設定を使用する。

Issuer DID及びIssuer Keyが指定されている場合は、Credential Profileの設定を上書きする情報として指定する。

Issuer DID及びIssuer Keyが未指定の場合は、Credential Profileの既存設定を使用する。

Credential OfferのValue ModeにはBY_REFERENCEを使用する。",""
"walt.id Issuer2 APIにCredential Offerの作成を要求する。

■エンドポイント
POST /issuer2/credential-offers

■リクエストボディ
・profileId：Credential Profile ID
・authMethod：変換済みの認証方式
・valueMode：BY_REFERENCE
・runtimeOverrides：Credential Data、Mapping等の上書き情報

■レスポンス
・credentialOffer：Credential Offer URL
・offerId：Offer ID

レスポンスからCredential Offer URLを取得し、以降の処理に使用する。

Credential Offer URLが取得できない場合はエラーを返却する。",""
"Credential Offer Endpoint URLが指定されている場合、Credential Offer Endpoint管理テーブルから以下の条件に一致する情報を取得する。

■検索条件
・グループID：指定されたグループID
・Credential Offer Endpoint URL：指定されたEndpoint URL

■取得情報
・Credential Offer EndpointのURL
・Credential Offer Endpointの表示名

対象情報が存在しない場合はエラーを返却する。

Credential Offer Endpoint URLが指定されていない場合は、本処理を実施しない。","グループ共通設定を含む検索条件に従う。"
"Credential Offer Endpoint URLが指定されている場合、発行されたCredential Offer URLからクエリ文字列を取得する。

取得したクエリ文字列を指定されたCredential Offer Endpoint URLに付加し、Credential Offer Endpointを生成する。

■生成情報
・Credential Offer Endpointの表示名
・Credential Offer Endpoint URL

Credential Offer Endpoint URLが指定されていない場合は、Endpoint情報を生成しない。",""
"追加可能証明書情報テーブルの対象レコードを更新する。

■更新条件
・追加可能証明書ID：取得した追加可能証明書ID

■更新内容
・Credential Offer URL：発行されたCredential Offer URL
・証明書情報：Credential Offer作成時に指定したリクエスト情報をJSON文字列に変換した値
・Credential Offer Endpoint：生成したCredential Offer Endpoint URL

Credential Offer Endpointが生成されていない場合は、nullを設定する。","テーブル：add_cert"
"リクエストで指定された対象者ごとに、追加可能証明書対象者情報テーブルに以下の情報を登録する。

■登録情報
・追加可能証明書ID：取得した追加可能証明書ID
・グループID：指定されたグループID
・ユーザID：指定された対象者ID

対象者が複数存在する場合は、対象者ごとに登録する。","テーブル：add_cert_user"
"DBトランザクションを終了する。","★トランザクション終了"
"発行結果として以下の情報を設定し、成功レスポンスを返却する。

■返却情報
・url：発行されたCredential Offer URL
・docId：追加可能証明書ID
・endpoint：Credential Offer Endpoint情報",""
"処理中にエラーが発生した場合は、エラー情報をログに出力し、例外を上位処理に通知する。

DBトランザクション内でエラーが発生した場合は、DBの登録・更新処理をロールバックする。

ただし、walt.id Issuer2 APIによって作成済みのCredential Offerは、Cloud WalletのDBロールバック対象外とする。","エラーレスポンスへの変換は共通エラー処理に従う。"
