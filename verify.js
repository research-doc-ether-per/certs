
"処理内容","備考"
"個人ユーザ専用API認証処理を実施する。","共通処理「個人ユーザ専用API認証」参照"
"パラメータの必須チェックを実施する。

以下の場合はエラーを返却する。
・必須情報が存在しない場合：RequireParamsNotFoundError",""
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
"issuerテーブルにグループIDが一致する情報が存在するか確認する。

存在しない場合はInvalidParamsErrorを返却する。
存在する場合は以降の処理を継続する。",""
"設定ファイルからデフォルトIssuer情報を取得する。

・issuerKey
・issuerDid

デフォルトIssuer情報がnullまたは空オブジェクトの場合は、issuerKey及びissuerDidをnullとして扱う。

Issuer情報が指定されていない場合は、Credential Profileに定義されたIssuer情報を利用する。",""
"リクエストで指定された認証方式をwalt.id形式に変換する。

Issuer2 ServiceのconvertToWaltidAuthMethodを呼び出す。

対応する認証方式に変換できない場合はエラーを返却する。","認証方式の変換はissueCredentialOfferUrlで実施する。"
"Credential Profile及び証明書設定情報を取得し、検証する。

Issuer2 ServiceのvalidateCredentialProfileを呼び出す。

指定パラメータ：
・credentialConfigurationId
・type

Credential Profile及びCredential Issuer Metadataを取得する。

以下の内容を確認する。
・Credential Configuration IDに一致するProfileが存在すること
・Credential Issuer Metadataに対象Configurationが存在すること
・ProfileのCredential Configuration IDが指定値と一致すること
・Metadataのformatがサポート対象であること
・Credential Configuration IDの末尾とformatが一致すること
・指定されたtypeがCredential Configuration IDの証明書タイプと一致すること
・指定されたtypeがMetadataから取得した証明書タイプと一致すること

JWT VCの場合：
credential_definition.typeの最後の要素から証明書タイプを取得する。
ProfileのcredentialData.typeの最後の要素との一致も確認する。

SD-JWT VCの場合：
vctの最後の「/」以降から証明書タイプを取得する。

検証結果として以下の情報を取得する。
・Credential Profile
・証明書タイプ（type）
・証明書フォーマット（format）
・Credential Metadata（credentialMetadata）

検証に失敗した場合はエラーを返却する。","Issuer2 ServiceのvalidateCredentialProfileを使用する。

Credential Configuration IDの例：
Awards_jwt_vc_json
Awards_dc+sd-jwt"
"Credential Metadataのclaimsから、有効期限（expirationDate）のPathを取得する。

取得したPathに従って、リクエストのcredentialDataから有効期限を取得する。

有効期限の指定有無を確認する。","getClaimPathByKey及びgetValueByPathを使用する。"
"有効期限を確認し、発行日時を取得する。

有効期限が指定されている場合：
・指定された有効期限のフォーマットを取得する。
・有効期限のフォーマットに合わせて現在日時を取得する。
・有効期限が発行日時以前の場合はInvalidParamsErrorを返却する。

有効期限が指定されていない場合：
・現在日時を発行日時として取得する。

取得情報：
・issuanceDate
・expirationDate","prepareCredentialDatesを使用する。

有効期限が明示的に指定されていない場合、Credential ProfileのデフォルトMappingを保持する。"
"証明書フォーマットをCloud Wallet形式に変換する。

Issuer2 ServiceのconvertToCloudWalletFormatを呼び出す。

変換内容：
・jwt_vc_json → jwt_vc_json
・dc+sd-jwt → vc+sd-jwt

未対応のフォーマットの場合はエラーを返却する。","Cloud WalletのDB登録用フォーマットとして使用する。"
"状態リストテーブルから対象の状態リスト情報を確認する。

検索条件：
・グループID：指定されたgroupId
・証明書タイプ：検証済みのtype

対象の状態リストが存在する場合：
・作成済みとして扱う。
・新規作成を行わない。

対象の状態リストが存在しない場合：
・既存のStatus List作成処理を呼び出す。
・取得したStatus List URLを保持する。","prepareStatusListUrlを使用する。

新規作成時は既存のcreateBSL処理を使用する。"
"DBトランザクションを開始する。","★トランザクション開始"
"状態リストが未登録の場合、状態リストテーブルに情報を登録する。

登録情報：
・グループID：指定されたgroupId
・証明書タイプ：検証済みのtype
・状態リストURL：取得したstatusListUrl

状態リストが登録済みの場合は登録処理を実施しない。","registerStatusListを使用する。"
"追加可能証明書情報テーブルに証明書情報を登録し、追加可能証明書IDを取得する。

登録情報：
・グループID：指定されたgroupId
・カテゴリ：指定されたcategory
・証明書情報：空文字
・Credential Offer URL：空文字
・Issuer DID：設定ファイルから取得したissuerDid
・証明書タイプ：検証済みのtype
・証明書フォーマット：Cloud Wallet形式に変換したformat
・認証方式：リクエストで指定されたauthenticationMethodを小文字に変換した値
・証明書名：指定されたcertName

登録結果から追加可能証明書ID（docId）を取得する。","テーブル：add_cert

issuerDidがnullの場合のDB登録可否は既存のDB制約に従う。"
"Credential Offer用のPayloadを準備する。

prepareCredentialOfferPayloadを呼び出す。

指定情報：
・Credential Profile
・Credential Metadata
・変換済み認証方式（authMethod）
・リクエストの証明書情報（offerData）
・発行日時（issuanceDate）
・有効期限（expirationDate）
・有効期限の指定有無（expirationDateSpecified）
・追加可能証明書ID（docId）
・検証済み証明書タイプ（type）
・Issuer DID（issuerDid）
・Issuer Key（issuerKey）

Credential ProfileのcredentialDataを基準として、リクエストのcredentialDataを再帰的に統合する。

Profileに定義されていない項目についても、リクエストに指定されている場合はCredential Dataに追加する。","prepareCredentialOfferPayloadを使用する。

Credential Profileの定義を基本とし、必要な情報のみ上書きする。"
"Credential Metadataのclaimsに定義されたPathに従い、Credential Dataを設定する。

対象項目：
・証明書タイプ（type）
・追加可能証明書ID（docId）
・発行日時（issuanceDate）
・有効期限（expirationDate）
・証明書画像（image）

発行日時：
・指定されたPathに発行日時を設定する。
・対応するProfileの動的Mappingを削除する。

有効期限：
・明示的に有効期限が指定された場合は指定されたPathに設定する。
・明示的に無期限が指定された場合は対象Pathの値を削除する。
・有効期限が指定されていない場合はProfileのデフォルト設定を保持する。

追加可能証明書ID：
・MetadataにdocIdのPathが存在する場合は取得したdocIdを設定する。

証明書タイプ：
・Metadataに対応する業務項目のPathが存在する場合は値を設定する。
・JWT VCのトップレベルtype配列を文字列で上書きしない。

証明書画像：
・リクエストの画像、Profileの画像、デフォルト画像の順で取得する。
・画像が存在し、MetadataにPathが定義されている場合は設定する。","既存の以下のメソッドを使用する。
・getClaimPathByKey
・getValueByPath
・setValueByPath
・deleteValueByPath

発行日時及び有効期限以外のProfile Mappingは原則として保持する。"
"Credential ProfileのMappingを取得し、Credential Status Webhook用の情報を設定する。

設定ファイルからWebhook URLを取得する。

Credential IDをUUID形式で生成する。

Webhook URLに以下のクエリパラメータを設定する。
・type：検証済みの証明書タイプ
・issuerDid：指定されたIssuer DIDまたはProfileのIssuer DID
・credentialId：生成したCredential ID

Profileの既存Mappingを保持したまま、以下を設定する。
・id：生成したCredential ID
・credentialStatus：Webhook URLを使用する動的Mapping

Credential Status Webhookは毎回設定し、利用有無のFlag判定は行わない。","prepareCredentialStatusMappingを使用する。

Webhook URLはcommonIssuerServiceの設定ファイルから取得する。

Profileのissuer及びcredentialSubject等のMappingは保持する。"
"Credential Offer作成用Payloadを生成する。

設定情報：
・profileId：取得したCredential ProfileのID
・authMethod：変換済みの認証方式
・credentialData：統合及び編集したCredential Data
・mapping：Credential Status Webhook等を設定したMapping

ProfileにselectiveDisclosureが定義されている場合は、その設定をPayloadに含める。

issuerDid及びissuerKeyが指定されている場合は、ランタイム上書き用の情報としてPayloadに含める。

valueModeはPayloadに指定せず、Issuer2 Serviceのデフォルト値を使用する。","valueModeのデフォルト値：BY_REFERENCE

Issuer2 Service内のCREDENTIAL_OFFER_VALUE_MODESで管理する。"
"walt.id Issuer2 APIを呼び出し、Credential Offerを作成する。

Issuer2 ServiceのcreateCredentialOfferを呼び出す。

エンドポイント：
POST /issuer2/credential-offers

リクエストの主な情報：
・profileId
・authMethod
・valueMode：BY_REFERENCE
・runtimeOverrides：指定されたCredential Data、Mapping及びその他の上書き情報

レスポンスから以下を取得する。
・Credential Offer URL（credentialOffer）
・Offer ID（offerId）

取得したcredentialOfferをCredential Offer URLとして保持する。

Credential Offer URLを取得できない場合はエラーを返却する。","旧APIの以下の呼び出しは使用しない。
・POST /openid4vc/jwt/issue
・POST /openid4vc/sdjwt/issue

JWT VC及びSD-JWT VCは共通のIssuer2 APIで作成する。"
"Credential Offer Endpoint URLが指定されている場合、Credential Offer Endpoint管理テーブルから対象情報を取得する。

検索条件：
・グループID：指定されたgroupId
・Credential Offer Endpoint URL：指定されたendpointUrl

取得情報：
・Credential Offer EndpointのURL
・Credential Offer Endpointの表示名

対象情報が取得できない場合はエラーを返却する。","既存のgetCredentialOfferEndpointsを使用する。

グループIDがallの設定も参照する既存の検索処理を維持する。"
"Credential Offer Endpoint URLが指定されている場合、発行されたCredential Offer URLのクエリ文字列を取得する。

指定されたCredential Offer Endpoint URLにクエリ文字列を付加し、Credential Offer Endpointを生成する。

生成結果として以下を保持する。
・Credential Offer Endpointの表示名
・Credential Offer Endpoint URL

Credential Offer Endpoint URLが指定されていない場合は、Endpointを生成しない。","発行されたCredential Offer URLのクエリ文字列を使用する。

旧仕様のDRAFT13固有URL構造を前提とした処理は使用しない。"
"追加可能証明書情報テーブルの対象レコードを更新する。

更新条件：
・追加可能証明書ID：取得したdocId

更新内容：
・credential_offer_url：発行されたCredential Offer URL
・vc_info：Credential Offer作成時に使用したPayloadをJSON文字列に変換した値
・credential_offer_endpoint：生成されたCredential Offer Endpoint URL

Endpointが生成されていない場合はnullを設定する。","テーブル：add_cert"
"リクエストで指定された対象者ごとに、追加可能証明書対象者情報テーブルへ登録する。

登録情報：
・追加可能証明書ID：取得したdocId
・グループID：指定されたgroupId
・ユーザID：指定された対象者ID

対象者が複数存在する場合は、対象者ごとに登録する。","テーブル：add_cert_user"
"DBトランザクションを終了する。","★トランザクション終了"
"発行結果を設定し、成功レスポンスを返却する。

返却情報：
・url：発行されたCredential Offer URL
・docId：追加可能証明書ID
・endpoint：Credential Offer Endpoint情報",""
"処理中に例外が発生した場合は、エラーログを出力し、例外を上位処理に通知する。

DBトランザクション内の処理でエラーが発生した場合は、DBトランザクションをロールバックする。

なお、Issuer2 APIによって作成済みのCredential Offerは、Cloud WalletのDBロールバック対象外とする。","例外発生時のエラーレスポンス変換は既存の共通エラー処理に従う。"
