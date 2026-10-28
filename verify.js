const CREDENTIAL_FORMAT = {
    JWT_VC_JSON: 'jwt_vc_json',
    SD_JWT_VC: 'dc+sd-jwt'
}



/**
 * Credential Profileの存在及び発行パラメータを確認する。
 */
const validateCredentialProfile = async (
    credentialConfigurationId,
    format,
    accessToken = null
) => {
    logger.debug('*** validateCredentialProfile start ***')

    try {
        if (!credentialConfigurationId || !format) {
            throw new Error('Required issuance parameters are missing.')
        }

        // Credential ProfileとIssuer Metadataを取得する。
        const [profile, metadata] = await Promise.all([
            getCredentialProfileByConfigurationId(
                credentialConfigurationId,
                accessToken
            ),
            getCredentialIssuerMetadata(accessToken)
        ])

        // Credential Configurationを取得する。
        const configuration =
            metadata.credential_configurations_supported
                ?.[credentialConfigurationId]

        if (!configuration) {
            throw new Error('Credential Configuration not found.')
        }

        // ProfileのCredential Configuration IDを確認する。
        if (profile.credentialConfigurationId !== credentialConfigurationId) {
            throw new Error('Credential Configuration ID does not match.')
        }

        // Credentialフォーマットを確認する。
        if (configuration.format !== format) {
            throw new Error('Credential format does not match.')
        }

        // Credentialタイプを確認する。
        switch (format) {
            case CREDENTIAL_FORMAT.JWT_VC_JSON: {
                const suffix = '_jwt_vc_json'

                if (!credentialConfigurationId.endsWith(suffix)) {
                    throw new Error('Invalid Credential Configuration ID.')
                }

                // Credential Configuration IDからタイプを取得する。
                const type = credentialConfigurationId.slice(
                    0,
                    -suffix.length
                )

                // MetadataとProfileからタイプを取得する。
                const metadataTypes =
                    configuration.credential_definition?.type

                const profileTypes =
                    profile.credentialData?.type

                // タイプ配列の最後の要素と比較する。
                if (
                    !type ||
                    !Array.isArray(metadataTypes) ||
                    !Array.isArray(profileTypes) ||
                    metadataTypes.length === 0 ||
                    profileTypes.length === 0 ||
                    metadataTypes.at(-1) !== type ||
                    profileTypes.at(-1) !== type
                ) {
                    throw new Error('Credential type does not match.')
                }

                break
            }

            case CREDENTIAL_FORMAT.SD_JWT_VC:
                // SD-JWT VCのタイプを確認する。
                if (
                    typeof configuration.vct !== 'string' ||
                    !configuration.vct
                ) {
                    throw new Error('Credential VCT is missing.')
                }
                break

            default:
                throw new Error('Unsupported Credential format.')
        }

        return profile
    } catch (error) {
        logger.error('error.message: ', error.message)
        logger.error('error.stack: ', error.stack)
        throw error
    } finally {
        logger.debug('*** validateCredentialProfile end ***')
    }
}
