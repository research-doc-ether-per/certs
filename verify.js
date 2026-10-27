プロパティ,子プロパティ,詳細プロパティ,説明,型,必須
[credential_configuration_id],,,walt.id Issuer側で定義された発行可能な証明書のConfiguration ID。IDごとに証明書情報が格納される。,object,○
format,,,証明書のフォーマット種別。例：jwt_vc_json、dc+sd-jwt,string,○
scope,,,証明書発行要求時に使用するOAuth 2.0のスコープ。,string,△
credential_definition,,,証明書の定義情報。証明書タイプなどを指定する。,object,△
,type,,証明書のタイプ一覧。,Array<string>,△
credential_signing_alg_values_supported,,,証明書の署名に使用可能なアルゴリズムの一覧。,Array<string>,△
cryptographic_binding_methods_supported,,,証明書とHolderの暗号鍵を紐付けるためにサポートされるバインディング方式の一覧。,Array<string>,△
proof_types_supported,,,証明書発行要求時にサポートされるProofの種類と設定情報。,object,△
,jwt,,JWT形式のProofに関する設定情報。,object,△
,,proof_signing_alg_values_supported,JWT Proofの署名に使用可能なアルゴリズムの一覧。,Array<string>,△
credential_metadata,,,証明書の表示情報やクレーム定義などのメタデータ。,object,△
,display,,証明書の表示名・説明・言語などの表示情報の一覧。,Array<object>,△
,claims,,証明書に含まれるクレームの定義情報の一覧。,Array<object>,△
vct,,,SD-JWT VCのCredential Typeを示す識別子。,string,△
doctype,,,mdoc形式の証明書タイプを示す識別子。,string,△
profileId,,,証明書発行時に使用するCredential ProfileのID。,string,○
name,,,Credential Profileの名称。,string,○
credentialData,,,証明書発行時に使用するCredentialデータのテンプレート。,object,○
selectiveDisclosure,,,SD-JWT VC発行時の選択的開示に関する設定情報。,object / null,△
mapping,,,証明書発行時に適用する動的データのマッピング設定。,object / null,△



  walt.id Issuer APIから発行可能な証明書のProfile一覧およびMetadata情報を取得し、統合した証明書情報を返却する。

① Credential Profile一覧を取得する。

エンドポイント：/issuer2/profiles  
メソッド：GET  
クエリパラメータ：なし

② Credential Issuer Metadataを取得する。

エンドポイント：/.well-known/openid-credential-issuer/openid4vci  
メソッド：GET  
クエリパラメータ：なし

③ 取得したCredential Profile一覧とCredential Issuer Metadataを統合する。

- Credential Profileの「credentialConfigurationId」をキーとして、Metadataの「credential_configurations_supported」から対応する証明書情報を取得する。
- Metadataの証明書情報に、Profileの「profileId」「name」「credentialData」「selectiveDisclosure」「mapping」を追加する。
- Metadataに対応する証明書情報が存在しない場合は、空のオブジェクトとして扱う。
- 「credentialConfigurationId」をキーとしたオブジェクトに統合する。

④ 統合した証明書情報を成功レスポンスとして返却する。

※処理中にエラーが発生した場合、InternalServerErrorを返却する。
