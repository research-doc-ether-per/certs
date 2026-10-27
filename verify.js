
/**
 * 発行可能なCredential一覧とMetadata情報を取得する。
 */
const getIssuableCredentials = async (accessToken = null) => {
    logger.debug('*** getIssuableCredentials start ***')

    try {
        // Profile一覧とIssuer Metadataを取得する。
        const [profilesResponse, metadata] = await Promise.all([
            getCredentialProfiles(accessToken),
            getCredentialIssuerMetadata(accessToken)
        ])

        // Profile一覧を配列に変換する。
        const profiles = Array.isArray(profilesResponse)
            ? profilesResponse
            : Object.entries(profilesResponse).map(
                ([profileId, profile]) => ({
                    ...profile,
                    profileId
                })
            )

        const configurations =
            metadata.credential_configurations_supported || {}

        // credentialConfigurationIdをキーとして情報を統合する。
        const result = Object.fromEntries(
            profiles.map(profile => {
                const configurationId = profile.credentialConfigurationId
                const configuration = configurations[configurationId] || {}

                const {
                    format,
                    credential_definition,
                    vct,
                    credential_signing_alg_values_supported,
                    cryptographic_binding_methods_supported,
                    proof_types_supported,
                    credential_metadata
                } = configuration

                return [
                    configurationId,
                    {
                        format: format || null,
                        ...(credential_definition && {
                            credential_definition: {
                                type: credential_definition.type || []
                            }
                        }),
                        ...(vct && { vct }),
                        credential_signing_alg_values_supported:
                            credential_signing_alg_values_supported || [],
                        cryptographic_binding_methods_supported:
                            cryptographic_binding_methods_supported || [],
                        ...(proof_types_supported && {
                            proof_types_supported: {
                                ...(proof_types_supported.jwt && {
                                    jwt: {
                                        proof_signing_alg_values_supported:
                                            proof_types_supported.jwt
                                                .proof_signing_alg_values_supported || []
                                    }
                                })
                            }
                        }),
                        ...(credential_metadata && {
                            credential_metadata: {
                                claims: credential_metadata.claims || [],
                                display: credential_metadata.display || []
                            }
                        }),
                        profileId: profile.profileId,
                        name: profile.name,
                        credentialData: profile.credentialData || {},
                        selectiveDisclosure: profile.selectiveDisclosure || null,
                        mapping: profile.mapping || null
                    }
                ]
            })
        )

        return result
    } catch (error) {
        logger.error('error.message: ', error.message)
        logger.error('error.stack: ', error.stack)
        throw error
    } finally {
        logger.debug('*** getIssuableCredentials end ***')
    }
}



プロパティ,子プロパティ,詳細プロパティ,説明,型,必須
[credential_configuration_id],,,発行可能証明書ID。walt.id Issuer側で定義された「credential_configuration_id」ごとの証明書情報が指定される。,object,○
format,,,証明書のフォーマット種別が指定される。例：jwt_vc_json、dc+sd-jwt,string,○
scope,,,証明書の発行認可時に使用するOAuth 2.0のスコープが指定される。通常はcredential_configuration_idと同じ値が指定される。,string,△
credential_definition,,,JWT VC形式の証明書の定義情報が指定される。,object,△
,type,,証明書のタイプの一覧が指定される。例：VerifiableCredential、Awards,Array<string>,△
vct,,,SD-JWT VC形式の証明書タイプを示す識別子が指定される。,string,△
credential_signing_alg_values_supported,,,証明書署名に使用可能なアルゴリズムの一覧が指定される。,Array<string>,△
cryptographic_binding_methods_supported,,,サポートされているバインディング方式の一覧が指定される。証明書に紐づけ可能なDIDなどのバインディング方式が指定される。,Array<string>,△
proof_types_supported,,,証明書発行要求時にサポートされるProofの種類と設定情報が指定される。,object,△
,jwt,,JWT形式のProofに関する情報が指定される。,object,△
,,proof_signing_alg_values_supported,JWT Proofの署名に使用可能なアルゴリズムの一覧が指定される。,Array<string>,△
credential_metadata,,,証明書のメタデータ情報が指定される。表示情報やクレーム定義など証明書の構造及び表示に関する情報が指定される。,object,△
,claims,,証明書に含まれるクレーム定義の一覧が指定される。各クレームのパスや表示情報などが指定される。,Array<object>,△
,display,,証明書の表示情報が指定される。UI上での表示名やロケールなどユーザに表示するための情報が指定される。,Array<object>,△
profileId,,,walt.id Issuer側で定義されたCredential ProfileのIDが指定される。,string,○
name,,,Credential Profileの名称が指定される。日本語などの任意の表示名が指定される。,string,○
credentialData,,,証明書発行時に使用するCredentialデータのテンプレートが指定される。,object,○
selectiveDisclosure,,,SD-JWT VC形式の証明書における選択的開示対象のクレームや開示方式に関する情報が指定される。,object / null,△
mapping,,,証明書発行時に使用する動的データのマッピング情報が指定される。Issuer DIDやSubject DID及び発行日時などのマッピング情報が指定される。,object / null,△

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
