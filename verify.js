
/**
 * Credential Profileの存在及び証明書タイプを確認する。
 */
const validateCredentialProfile = async (
    credentialConfigurationId,
    type = null,
    accessToken = null
) => {
    logger.debug('*** validateCredentialProfile start ***')

    try {
        if (!credentialConfigurationId) {
            throw new Error('Credential Configuration ID is missing.')
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
            metadata?.credential_configurations_supported?.[credentialConfigurationId]

        if (!configuration) {
            throw new Error('Credential Configuration not found.')
        }

        // Credential Configuration IDを確認する。
        if (profile.credentialConfigurationId !== credentialConfigurationId) {
            throw new Error('Credential Configuration ID does not match.')
        }

        // Metadataからフォーマットを取得する。
        const format = configuration.format
        const suffix = `_${format}`

        // Credential Configuration IDとフォーマットを比較する。
        if (!credentialConfigurationId.endsWith(suffix)) {
            throw new Error('Credential format does not match.')
        }

        // Credential Configuration IDからタイプを取得する。
        const configurationType = credentialConfigurationId.slice(
            0,
            -suffix.length
        )

        // Metadataから証明書タイプを取得する。
        let credentialType

        switch (format) {
            case WALTID_FORMAT_TYPES.JWT_VC_JSON: {
                const metadataTypes =
                    configuration.credential_definition?.type

                const profileTypes =
                    profile.credentialData?.type

                credentialType = Array.isArray(metadataTypes)
                    ? metadataTypes.at(-1)
                    : null

                // MetadataとProfileのタイプを比較する。
                if (
                    !credentialType ||
                    !Array.isArray(profileTypes) ||
                    profileTypes.at(-1) !== credentialType
                ) {
                    throw new Error('Credential type does not match.')
                }

                break
            }

            case WALTID_FORMAT_TYPES.SD_JWT_VC: {
                const vct = configuration.vct

                credentialType = typeof vct === 'string'
                    ? vct.split('/').pop()
                    : null

                if (!credentialType) {
                    throw new Error('Credential VCT is invalid.')
                }

                break
            }

            default:
                throw new Error('Unsupported Credential format.')
        }

        // Credential Configuration IDとタイプを比較する。
        if (configurationType !== credentialType) {
            throw new Error('Credential type does not match.')
        }

        // タイプが指定された場合のみ比較する。
        if (
            type !== null &&
            type !== undefined &&
            type !== '' &&
            type !== credentialType
        ) {
            throw new Error('Credential type does not match.')
        }

        // Profileにタイプ、フォーマット及びMetadataを追加する。
        return {
            ...profile,
            type: credentialType,
            format,
            credentialMetadata: configuration.credential_metadata || null
        }
    } catch (error) {
        logger.error('error.message: ', error.message)
        logger.error('error.stack: ', error.stack)
        throw error
    } finally {
        logger.debug('*** validateCredentialProfile end ***')
    }
}
