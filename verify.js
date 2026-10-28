
/**
 * 発行可能なCredential一覧とMetadata情報を取得する。
 */
const getIssuableCredentials = async (accessToken = null) => {
    logger.debug('*** getIssuableCredentials start ***')

    try {
        // Issuer Metadataを取得する。
        const metadata = await getCredentialIssuerMetadata(accessToken)

        const configurations =
            metadata.credential_configurations_supported || {}

        // credentialConfigurationIdをキーとしてMetadata情報を取得する。
        const credentials = Object.fromEntries(
            Object.entries(configurations).map(
                ([configurationId, configuration]) => {
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
                            })
                        }
                    ]
                }
            )
        )

        return {
            issuer: {
                id: metadata.credential_issuer || null,
                display: metadata.display || []
            },
            credentials
        }
    } catch (error) {
        logger.error('error.message: ', error.message)
        logger.error('error.stack: ', error.stack)
        throw error
    } finally {
        logger.debug('*** getIssuableCredentials end ***')
    }
}
